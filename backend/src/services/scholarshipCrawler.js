/**
 * scholarshipCrawler.js
 * Polite Real-Time Crawler using Adapter/Config-Driven Architecture
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { TARGET_SITES } = require('./sites.config');
const { extractScholarshipAttributes, matchesCriteria } = require('./filterEngine');

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Ch-Ua': '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
};

async function fetchHtml(url) {
  const response = await axios.get(url, {
    headers: { ...BROWSER_HEADERS, Referer: url },
    timeout: 15000,
  });
  return response.data;
}

/**
 * Scrape a specific target site definition with polite throttling
 */
async function scrapeTargetSite(siteConfig, filters = {}, maxPages = 1) {
  const qualifiedOpportunities = [];

  for (let page = 1; page <= maxPages; page++) {
    const listUrl = page === 1 ? siteConfig.baseUrl : siteConfig.paginationUrl(page);

    let listHtml;
    try {
      listHtml = await fetchHtml(listUrl);
    } catch (err) {
      console.warn(`[${siteConfig.name}] Failed to fetch listing page ${page}: ${err.message}`);
      break;
    }

    const $ = cheerio.load(listHtml);
    const candidates = [];

    // Extract links using titleLink or card selectors
    $(siteConfig.selectors.titleLink || 'h2 a, h3 a').each((_, el) => {
      let rawUrl = $(el).attr('href');
      let title = $(el).text().trim();

      if (!title && $(el).closest('article').length > 0) {
        title = $(el).closest('article').find('h1, h2, h3, h4').first().text().trim();
      }

      if (rawUrl && siteConfig.urlPrefix && rawUrl.startsWith('/')) {
        rawUrl = siteConfig.urlPrefix + rawUrl;
      }

      if (rawUrl && rawUrl.startsWith('http') && title && title.length > 5) {
        candidates.push({ title, url: rawUrl });
      }
    });

    // Deduplicate candidate URLs within the batch and pick first 6 items
    const uniqueCandidates = Array.from(new Map(candidates.map(c => [c.url, c])).values()).slice(0, 6);

    // Process detail pages politely
    for (const candidate of uniqueCandidates) {
      try {
        await new Promise(r => setTimeout(r, 400 + Math.random() * 500));

        const detailHtml = await fetchHtml(candidate.url);
        const $detail = cheerio.load(detailHtml);

        const fullText = $detail(siteConfig.selectors.contentBody).text() || $detail('body').text();
        const parsedData = extractScholarshipAttributes(fullText);

        if (matchesCriteria(parsedData, filters)) {
          qualifiedOpportunities.push({
            id: Buffer.from(candidate.url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(-16) || Math.random().toString(36).substring(2, 10),
            source: siteConfig.name,
            siteId: siteConfig.id,
            title: candidate.title,
            url: candidate.url,
            ...parsedData,
            scrapedAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn(`Error processing ${candidate.url}: ${err.message}`);
      }
    }
  }

  return qualifiedOpportunities;
}

/**
 * Crawl across all configured scholarship websites
 */
async function crawlAllScholarshipSites(filters = {}, selectedSiteId = 'all') {
  const targetSites = selectedSiteId === 'all'
    ? TARGET_SITES
    : TARGET_SITES.filter(s => s.id === selectedSiteId);

  const allOpportunities = [];

  for (const site of targetSites) {
    try {
      if (site.driver === 'stealth_browser' && site.id === 'findaphd') {
        const { scrapeFindAPhD } = require('./findaPhdScraper');
        const findaPhdResults = await scrapeFindAPhD(site.options);
        allOpportunities.push(...findaPhdResults);
      } else {
        const siteResults = await scrapeTargetSite(site, filters, 1);
        allOpportunities.push(...siteResults);
      }
    } catch (err) {
      console.error(`Failed crawling site ${site.name}:`, err.message);
    }
  }

  return allOpportunities;
}

module.exports = {
  TARGET_SITES,
  scrapeTargetSite,
  crawlAllScholarshipSites
};
