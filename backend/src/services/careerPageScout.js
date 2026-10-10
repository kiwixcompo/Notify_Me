const axios = require('axios');
const cheerio = require('cheerio');
const dns = require('dns').promises;
const { searchDuckDuckGo } = require('./searchService');

/**
 * Top Applicant Tracking Systems (ATS) used by companies worldwide
 */
const ATS_HOSTNAMES = [
  'boards.greenhouse.io',
  'jobs.lever.co',
  'jobs.ashbyhq.com',
  'myworkdayjobs.com',
  'breezy.hr',
  'workable.com',
  'smartrecruiters.com',
  'recruitee.com',
  'rippling-ats.com',
  'pinpointhq.com',
  'jobs.jobvite.com',
  'applytojob.com',
  'hire.withgoogle.com',
  'applicantpro.com',
  'bamboohr.com'
];

/**
 * Standard career paths found on corporate websites
 */
const COMMON_CAREER_PATHS = [
  '/careers',
  '/jobs',
  '/join-us',
  '/about/careers',
  '/company/careers',
  '/work-with-us',
  '/careers/jobs',
  '/open-roles',
  '/positions',
  '/join'
];

/**
 * Step 1: Query DuckDuckGo for direct ATS job boards for the company & role.
 * 100% Free, zero-cost, no rate limit.
 */
async function findDirectAtsBoard(companyName, role = '') {
  if (!companyName) return null;
  const cleanCompany = companyName.trim();
  const cleanRole = (role || '').trim();

  const rolePart = cleanRole ? `"${cleanRole}"` : '("careers" OR "jobs" OR "openings")';
  const atsDork = `"${cleanCompany}" ${rolePart} (site:boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com OR site:myworkdayjobs.com OR site:jobs.jobvite.com OR site:breezy.hr OR site:workable.com)`;

  try {
    const results = await searchDuckDuckGo(atsDork, 6);
    for (const item of results) {
      const link = item.link || '';
      if (ATS_HOSTNAMES.some(ats => link.includes(ats))) {
        return {
          url: link,
          title: item.title,
          source: 'DIRECT_ATS',
          confidence: 'HIGH'
        };
      }
    }
  } catch (err) {
    console.warn('[CareerScout] ATS discovery warning:', err.message);
  }

  return null;
}

/**
 * Step 2: Discover Company Primary Domain via DuckDuckGo and verify DNS
 */
async function resolveCompanyHomepage(companyName) {
  if (!companyName) return null;
  const query = `"${companyName.trim()}" official website homepage`;

  try {
    const results = await searchDuckDuckGo(query, 5);

    for (const item of results) {
      const url = item.link;
      if (!url) continue;

      try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();

        // Avoid common social networks, encyclopedias, and aggregators
        if (/(?:linkedin|facebook|twitter|x\.com|instagram|wikipedia|wikidata|wikimedia|glassdoor|indeed|crunchbase|bloomberg|youtube|tiktok|github|reddit|medium|investopedia)\.(?:com|org|net)/i.test(host)) {
          continue;
        }

        // Verify domain exists in DNS
        await dns.lookup(host);
        return `${parsed.protocol}//${parsed.hostname}`;
      } catch (e) {
        continue;
      }
    }
  } catch (err) {
    console.warn('[CareerScout] Homepage resolution warning:', err.message);
  }

  return null;
}

/**
 * Step 3: Inspect Homepage HTML for Careers / Jobs Navigation Links
 */
async function scanHomepageForCareerLink(homepageUrl) {
  if (!homepageUrl) return null;
  try {
    const res = await axios.get(homepageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 8000,
      maxRedirects: 4
    });

    const $ = cheerio.load(res.data);
    let candidateCareerUrl = null;

    // Check anchor tags for career keywords
    $('a').each((_, el) => {
      const text = $(el).text().toLowerCase().trim();
      const href = $(el).attr('href');
      if (!href) return;

      if (
        text.includes('career') ||
        text.includes('jobs') ||
        text.includes('join us') ||
        text.includes('we are hiring') ||
        text.includes('open positions') ||
        text.includes('work with us') ||
        /(?:careers|jobs|join-us|open-roles)/i.test(href)
      ) {
        try {
          const resolvedUrl = new URL(href, homepageUrl).toString();
          if (resolvedUrl.startsWith('http')) {
            candidateCareerUrl = resolvedUrl;
            return false; // Break each loop
          }
        } catch (e) {}
      }
    });

    if (candidateCareerUrl) {
      return candidateCareerUrl;
    }

    // Probe standard career routes if no anchor link matched
    for (const path of COMMON_CAREER_PATHS) {
      const probeUrl = `${homepageUrl}${path}`;
      try {
        const probeRes = await axios.head(probeUrl, {
          timeout: 4000,
          validateStatus: (s) => s >= 200 && s < 400
        });
        if (probeRes.status >= 200 && probeRes.status < 400) {
          return probeUrl;
        }
      } catch (e) {}
    }
  } catch (err) {
    // Timeout or firewall
  }

  return null;
}

