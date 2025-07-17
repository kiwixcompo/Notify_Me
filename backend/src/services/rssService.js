const Parser = require('rss-parser');
const axios = require('axios');

// feeds: array of { url, apiBackupUrl }
async function fetchJobsFromRSS(feeds) {
  if (!Array.isArray(feeds) || feeds.length === 0) return [];
    const parser = new Parser({
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
  let allJobs = [];
  for (const feed of feeds) {
    const url = feed.url;
    const apiBackupUrl = feed.apiBackupUrl;
    if (apiBackupUrl) {
      try {
        console.log('Fetching jobs from API backup:', apiBackupUrl);
        const resp = await axios.get(apiBackupUrl, { timeout: 15000 });
        if (Array.isArray(resp.data)) {
          const jobs = resp.data.map(item => ({
            title: item.title,
            link: item.link,
            description: item.description || '',
            pubDate: item.pubDate,
            guid: item.guid || item.link,
            feedUrl: url,
            apiBackupUrl
          }));
          allJobs = allJobs.concat(jobs);
          continue;
        }
      } catch (error) {
        console.error(`API backup fetch error for ${apiBackupUrl}:`, error.message);
        // Fallback to RSS
      }
    }
    try {
      console.log('Fetching RSS from:', url);
      const feedData = await parser.parseURL(url);
      const jobs = (feedData.items || []).map(item => ({
      title: item.title,
      link: item.link,
      description: item.contentSnippet || item.content || item.description || '',
      pubDate: item.pubDate,
        guid: item.guid || item.link,
        feedUrl: url
    }));
      allJobs = allJobs.concat(jobs);
  } catch (error) {
      console.error(`RSS fetch error for ${url}:`, error.message);
    }
  }
  return allJobs;
}

module.exports = { fetchJobsFromRSS }; 