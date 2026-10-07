const axios = require('axios');
const cheerio = require('cheerio');
const SystemConfig = require('../models/SystemConfig');

/**
 * Helper to fetch config value from SystemConfig DB model or process.env
 */
async function getConfigKey(keyName, fallbackEnv = '') {
  try {
    const config = await SystemConfig.findOne({ key: keyName }).maxTimeMS(2500);
    if (config && config.value && config.value.trim()) {
      return config.value.trim();
    }
  } catch (err) {}
  return process.env[fallbackEnv || keyName] || '';
}

/**
 * 1. Google Places API (New) + Data Enrichment (Apollo/Hunter fallback)
 * Finds businesses missing the websiteUri field via Places API TextSearch
 */
async function discoverGooglePlacesLeads(query, apiKeyOverride = '') {
  const apiKey = apiKeyOverride || await getConfigKey('GOOGLE_PLACES_API_KEY') || await getConfigKey('GOOGLE_MAPS_API_KEY');
  if (!apiKey) {
    throw new Error('Google Places API Key is not configured. Provide an API key or configure it in Settings.');
  }

  const url = 'https://places.googleapis.com/v1/places:searchText';
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating'
  };

  const response = await axios.post(url, { textQuery: query }, { headers, timeout: 15000 });
  const places = response.data?.places || [];
  const leads = [];

  for (const place of places) {
    // If the business has no website, the API omits the websiteUri field
    if (!place.websiteUri) {
      leads.push({
        businessName: place.displayName?.text || 'Local Business',
        address: place.formattedAddress || 'Location on Map',
        phone: place.nationalPhoneNumber || '',
        email: '',
        websiteStatus: 'no_website',
        sourceChannel: 'google_places',
        notes: `Identified via Google Places API (Rating: ${place.rating || 'N/A'}). No websiteUri listed.`
      });
    }
  }

  return leads;
}

/**
 * 2. Dedicated B2B Lead Scraper (Outscraper API)
 * Queries Google Maps, automatically filters out businesses with websites, and extracts contacts.
 */
async function discoverOutscraperLeads(query, apiKeyOverride = '') {
  const apiKey = apiKeyOverride || await getConfigKey('OUTSCRAPER_API_KEY');
  if (!apiKey) {
    throw new Error('Outscraper API Key is not configured. Provide an API key or configure it in Settings.');
  }

  const url = 'https://api.app.outscraper.com/maps/search-v2';
  const response = await axios.get(url, {
    params: {
      query,
      limit: 25,
      async: false
    },
    headers: {
      'X-API-KEY': apiKey
    },
    timeout: 30000
  });

  const results = response.data?.data?.[0] || response.data?.data || [];
  const leads = [];

  for (const business of results) {
    // Filter out businesses that already have a verified website
    if (!business.site && !business.website) {
      const emails = business.emails_and_contacts?.emails || business.emails || [];
      leads.push({
        businessName: business.name || 'Local Business',
        email: emails[0] || '',
        phone: business.phone || '',
        address: business.full_address || business.address || '',
        websiteStatus: 'no_website',
        sourceChannel: 'outscraper_b2b',
        notes: `Outscraper B2B Lead. Verified missing website. Category: ${business.category || 'Local Service'}`
      });
    }
  }

  return leads;
}

/**
 * 3. Facebook Pages (via Apify)
 * Scrapes public Facebook pages for small businesses missing website links in their About section
 */
async function discoverFacebookLeads(keyword, tokenOverride = '') {
  const token = tokenOverride || await getConfigKey('APIFY_TOKEN');
  if (!token) {
    throw new Error('Apify API Token is not configured. Provide an Apify token or configure it in Settings.');
  }

  // Run Apify actor: apify/facebook-pages-scraper
  const runUrl = `https://api.apify.com/v2/acts/apify~facebook-pages-scraper/run-sync-get-dataset-items?token=${token}`;
  const response = await axios.post(runUrl, {
    searchUrls: [{ url: `https://www.facebook.com/search/pages/?q=${encodeURIComponent(keyword)}` }],
    maxPages: 3
  }, { timeout: 45000 });

  const items = Array.isArray(response.data) ? response.data : [];
  const leads = [];

  for (const item of items) {
    if (!item.website && !item.websiteUri) {
      const email = item.email || item.emailAddress || '';
      leads.push({
        businessName: item.pageName || item.name || 'Facebook Business Page',
        email: email,
        phone: item.phone || '',
        address: item.address || item.city || '',
        websiteStatus: 'no_website',
        sourceChannel: 'facebook_pages',
        notes: `Active Facebook Business Page with ${item.likes || item.followers || '0'} followers, but lacking an official website.`
      });
    }
  }

  return leads;
}

/**
 * 4. Local Directory Scraping (YellowPages / Free Directory Parser)
 * 100% Free, no API keys required. Parses DOM for businesses without a website button.
 */
