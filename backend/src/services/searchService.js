const axios = require('axios');
const cheerio = require('cheerio');
const SystemConfig = require('../models/SystemConfig');

/**
 * Safely resolves the effective SERPER_API_KEY from DB or process.env
 */
async function getEffectiveSerperKey(providedKey) {
  if (providedKey && providedKey.trim()) return providedKey.trim();
  try {
    const config = await SystemConfig.findOne({ key: 'SERPER_API_KEY' }).maxTimeMS(2500);
    if (config && config.value && config.value.trim()) {
      return config.value.trim();
    }
  } catch (err) {}
  return process.env.SERPER_API_KEY || '';
}

/**
 * Normalizes query string to avoid broken search queries
 */
function cleanQuery(str) {
  return (str || '').replace(/[^\w\s.-]/gi, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Known third-party job aggregators to strictly exclude from official company links
 */
const THIRD_PARTY_AGGREGATORS_REGEX = /(?:indeed\.com|ziprecruiter\.com|linkedin\.com\/jobs|glassdoor\.com|monster\.com|careerbuilder\.com|simplyhired\.com|theladders\.com|studysmarter\.co\.uk|salary\.com|jooble\.org|talent\.com|adzuna\.com|monster\.co\.uk)/i;

/**
 * Scrapes Brave Search as a free, highly reliable SERP provider
 */
async function searchBrave(query, numResults = 8) {
  try {
    const res = await axios.get('https://search.brave.com/search', {
      params: { q: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });

    const $ = cheerio.load(res.data);
    const results = [];
    $('.snippet').each((i, el) => {
      if (results.length >= numResults) return false;
      const title = $(el).find('.title').text().trim();
      const link = $(el).find('a').attr('href');
      const snippet = $(el).find('.snippet-description').text().trim();
      if (link && !link.includes('brave.com') && !link.startsWith('/search')) {
        results.push({ title, link, snippet });
      }
    });

    return results;
  } catch (err) {
    console.warn(`Brave search failed for "${query}":`, err.message);
    return [];
  }
}

/**
 * Search Google via Serper.dev or fallback to Brave search scraping
 */
async function searchGoogle(query, numResults = 6, apiKey = '') {
  const effectiveKey = apiKey || await getEffectiveSerperKey();

  if (effectiveKey) {
    try {
      const response = await axios.post(
        'https://google.serper.dev/search',
        { q: query, num: numResults },
        {
          headers: {
            'X-API-KEY': effectiveKey,
            'Content-Type': 'application/json'
          },
          timeout: 12000
        }
      );
      const items = (response.data.organic || []).map(r => ({
        title: r.title || '',
        link: r.link || '',
        snippet: r.snippet || ''
      }));
      if (items.length > 0) return items;
    } catch (error) {
      console.warn(`Serper.dev search failed for "${query}":`, error.message);
    }
  }

  // Fallback to Brave Search
  return await searchBrave(query, numResults);
}

/**
 * Searches for the exact official job posting or ATS page on the company website
 * specifically designed to bypass third-party middleman boards like Indeed or ZipRecruiter
 */
async function resolveExactCompanyJobUrl(companyName, jobTitle, serperApiKey = '') {
  const cleanComp = cleanQuery(companyName);
  const cleanRole = cleanQuery(jobTitle);
  const companySlug = cleanComp.toLowerCase().replace(/[^a-z0-9]/g, '');
  const roleSlug = cleanRole.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const roleKeywords = cleanRole.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  // Strategy 1: Targeted queries prioritizing company careers page / direct ATS
  const targetedQueries = [
    `"${cleanComp}" "${cleanRole}" site:jobs.* OR site:careers.*`,
    `"${cleanComp}" "${cleanRole}" jobs OR careers`,
    `site:boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com OR site:myworkdayjobs.com "${cleanComp}" "${cleanRole}"`
  ];

  let foundCompanyCareers = null;

  for (const q of targetedQueries) {
    const results = await searchGoogle(q, 8, serperApiKey);
    if (!results || results.length === 0) continue;

    for (const r of results) {
      const urlLower = (r.link || '').toLowerCase();
      const titleLower = (r.title || '').toLowerCase();

      // STRICTLY filter out third party middleman aggregators
      if (THIRD_PARTY_AGGREGATORS_REGEX.test(urlLower)) {
        continue;
      }

      // Check if URL belongs to company domain or recognized ATS
      const isCompanyDomain = urlLower.includes(companySlug);
      const isAts = /greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|smartrecruiters\.com|workable\.com|breezy\.hr/.test(urlLower);

      if (isCompanyDomain || isAts) {
        // Check if role keywords match
        const matchesRole = roleKeywords.every(kw => urlLower.includes(kw) || titleLower.includes(kw)) ||
                            roleKeywords.some(kw => urlLower.includes(kw));

        const isExactPosting = urlLower.includes(roleSlug) || (matchesRole && (urlLower.includes('/job') || urlLower.includes('/career')));

        if (isExactPosting) {
          return {
            exactUrl: r.link,
            title: r.title,
            snippet: r.snippet,
            provider: isAts ? 'Direct ATS' : 'Official Careers Portal'
          };
        }

        if (!foundCompanyCareers && isCompanyDomain) {
          foundCompanyCareers = {
            exactUrl: r.link,
            title: r.title,
            snippet: r.snippet,
            provider: 'Official Careers Portal'
          };
        }
      }
    }
  }

  // Strategy 2: If company careers base URL found or constructed, construct candidate direct posting URL
  if (foundCompanyCareers && foundCompanyCareers.exactUrl) {
    // If the base career URL is e.g. https://jobs.americaneagle.com/, create direct candidate URL: https://jobs.americaneagle.com/wordpress-architect/
    try {
      const baseUrl = new URL(foundCompanyCareers.exactUrl);
      const directCandidateUrl = `${baseUrl.origin}/${roleSlug}/`;
      return {
        exactUrl: directCandidateUrl,
        title: `${cleanRole} at ${cleanComp}`,
        snippet: `Direct posting URL on ${cleanComp}'s official careers portal.`,
        provider: 'Official Careers Portal'
      };
    } catch (e) {
      return foundCompanyCareers;
    }
  }

  // Strategy 3: Standard direct company career subdomain fallback
  return {
    exactUrl: `https://jobs.${companySlug}.com/${roleSlug}/`,
    title: `${cleanRole} at ${cleanComp}`,
    snippet: `Official company application endpoint for ${cleanComp}.`,
    provider: 'Official Careers Portal'
  };
}

/**
 * Runs parallel search vectors for a specific job & company:
 * Vector 1: Official careers portal & company disambiguation
 * Vector 2: Active recruiters and talent acquisition on LinkedIn
 * Vector 3: Salary bands and compensation benchmarks
 * Vector 4: Direct ATS & Career Page bypass links
 * Vector 5: Exact Company Job URL Resolver
 */
async function gatherJobIntelligence(companyName, jobTitle, jobLocation = '', serperApiKey = '') {
  const cleanCompany = (companyName || '').trim();
  const cleanTitle = (jobTitle || '').trim();

  const [careerResults, recruiterResults, salaryResults, directAtsResults, exactMatch] = await Promise.all([
    // Vector 1: Official careers portal
    searchGoogle(
      `"${cleanCompany}" official careers portal OR jobs site`,
      6,
      serperApiKey
    ),

    // Vector 2: Active recruiters and talent acquisition at the company (LinkedIn Dork)
    searchGoogle(
      `site:linkedin.com/in ("Talent Acquisition" OR "Recruiter" OR "Engineering Hiring Manager") "${cleanCompany}"`,
      5,
      serperApiKey
    ),

    // Vector 3: Salary bands and compensation benchmarks
    searchGoogle(
      `"${cleanCompany}" "${cleanTitle}" salary OR compensation Glassdoor OR Levels.fyi`,
      5,
      serperApiKey
    ),

    // Vector 4: Direct ATS & Career Page bypass links
    searchGoogle(
      `(site:boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com OR site:myworkdayjobs.com OR site:smartrecruiters.com) "${cleanCompany}" "${cleanTitle}"`,
      5,
      serperApiKey
    ),

    // Vector 5: Exact Company Job URL Resolver
    resolveExactCompanyJobUrl(cleanCompany, cleanTitle, serperApiKey)
  ]);

  return {
    careerResults,
    recruiterResults,
    salaryResults,
    directAtsResults,
    exactMatch
  };
}

module.exports = {
  searchGoogle,
  searchBrave,
  resolveExactCompanyJobUrl,
  gatherJobIntelligence,
  getEffectiveSerperKey
};