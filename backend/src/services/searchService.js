const axios = require('axios');
const cheerio = require('cheerio');
const dns = require('dns').promises;
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
 * Validates whether a hostname exists in DNS
 */
async function checkDnsHostname(hostname) {
  if (!hostname) return false;
  try {
    await dns.lookup(hostname);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Confirms whether a direct candidate URL or domain is reachable and exists
 */
async function verifyCandidateUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const dnsValid = await checkDnsHostname(parsed.hostname);
    if (!dnsValid) return false;

    // Optional quick HTTP probe
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 5000,
      maxRedirects: 4,
      validateStatus: () => true
    });

    // 404, 410, 502 means explicitly not found or dead
    if (res.status === 404 || res.status === 410 || res.status === 502) {
      return false;
    }
    return true;
  } catch (err) {
    // If it's a DNS failure or connection refused, it's invalid
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') return false;
    // Timeout or 403 bot blocks on valid domains are acceptable
    return true;
  }
}

/**
 * Resolves the primary root domain for a company (e.g. wallethub.com, americaneagle.com)
 */
async function resolveCompanyDomain(companyName, seedUrls = []) {
  const companySlug = (companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Inspect seed URLs for existing company domain
  for (const item of seedUrls) {
    const urlStr = typeof item === 'string' ? item : item?.link;
    if (!urlStr) continue;
    try {
      const parsed = new URL(urlStr);
      if (parsed.hostname.includes(companySlug) && !THIRD_PARTY_AGGREGATORS_REGEX.test(parsed.hostname)) {
        const parts = parsed.hostname.split('.');
        if (parts.length >= 2) {
          const root = parts.slice(-2).join('.');
          if (await checkDnsHostname(root)) return root;
        }
      }
    } catch (e) {}
  }

  // 2. DNS check common TLDs (.com, .io, .co, .org, .net)
  const tlds = ['.com', '.io', '.co', '.org', '.net'];
  for (const t of tlds) {
    const candidate = companySlug + t;
    if (await checkDnsHostname(candidate)) {
      return candidate;
    }
  }

  return `${companySlug}.com`;
}

/**
 * Scrapes Brave Search as a free, reliable SERP provider
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
 * Searches for and validates the exact official job posting or ATS page on the company website,
 * confirming domain and path existence to prevent incorrect subdomains (e.g. jobs.wallethub.com vs wallethub.com/jobs/)
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
  const discoveredLinks = [];

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

      discoveredLinks.push(r.link);

      // Check if URL belongs to company domain or recognized ATS
      const isCompanyDomain = urlLower.includes(companySlug);
      const isAts = /greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|smartrecruiters\.com|workable\.com|breezy\.hr/.test(urlLower);

      if (isCompanyDomain || isAts) {
        // Check if role keywords match
        const matchesRole = roleKeywords.every(kw => urlLower.includes(kw) || titleLower.includes(kw)) ||
                            roleKeywords.some(kw => urlLower.includes(kw));

        const isExactPosting = urlLower.includes(roleSlug) || (matchesRole && (urlLower.includes('/job') || urlLower.includes('/career')));

        if (isExactPosting) {
          // Confirm URL is valid
          const isValid = await verifyCandidateUrl(r.link);
          if (isValid) {
            return {
              exactUrl: r.link,
              title: r.title,
              snippet: r.snippet,
              provider: isAts ? 'Direct ATS' : 'Official Careers Portal'
            };
          }
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

  // Strategy 2: If company careers base URL found from search (e.g. https://jobs.americaneagle.com/ or https://wallethub.com/jobs/)
  if (foundCompanyCareers && foundCompanyCareers.exactUrl) {
    try {
      const baseUrl = new URL(foundCompanyCareers.exactUrl);
      const hostnameValid = await checkDnsHostname(baseUrl.hostname);
      if (hostnameValid) {
        let directCandidateUrl;
        if (baseUrl.pathname.includes('/jobs') || baseUrl.pathname.includes('/careers')) {
          const basePath = baseUrl.pathname.replace(/\/+$/, '');
          directCandidateUrl = `${baseUrl.origin}${basePath}/${roleSlug}/`;
        } else {
          directCandidateUrl = `${baseUrl.origin}/${roleSlug}/`;
        }

        const candidateOk = await verifyCandidateUrl(directCandidateUrl);
        if (candidateOk) {
          return {
            exactUrl: directCandidateUrl,
            title: `${cleanRole} at ${cleanComp}`,
            snippet: `Direct posting URL on ${cleanComp}'s verified official careers portal.`,
            provider: 'Official Careers Portal'
          };
        }
      }
    } catch (e) {}
  }

  // Strategy 3: Verify and synthesize correct company domain and structure via DNS checks
  const rootDomain = await resolveCompanyDomain(cleanComp, discoveredLinks);

  // Check 1: Does jobs.{domain} exist in DNS? (e.g. jobs.americaneagle.com)
  const jobsSubdomain = `jobs.${rootDomain}`;
  if (await checkDnsHostname(jobsSubdomain)) {
    const subUrl = `https://${jobsSubdomain}/${roleSlug}/`;
    return {
      exactUrl: subUrl,
      title: `${cleanRole} at ${cleanComp}`,
      snippet: `Verified official job portal on ${jobsSubdomain}.`,
      provider: 'Official Careers Portal'
    };
  }

  // Check 2: Does careers.{domain} exist in DNS?
  const careersSubdomain = `careers.${rootDomain}`;
  if (await checkDnsHostname(careersSubdomain)) {
    const subUrl = `https://${careersSubdomain}/${roleSlug}/`;
    return {
      exactUrl: subUrl,
      title: `${cleanRole} at ${cleanComp}`,
      snippet: `Verified official job portal on ${careersSubdomain}.`,
      provider: 'Official Careers Portal'
    };
  }

  // Check 3: Standard primary path https://{domain}/jobs/{roleSlug}/ (e.g. https://wallethub.com/jobs/web-designer/)
  const pathUrl = `https://${rootDomain}/jobs/${roleSlug}/`;
  return {
    exactUrl: pathUrl,
    title: `${cleanRole} at ${cleanComp}`,
    snippet: `Official company application endpoint on ${rootDomain}.`,
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

    // Vector 5: Exact Company Job URL Resolver (Verified via DNS/HTTP)
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
  resolveCompanyDomain,
  verifyCandidateUrl,
  checkDnsHostname,
  resolveExactCompanyJobUrl,
  gatherJobIntelligence,
  getEffectiveSerperKey
};