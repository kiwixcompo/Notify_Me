const Parser = require('rss-parser');
const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');

// Create a reusable parser with proper headers
function createParser() {
  return new Parser({
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': 1
    },
    timeout: 15000,
    maxRedirects: 5
  });
}

// Parse XML content and convert to RSS-like format
async function parseXMLContent(xmlContent, itemType = 'job') {
  try {
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: true,
      trim: true
    });
    
    const result = await parser.parseStringPromise(xmlContent);
    
    // Handle different XML formats
    let items = [];
    
    // RSS format
    if (result.rss && result.rss.channel && result.rss.channel.item) {
      items = Array.isArray(result.rss.channel.item) ? result.rss.channel.item : [result.rss.channel.item];
    }
    // Atom format
    else if (result.feed && result.feed.entry) {
      items = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];
    }
    // Custom XML format - try to find items
    else if (result.items && result.items.item) {
      items = Array.isArray(result.items.item) ? result.items.item : [result.items.item];
    }
    // Generic XML with job/scholarship elements
    else if (result.jobs && result.jobs.job) {
      items = Array.isArray(result.jobs.job) ? result.jobs.job : [result.jobs.job];
    }
    else if (result.scholarships && result.scholarships.scholarship) {
      items = Array.isArray(result.scholarships.scholarship) ? result.scholarships.scholarship : [result.scholarships.scholarship];
    }
    // Try to find any element that might contain items
    else {
      // Look for common patterns in the XML
      const possibleItemKeys = ['item', 'entry', 'job', 'scholarship', 'position', 'opportunity'];
      for (const key of possibleItemKeys) {
        if (result[key]) {
          items = Array.isArray(result[key]) ? result[key] : [result[key]];
          break;
        }
        // Check nested structures
        for (const rootKey in result) {
          if (result[rootKey] && result[rootKey][key]) {
            items = Array.isArray(result[rootKey][key]) ? result[rootKey][key] : [result[rootKey][key]];
            break;
          }
        }
        if (items.length > 0) break;
      }
    }
    
    // Convert items to standard format
    return items.map(item => ({
      title: item.title || item.name || item.headline || 'Untitled',
      link: item.link || item.url || item.href || '#',
      description: item.description || item.summary || item.content || item.details || '',
      pubDate: item.pubDate || item.published || item.date || item.created || item.updated || new Date().toISOString(),
      guid: item.guid || item.id || item.link || item.url || crypto.randomUUID(),
      categories: item.categories || item.tags || item.type || []
    }));
    
  } catch (error) {
    console.error('XML parsing error:', error.message);
    return [];
  }
}

// Fetch and parse XML file from URL
async function fetchXMLFromURL(url, itemType = 'job') {
  try {
    console.log(`Fetching XML from:`, url);
    const response = await axios.get(url, { 
      timeout: 15000,
      headers: {
        'Accept': 'application/xml, text/xml, */*'
      }
    });
    
    const xmlContent = response.data;
    return await parseXMLContent(xmlContent, itemType);
    
  } catch (error) {
    console.error(`XML fetch error for ${url}:`, error.message);
    return [];
  }
}

// Generic function to fetch items from multiple sources
async function fetchItemsFromMultipleSources(feeds, itemType = 'job') {
  if (!Array.isArray(feeds) || feeds.length === 0) return [];
  
  const parser = createParser();
  let allItems = [];
  
  for (const feed of feeds) {
    const url = feed.url;
    const apiBackupUrl = feed.apiBackupUrl;
    const isXML = feed.isXML || url.toLowerCase().endsWith('.xml');
    const isCodeBased = url.startsWith('code://');
    
    // Handle code-based XML feeds (stored XML content)
    if (isCodeBased) {
      try {
        console.log(`Processing code-based XML feed:`, feed.name);
        
        if (feed.xmlContent) {
          // Parse the stored XML content
          const xmlItems = await parseXMLContent(feed.xmlContent, itemType);
          if (xmlItems.length > 0) {
            const items = xmlItems.map(item => ({
              ...item,
              feedUrl: url,
              isXML: true,
              isCodeBased: true
            }));
            allItems = allItems.concat(items);
            console.log(`Successfully processed ${xmlItems.length} items from code-based XML feed: ${feed.name}`);
            continue;
          }
        } else {
          console.log(`No XML content stored for code-based feed: ${feed.name}`);
        }
      } catch (error) {
        console.error(`Code-based feed processing error for ${feed.name}:`, error.message);
        continue;
      }
    }
    
    // Try API backup first
    if (apiBackupUrl) {
      try {
        console.log(`Fetching ${itemType}s from API backup:`, apiBackupUrl);
        const resp = await axios.get(apiBackupUrl, { timeout: 15000 });
        if (Array.isArray(resp.data)) {
          const items = resp.data.map(item => ({
            title: item.title,
            link: item.link,
            description: item.description || '',
            pubDate: item.pubDate,
            guid: item.guid || item.link,
            feedUrl: url,
            apiBackupUrl,
            categories: item.categories || []
          }));
          allItems = allItems.concat(items);
          continue;
        }
      } catch (error) {
        console.error(`API backup fetch error for ${apiBackupUrl}:`, error.message);
        // Fallback to RSS/XML
      }
    }
    
    // Try XML file if specified or if URL ends with .xml
    if (isXML) {
      try {
        const xmlItems = await fetchXMLFromURL(url, itemType);
        if (xmlItems.length > 0) {
          const items = xmlItems.map(item => ({
            ...item,
            feedUrl: url,
            isXML: true
          }));
          allItems = allItems.concat(items);
          continue;
        }
      } catch (error) {
        console.error(`XML fetch error for ${url}:`, error.message);
        // Fallback to RSS
      }
    }
    
    // Try RSS feed
    try {
      console.log(`Fetching RSS from:`, url);
      const feedData = await parser.parseURL(url);
      const items = (feedData.items || []).map(item => ({
        title: item.title,
        link: item.link,
        description: item.contentSnippet || item.content || item.description || '',
        pubDate: item.pubDate,
        guid: item.guid || item.link,
        feedUrl: url,
        categories: item.categories || []
      }));
      allItems = allItems.concat(items);
    } catch (error) {
      console.error(`RSS fetch error for ${url}:`, error.message);
      
      // Try alternative sources based on URL patterns
      try {
        const items = await fetchFromAlternativeSource(url, itemType);
        if (items.length > 0) {
          allItems = allItems.concat(items);
        }
      } catch (altError) {
        console.error(`Alternative source fetch error for ${url}:`, altError.message);
      }
    }
  }
  
  return allItems;
}