/**
 * Step 4: Targeted in-site search for a specific Role Title
 */
async function findExactRolePage(companyDomain, role = '') {
  if (!companyDomain || !role) return null;
  try {
    const parsed = new URL(companyDomain);
    const host = parsed.hostname;

    const query = `site:${host} ("careers" OR "jobs" OR "open positions" OR "apply") "${role.trim()}"`;
    const results = await searchDuckDuckGo(query, 4);

    if (results.length > 0 && results[0].link) {
      return {
        url: results[0].link,
        title: results[0].title
      };
    }
  } catch (err) {}

  return null;
}

/**
 * Master Method: Discover exact Career Page URL for Company and Role (100% Free)
 */
async function getExactCareerPageUrl(companyName, role = '') {
  if (!companyName || !companyName.trim()) {
    return { error: 'Please provide a valid company name.' };
  }

  const cleanCompany = companyName.trim();
  const cleanRole = (role || '').trim();

  // 1. Direct ATS Dorking (Greenhouse, Lever, Ashby, Workday)
  const atsResult = await findDirectAtsBoard(cleanCompany, cleanRole);
  if (atsResult) {
    return {
      success: true,
      company: cleanCompany,
      role: cleanRole,
      careerUrl: atsResult.url,
      type: 'ATS_JOB_BOARD',
      confidence: atsResult.confidence,
      title: atsResult.title || `${cleanCompany} Careers`
    };
  }

  // 2. Discover official homepage
  const homepage = await resolveCompanyHomepage(cleanCompany);
  if (!homepage) {
    // 2b. Direct fallback query
    const fallbackResults = await searchDuckDuckGo(`"${cleanCompany}" careers jobs official website`, 2);
    if (fallbackResults.length > 0 && fallbackResults[0].link) {
      return {
        success: true,
        company: cleanCompany,
        role: cleanRole,
        careerUrl: fallbackResults[0].link,
        type: 'SEARCH_FALLBACK',
        title: fallbackResults[0].title
      };
    }

    return {
      success: false,
      company: cleanCompany,
      role: cleanRole,
      error: `Could not identify an official web presence for ${cleanCompany}.`
    };
  }

  // 3. Scan homepage for career links
  const directCareerLink = await scanHomepageForCareerLink(homepage);

  // 4. If a specific role was requested, find exact role URL within company domain
  if (cleanRole) {
    const exactRole = await findExactRolePage(homepage, cleanRole);
    if (exactRole) {
      return {
        success: true,
        company: cleanCompany,
        role: cleanRole,
        careerUrl: exactRole.url,
        type: 'EXACT_ROLE_PAGE',
        companyHomepage: homepage,
        title: exactRole.title || `${cleanRole} at ${cleanCompany}`
      };
    }
  }

  if (directCareerLink) {
    return {
      success: true,
      company: cleanCompany,
      role: cleanRole,
      careerUrl: directCareerLink,
      type: 'COMPANY_CAREERS_PAGE',
      companyHomepage: homepage,
      title: `${cleanCompany} Official Careers Portal`
    };
  }

  // 5. Final fallback to company homepage
  return {
    success: true,
    company: cleanCompany,
    role: cleanRole,
    careerUrl: homepage,
    type: 'HOMEPAGE_FALLBACK',
    companyHomepage: homepage,
    title: `${cleanCompany} Official Website`
  };
}

module.exports = {
  getExactCareerPageUrl,
  findDirectAtsBoard,
  resolveCompanyHomepage,
  scanHomepageForCareerLink,
  findExactRolePage
};
