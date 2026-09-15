const Parser = require('rss-parser');
const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
const cheerio = require('cheerio');
const { parseString, Builder } = require('xml2js');
const { promisify } = require('util');
const parseXml = promisify(parseString);
// Cache for feed discovery and generation
const feedCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Helper function to extract keywords from text
function extractKeywords(text, count = 10) {
  if (!text) return [];
  
  // Basic tokenization and filtering
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 3) // Only consider words longer than 3 characters
    .filter(word => !/^\d+$/.test(word)); // Filter out numbers
    
  // Simple frequency counting
  const freq = {};
  words.forEach(word => {
    freq[word] = (freq[word] || 0) + 1;
  });
  
  // Sort by frequency and get top N
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);
}

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
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://www.google.com/'
    },
    timeout: 20000,
    maxRedirects: 10
  });
}

// Enhanced axios config for better compatibility
function getAxiosConfig(url) {
  const config = {
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, application/json, text/csv, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://www.google.com/',
      'DNT': '1'
    },
    maxRedirects: 10,
    validateStatus: function (status) {
      return status >= 200 && status < 400; // Accept redirects
    }
  };
  
  // Special handling for known problematic sites
  if (url.includes('jobicy.com')) {
    config.headers['Referer'] = 'https://jobicy.com/';
    config.headers['Origin'] = 'https://jobicy.com';
  }
  
  return config;
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

// Parse JSON feed content (array or object with items)
function parseJSONContent(jsonData) {
  try {
    let items = [];
    if (Array.isArray(jsonData)) {
      items = jsonData;
    } else if (jsonData && Array.isArray(jsonData.items)) {
      items = jsonData.items;
    } else if (jsonData && Array.isArray(jsonData.data)) {
      items = jsonData.data;
    } else if (jsonData && jsonData.feed && Array.isArray(jsonData.feed.items)) {
      items = jsonData.feed.items;
    } else {
      // Attempt to detect common keys
      const possibleKeys = ['jobs', 'scholarships', 'posts', 'entries'];
      for (const key of possibleKeys) {
        if (Array.isArray(jsonData?.[key])) {
          items = jsonData[key];
          break;
        }
      }
    }

    return items.map(item => ({
      title: item.title || item.position || item.name || 'Untitled',
      link: item.link || item.url || '#',
      description: item.description || item.summary || item.content || '',
      pubDate: item.pubDate || item.published || item.date || item.created || new Date().toISOString(),
      guid: item.guid || item.id || item.link || item.url || crypto.randomUUID(),
      categories: item.categories || item.tags || []
    }));
  } catch (err) {
    console.error('JSON parsing error:', err.message);
    return [];
  }
}

// Parse CSV content (expects header row). Columns like title,link,description,pubDate,categories
function parseCSVContent(csvText) {
  try {
    const lines = csvText.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const getIndex = (name) => headers.indexOf(name);
    const idxTitle = getIndex('title');
    const idxLink = getIndex('link');
    const idxDescription = getIndex('description');
    const idxPubDate = getIndex('pubdate');
    const idxCategories = getIndex('categories');

    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (!cols.length) continue;
      const title = idxTitle >= 0 ? cols[idxTitle].trim() : 'Untitled';
      const link = idxLink >= 0 ? cols[idxLink].trim() : '#';
      const description = idxDescription >= 0 ? cols[idxDescription].trim() : '';
      const pubDate = idxPubDate >= 0 ? cols[idxPubDate].trim() : new Date().toISOString();
      const categories = idxCategories >= 0 ? (cols[idxCategories].split('|').map(s => s.trim()).filter(Boolean)) : [];
      items.push({
        title,
        link,
        description,
        pubDate,
        guid: crypto.randomUUID(),
        categories
      });
    }
    return items;
  } catch (err) {
    console.error('CSV parsing error:', err.message);
    return [];
  }
}

// Fetch and parse XML file from URL
async function fetchXMLFromURL(url, itemType = 'job') {
  try {
    console.log(`Fetching XML from:`, url);
    const config = getAxiosConfig(url);
    config.headers['Accept'] = 'application/xml, text/xml, */*';
    
    const response = await axios.get(url, config);
    const xmlContent = response.data;
    return await parseXMLContent(xmlContent, itemType);
    
  } catch (error) {
    console.error(`XML fetch error for ${url}:`, error.message);
    return [];
  }
}