async function discoverYellowpagesLeads(keyword, location) {
  const cleanKeyword = encodeURIComponent(keyword.trim() || 'plumber');
  const cleanLocation = encodeURIComponent(location.trim() || 'New York, NY');
  const url = `https://www.yellowpages.com/search?search_terms=${cleanKeyword}&geo_location_terms=${cleanLocation}`;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  try {
    const response = await axios.get(url, { headers, timeout: 15000 });
    const $ = cheerio.load(response.data);
    const leads = [];

    $('.result').each((_, el) => {
      const nameTag = $(el).find('a.business-name');
      if (!nameTag.length) return;

      const name = nameTag.text().trim();
      const links = $(el).find('.links');

      const hasWebsite = links.find('a.track-visit-website').length > 0;
      const emailLink = links.find('a.email-business');
      const phoneTag = $(el).find('.phones');
      const addressTag = $(el).find('.adr');

      // Target businesses that do NOT have a website
      if (!hasWebsite) {
        let email = '';
        if (emailLink.length) {
          const href = emailLink.attr('href') || '';
          email = href.replace(/^mailto:/i, '').trim();
        }

        leads.push({
          businessName: name,
          email: email,
          phone: phoneTag.text().trim() || '',
          address: addressTag.text().trim() || location,
          websiteStatus: 'no_website',
          sourceChannel: 'yellowpages_directory',
          notes: `YellowPages business without an active website link. Primary contact phone available.`
        });
      }
    });

    if (leads.length > 0) return leads;
  } catch (err) {
    console.warn('[YellowPages Scraper] Direct fetch failed (will try search fallback):', err.message);
  }

  // Fallback: Query search engine (DuckDuckGo via ddgs) for indexed YellowPages / Yelp / local profiles
  try {
    const { searchGoogle } = require('./searchService');
    const dorkQuery = `site:yellowpages.com "${keyword}" "${location}" -"visit website"`;
    const searchResults = await searchGoogle(dorkQuery, 10);

    const fallbackLeads = [];
    const ignoreList = ['best', 'top', 'get the app', 'yellow pages', 'results', 'near', 'browse'];

    for (const r of searchResults) {
      let titleClean = (r.title || '')
        .replace(/- Yellow Pages.*$/i, '')
        .replace(/\|.*$/i, '')
        .replace(/in [A-Za-z\s,]+$/i, '')
        .trim();

      const lower = titleClean.toLowerCase();
      if (ignoreList.some(ig => lower.startsWith(ig) || lower.includes('best 30') || lower.includes('top 10'))) {
        continue;
      }

      // Extract phone number from snippet if present
      const phoneMatch = (r.snippet || '').match(/(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/);

      if (titleClean && titleClean.length > 2) {
        fallbackLeads.push({
          businessName: titleClean,
          email: '',
          phone: phoneMatch ? phoneMatch[0] : '',
          address: location,
          websiteStatus: 'no_website',
          sourceChannel: 'yellowpages_directory',
          notes: r.snippet ? `Local directory snippet: ${r.snippet.substring(0, 140)}` : 'Directory listing with no active website'
        });
      }
    }
    return fallbackLeads;
  } catch (fbErr) {
    console.warn('[Directory Fallback] Error in search fallback:', fbErr.message);
    return [];
  }
}

/**
 * 5. Newly Registered Domains (WhoisXML API)
 * Downloads recent domain registration alerts, extracts registrant email to pitch web design before site launch
 */
async function discoverWhoisNewDomainLeads(apiKeyOverride = '', dateString = '') {
  const apiKey = apiKeyOverride || await getConfigKey('WHOISXML_API_KEY');
  if (!apiKey) {
    throw new Error('WhoisXML API Key is not configured. Provide an API key or configure it in Settings.');
  }

  const effectiveDate = dateString || new Date().toISOString().split('T')[0];
  const feedUrl = `https://domains-monitor.whoisxmlapi.com/api/v1?apiKey=${apiKey}&sinceDate=${effectiveDate}`;

  const feedResponse = await axios.get(feedUrl, { timeout: 15000 });
  const domains = feedResponse.data?.domains || [];
  const leads = [];

  for (const domain of domains.slice(0, 15)) {
    try {
      const whoisUrl = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${domain}&outputFormat=JSON`;
      const whoisRes = await axios.get(whoisUrl, { timeout: 10000 });
      const registrant = whoisRes.data?.WhoisRecord?.registrant || {};
      const email = registrant.email;

      // Filter out proxy and privacy protection emails (e.g. domainsbyproxy)
      if (email && !email.toLowerCase().includes('privacy') && !email.toLowerCase().includes('proxy')) {
        leads.push({
          businessName: registrant.organization || registrant.name || domain,
          domain: domain,
          email: email,
          phone: registrant.telephone || '',
          address: `${registrant.city || ''}, ${registrant.country || ''}`.replace(/^, |, $/g, ''),
          websiteStatus: 'new_domain_no_site',
          sourceChannel: 'whois_new_domains',
          notes: `Fresh domain "${domain}" registered on ${effectiveDate}. Ready for web development launch pitch.`
        });
      }
    } catch (domainErr) {
      console.warn(`Error querying WHOIS for ${domain}:`, domainErr.message);
    }
  }

  return leads;
}

module.exports = {
  discoverGooglePlacesLeads,
  discoverOutscraperLeads,
  discoverFacebookLeads,
  discoverYellowpagesLeads,
  discoverWhoisNewDomainLeads
};