// Fetch from alternative sources (JSON APIs, web scraping, etc.)
async function fetchFromAlternativeSource(url, itemType) {
  const items = [];
  
  try {
    // GitHub Jobs API
    if (url.includes('jobs.github.com') || url.includes('api.github.com')) {
      const response = await axios.get('https://jobs.github.com/positions.json?location=remote', { timeout: 15000 });
      return response.data.map(job => ({
        title: job.title,
        link: job.url,
        description: job.description,
        pubDate: job.created_at,
        guid: job.id,
        feedUrl: url,
        categories: [job.type, job.location]
      }));
    }
    
    // Remote.co API
    if (url.includes('remote.co')) {
      const response = await axios.get('https://remote.co/api/jobs/', { timeout: 15000 });
      return response.data.map(job => ({
        title: job.title,
        link: job.url,
        description: job.description,
        pubDate: job.date_posted,
        guid: job.id,
        feedUrl: url,
        categories: [job.category, job.location]
      }));
    }
    
    // We Work Remotely API
    if (url.includes('weworkremotely.com')) {
      const response = await axios.get('https://weworkremotely.com/api/jobs', { timeout: 15000 });
      return response.data.map(job => ({
        title: job.title,
        link: `https://weworkremotely.com${job.url}`,
        description: job.description,
        pubDate: job.created_at,
        guid: job.id,
        feedUrl: url,
        categories: [job.category, job.location]
      }));
    }
    
    // Scholarship APIs
    if (itemType === 'scholarship') {
      // Scholarships.com API
      if (url.includes('scholarships.com')) {
        const response = await axios.get('https://www.scholarships.com/api/scholarships', { timeout: 15000 });
        return response.data.map(scholarship => ({
          title: scholarship.title,
          link: scholarship.url,
          description: scholarship.description,
          pubDate: scholarship.deadline,
          guid: scholarship.id,
          feedUrl: url,
          categories: [scholarship.category, scholarship.level]
        }));
      }
      
      // Fastweb API
      if (url.includes('fastweb.com')) {
        const response = await axios.get('https://www.fastweb.com/api/scholarships', { timeout: 15000 });
        return response.data.map(scholarship => ({
          title: scholarship.title,
          link: scholarship.url,
          description: scholarship.description,
          pubDate: scholarship.deadline,
          guid: scholarship.id,
          feedUrl: url,
          categories: [scholarship.category, scholarship.level]
        }));
      }
    }
    
  } catch (error) {
    console.error(`Alternative source fetch error:`, error.message);
  }
  
  return items;
}

// Legacy function for backward compatibility
async function fetchJobsFromRSS(feeds) {
  return fetchItemsFromMultipleSources(feeds, 'job');
}

// New function for scholarships
async function fetchScholarshipsFromRSS(feeds) {
  return fetchItemsFromMultipleSources(feeds, 'scholarship');
}

// Generic function for any item type
async function fetchItemsFromRSS(feeds, itemType = 'job') {
  return fetchItemsFromMultipleSources(feeds, itemType);
}

module.exports = { 
  fetchJobsFromRSS, 
  fetchScholarshipsFromRSS,
  fetchItemsFromRSS,
  fetchItemsFromMultipleSources,
  parseXMLContent,
  fetchXMLFromURL
}; 