async function fetchJSONFromURL(url) {
  try {
    console.log(`Fetching JSON from:`, url);
    const config = getAxiosConfig(url);
    config.headers['Accept'] = 'application/json, */*';
    
    const response = await axios.get(url, config);
    return parseJSONContent(response.data);
  } catch (error) {
    console.error(`JSON fetch error for ${url}:`, error.message);
    return [];
  }
}

async function fetchCSVFromURL(url) {
  try {
    console.log(`Fetching CSV from:`, url);
    const config = getAxiosConfig(url);
    config.headers['Accept'] = 'text/csv, text/plain, */*';
    config.responseType = 'text';
    
    const response = await axios.get(url, config);
    return parseCSVContent(typeof response.data === 'string' ? response.data : String(response.data));
  } catch (error) {
    console.error(`CSV fetch error for ${url}:`, error.message);
    return [];
  }
}

// Auto-detect feed format and fetch accordingly
async function detectFeedFormat(url) {
  try {
    const config = getAxiosConfig(url);
    const response = await axios.head(url, config);
    const contentType = response.headers['content-type'] || '';
    
    if (contentType.includes('application/json') || contentType.includes('text/json')) {
      return 'json';
    }
    if (contentType.includes('text/csv') || contentType.includes('application/csv')) {
      return 'csv';
    }
    if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      return 'xml';
    }
    
    // Fallback to URL extension
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith('.json')) return 'json';
    if (lowerUrl.endsWith('.csv')) return 'csv';
    if (lowerUrl.endsWith('.xml')) return 'xml';
    
    return 'rss'; // Default to RSS
  } catch (error) {
    // If HEAD request fails, fallback to URL extension detection
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith('.json')) return 'json';
    if (lowerUrl.endsWith('.csv')) return 'csv';
    if (lowerUrl.endsWith('.xml')) return 'xml';
    return 'rss';
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
    const isCodeBased = url.startsWith('code://');
    
    console.log(`Processing feed: ${feed.name || url}`);
    
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
              feedName: feed.name,
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
        const config = getAxiosConfig(apiBackupUrl);
        const resp = await axios.get(apiBackupUrl, config);
        if (Array.isArray(resp.data)) {
          const items = resp.data.map(item => ({
            title: item.title,
            link: item.link,
            description: item.description || '',
            pubDate: item.pubDate,
            guid: item.guid || item.link,
            feedUrl: url,
            feedName: feed.name,
            apiBackupUrl,
            categories: item.categories || []
          }));
          allItems = allItems.concat(items);
          console.log(`Successfully fetched ${items.length} items from API backup: ${feed.name}`);
          continue;
        }
      } catch (error) {
        console.error(`API backup fetch error for ${apiBackupUrl}:`, error.message);
        // Fallback to other types
      }
    }
    
    // Auto-detect feed format
    const detectedFormat = await detectFeedFormat(url);
    console.log(`Detected format for ${feed.name}: ${detectedFormat}`);
    
    let items = [];
    let success = false;
    
    // Try the detected format first
    switch (detectedFormat) {
      case 'json':
        try {
          const jsonItems = await fetchJSONFromURL(url);
          if (jsonItems.length > 0) {
            items = jsonItems.map(item => ({ 
              ...item, 
              feedUrl: url, 
              feedName: feed.name,
              isJSON: true 
            }));
            success = true;
            console.log(`Successfully fetched ${items.length} items as JSON from: ${feed.name}`);
          }
        } catch (error) {
          console.error(`JSON fetch error for ${url}:`, error.message);
        }
        break;
        
      case 'csv':
        try {
          const csvItems = await fetchCSVFromURL(url);
          if (csvItems.length > 0) {
            items = csvItems.map(item => ({ 
              ...item, 
              feedUrl: url, 
              feedName: feed.name,
              isCSV: true 
            }));
            success = true;
            console.log(`Successfully fetched ${items.length} items as CSV from: ${feed.name}`);
          }
        } catch (error) {
          console.error(`CSV fetch error for ${url}:`, error.message);
        }
        break;
        
      case 'xml':
        try {
          const xmlItems = await fetchXMLFromURL(url, itemType);
          if (xmlItems.length > 0) {
            items = xmlItems.map(item => ({
              ...item,
              feedUrl: url,
              feedName: feed.name,
              isXML: true
            }));
            success = true;
            console.log(`Successfully fetched ${items.length} items as XML from: ${feed.name}`);
          }
        } catch (error) {
          console.error(`XML fetch error for ${url}:`, error.message);
        }
        break;
        
      default: // RSS
        try {
          console.log(`Fetching RSS from:`, url);
          const feedData = await parser.parseURL(url);
          items = (feedData.items || []).map(item => ({
            title: item.title,
            link: item.link,
            description: item.contentSnippet || item.content || item.description || '',
            pubDate: item.pubDate,
            guid: item.guid || item.link,
            feedUrl: url,
            feedName: feed.name,
            categories: item.categories || []
          }));
          success = true;
          console.log(`Successfully fetched ${items.length} items as RSS from: ${feed.name}`);
        } catch (error) {
          console.error(`RSS fetch error for ${url}:`, error.message);
        }
        break;
    }
    
    // If the detected format failed, try other formats as fallback
    if (!success) {
      console.log(`Trying fallback formats for: ${feed.name}`);
      
      // Try RSS if not already tried
      if (detectedFormat !== 'rss') {
        try {
          console.log(`Fallback: Trying RSS for:`, url);
          const feedData = await parser.parseURL(url);
          items = (feedData.items || []).map(item => ({
            title: item.title,
            link: item.link,
            description: item.contentSnippet || item.content || item.description || '',
            pubDate: item.pubDate,
            guid: item.guid || item.link,
            feedUrl: url,
            feedName: feed.name,
            categories: item.categories || []
          }));
          success = true;
          console.log(`Fallback RSS successful: ${items.length} items from ${feed.name}`);
        } catch (error) {
          console.error(`Fallback RSS error for ${url}:`, error.message);
        }
      }
      
      // Try XML if not already tried
      if (!success && detectedFormat !== 'xml') {
        try {
          console.log(`Fallback: Trying XML for:`, url);
          const xmlItems = await fetchXMLFromURL(url, itemType);
          if (xmlItems.length > 0) {
            items = xmlItems.map(item => ({
              ...item,
              feedUrl: url,
              feedName: feed.name,
              isXML: true
            }));
            success = true;
            console.log(`Fallback XML successful: ${items.length} items from ${feed.name}`);
          }
        } catch (error) {
          console.error(`Fallback XML error for ${url}:`, error.message);
        }
      }
      
      // Try JSON if not already tried
      if (!success && detectedFormat !== 'json') {
        try {
          console.log(`Fallback: Trying JSON for:`, url);
          const jsonItems = await fetchJSONFromURL(url);
          if (jsonItems.length > 0) {
            items = jsonItems.map(item => ({ 
              ...item, 
              feedUrl: url, 
              feedName: feed.name,
              isJSON: true 
            }));
            success = true;
            console.log(`Fallback JSON successful: ${items.length} items from ${feed.name}`);
          }
        } catch (error) {
          console.error(`Fallback JSON error for ${url}:`, error.message);
        }
      }
      
      // Try alternative sources as last resort
      if (!success) {
        try {
          console.log(`Fallback: Trying alternative sources for:`, url);
          const altItems = await fetchFromAlternativeSource(url, itemType);
          if (altItems.length > 0) {
            items = altItems.map(item => ({ 
              ...item, 
              feedUrl: url, 
              feedName: feed.name 
            }));
            success = true;
            console.log(`Alternative source successful: ${items.length} items from ${feed.name}`);
          }
        } catch (altError) {
          console.error(`Alternative source fetch error for ${url}:`, altError.message);
        }
      }
    }
    
    if (success && items.length > 0) {
      allItems = allItems.concat(items);
    } else {
      console.warn(`No items fetched from feed: ${feed.name} (${url})`);
    }
  }
  
  console.log(`Total items fetched: ${allItems.length} from ${feeds.length} feeds`);
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

/**
 * Generate RSS feed from a webpage
 * @param {string} url - The URL of the webpage
 * @param {object} options - Options for feed generation
 * @param {string} [options.type='job'] - Type of feed (job or scholarship)
 * @param {string[]} [options.keywords=[]] - Keywords to filter content
 * @param {number} [options.maxItems=20] - Maximum number of items to include
 * @returns {Promise<object>} - Generated feed in RSS format with metadata
 */
async function generateFeedFromWebpage(url, options = {}) {
  const { type = 'job', keywords = [], maxItems = 20 } = options;
  const cacheKey = `webpage:${url}:${type}:${keywords.sort().join(',')}`;
  const now = Date.now();
  
  // Check cache first
  const cached = feedCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return { ...cached.data, _cached: true };
  }
  
  try {
    // Fetch the webpage
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/'
      },
      timeout: 15000
    });
    
    if (!response.data) {
      throw new Error('No content received from the webpage');
    }
    
    const $ = cheerio.load(response.data);
    const title = $('title').text() || new URL(url).hostname;
    const description = $('meta[name="description"]').attr('content') || `Content from ${url}`;
    
    // Try to find article/list items
    let items = [];
    
    // Common selectors for articles/items
    const selectors = [
      'article', '.article', '.post', '.item',
      '[role="article"]', '.card', '.list-item',
      'li', '.entry', '.teaser', '.summary'
    ];
    
    // Find all potential items
    for (const selector of selectors) {
      if (items.length >= maxItems) break;
      
      $(selector).each((i, el) => {
        if (items.length >= maxItems) return false;
        
        const $el = $(el);
        const itemTitle = $el.find('h1, h2, h3, .title, .entry-title, [itemprop="headline"]').first().text().trim();
        let link = $el.find('a').first().attr('href');
        
        // Skip if no title or link
        if (!itemTitle || !link) return;
        
        // Make relative URLs absolute
        if (!link.startsWith('http')) {
          const baseUrl = new URL(url);
          link = new URL(link, baseUrl.origin).toString();
        }
        
        // Extract description/content
        let description = $el.find('p, .description, .content, [itemprop="description"]')
                         .first()
                         .text()
                         .trim()
                         .substring(0, 200) + '...';
        
        // Extract publication date
        let pubDate = new Date().toISOString();
        const dateEl = $el.find('time, .date, .published, [itemprop="datePublished"]').first();
        if (dateEl.length) {
          const dateStr = dateEl.attr('datetime') || dateEl.text().trim();
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            pubDate = parsedDate.toISOString();
          }
        }
        
        // Extract categories/tags
        const categories = [];
        $el.find('a[rel="tag"], .tag, .category, [itemprop="keywords"]').each((i, catEl) => {
          const catText = $(catEl).text().trim();
          if (catText) categories.push(catText);
        });
        
        items.push({
          title: itemTitle,
          link: link,
          description: description,
          pubDate: pubDate,
          categories: categories,
          guid: link, // Use link as GUID if no explicit GUID exists
          content: $el.html() || '' // Store full HTML content for reference
        });
      });
    }
    
    // If no items found with article-like elements, try to find links
    if (items.length === 0) {
      $('a').each((i, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim();
        
        // Skip if no href or text is too short/long
        if (!href || text.length < 10 || text.length > 200 || 
            !/^https?:\/\//.test(href) ||
            items.some(item => item.link === href)) {
          return;
        }
        
        // Make relative URLs absolute
        let fullUrl;
        try {
          fullUrl = new URL(href, url).toString();
        } catch (e) {
          return; // Skip invalid URLs
        }
        
        items.push({
          title: text,
          link: fullUrl,
          description: text + '...',
          pubDate: new Date().toISOString(),
          categories: [],
          guid: fullUrl,
          content: text
        });
      });
    }
    
    // Filter by keywords if provided
    if (keywords.length > 0) {
      const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
      items = items.filter(item => {
        const text = `${item.title} ${item.description} ${item.content}`.toLowerCase();
        return Array.from(keywordSet).some(keyword => text.includes(keyword));
      });
    }
    
    // Limit number of items
    items = items.slice(0, maxItems);
    
    // Generate RSS feed
    const feed = {
      title: title,
      description: description,
      link: url,
      items: items.map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        content: item.description,
        contentSnippet: item.description.replace(/<[^>]*>?/gm, '').substring(0, 250) + '...',
        guid: item.guid || item.link,
        isoDate: item.pubDate,
        categories: item.categories || []
      }))
    };
    
    // Cache the result
    const result = {
      success: true,
      feed: feed,
      source: {
        type: 'webpage',
        url: url,
        title: title,
        description: description
      },
      stats: {
        totalItems: items.length,
        returnedItems: items.length,
        keywordsUsed: keywords.length > 0 ? keywords : null,
        generatedAt: new Date().toISOString()
      }
    };
    
    feedCache.set(cacheKey, { data: result, timestamp: now });
    return result;
  } catch (error) {
    console.error(`Error generating feed from ${url}:`, error);
    return {
      success: false,
      error: `Failed to generate feed: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
}

/**
 * Generate RSS feed from a website URL (main entry point)
 * @param {string} url - The URL of the website
 * @param {object} options - Options for feed generation
 * @param {string} [options.type='job'] - Type of feed (job or scholarship)
 * @param {string[]} [options.keywords=[]] - Keywords to filter content
 * @param {number} [options.maxItems=20] - Maximum number of items to include
 * @returns {Promise<object>} - Generated feed in RSS format with metadata
 */
async function generateFeedFromUrl(url, options = {}) {
  const { type = 'job', keywords = [], maxItems = 20 } = options;
  const cacheKey = `url:${url}:${type}:${keywords.sort().join(',')}`;
  const now = Date.now();
  
  // Check cache first
  const cached = feedCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return { ...cached.data, _cached: true };
  }
  
  try {
    // First, try to discover an existing RSS/Atom feed
    const feedUrl = await discoverFeedUrl(url);
    
    if (feedUrl) {
      // If we found a feed, fetch and parse it
      const feed = await fetchAndParseFeed(feedUrl, { type, keywords, maxItems });
      if (feed.success) {
        const result = {
          ...feed,
          source: {
            type: 'discovered-feed',
            url: feedUrl,
            originalUrl: url,
            title: feed.feed?.title || `Feed from ${new URL(url).hostname}`,
            description: feed.feed?.description || `Discovered feed from ${url}`
          }
        };
        
        // Cache the result
        feedCache.set(cacheKey, { data: result, timestamp: now });
        return result;
      }
    }
    
    // If no feed found or failed to parse, generate from webpage
    return await generateFeedFromWebpage(url, { type, keywords, maxItems });
    
  } catch (error) {
    console.error(`Error generating feed from ${url}:`, error);
    return {
      success: false,
      error: `Failed to generate feed: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
}

/**
 * Discover RSS/Atom feed URLs in a webpage
 * @param {string} url - The URL of the webpage to check
 * @returns {Promise<string|null>} - The URL of the discovered feed or null if none found
 */
async function discoverFeedUrl(url) {
  // Implement feed discovery logic here
  // For now, just return null
  return null;
}

/**
 * Fetch and parse a feed with options
 * @param {string} feedUrl - The URL of the feed to fetch and parse
 * @param {object} options - Options for feed parsing
 * @param {string} [options.type='job'] - Type of feed (job or scholarship)
 * @param {string[]} [options.keywords=[]] - Keywords to filter content
 * @param {number} [options.maxItems=20] - Maximum number of items to include
 * @returns {Promise<object>} - Parsed feed with metadata
 */
async function fetchAndParseFeed(feedUrl, options = {}) {
  const { type = 'job', keywords = [], maxItems = 20 } = options;
  
  try {
    // Use the existing feed parsing logic
    const feed = await detectFeedFormat(feedUrl);
    
    if (!feed || !feed.items || !feed.items.length) {
      throw new Error('No valid feed items found');
    }
    
    // Filter by keywords if provided
    let items = [...feed.items];
    if (keywords.length > 0) {
      const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
      items = items.filter(item => {
        const text = `${item.title || ''} ${item.content || ''} ${item.summary || ''}`.toLowerCase();
        return keywords.some(keyword => text.includes(keyword.toLowerCase()));
      });
    }
    
    // Limit number of items
    items = items.slice(0, maxItems);
    
    return {
      success: true,
      feed: {
        ...feed,
        items: items.map(item => ({
          ...item,
          categories: item.categories || extractKeywords(`${item.title} ${item.content || ''}`, 5)
        }))
      },
      stats: {
        totalItems: feed.items.length,
        filteredItems: items.length,
        keywordsUsed: keywords
      }
    };
    
  } catch (error) {
    console.error(`Error parsing feed ${feedUrl}:`, error);
    return {
      success: false,
      error: `Failed to parse feed: ${error.message}`
    };
  }
}

// Export all functions
module.exports = { 
  fetchJobsFromRSS, 
  fetchScholarshipsFromRSS,
  fetchItemsFromRSS,
  fetchItemsFromMultipleSources,
  fetchFromAlternativeSource,
  detectFeedFormat,
  fetchXMLFromURL,
  fetchJSONFromURL,
  fetchCSVFromURL,
  parseXMLContent,
  parseJSONContent,
  parseCSVContent,
  generateFeedFromWebpage,
  generateFeedFromUrl,
  discoverFeedUrl,
  fetchAndParseFeed
};