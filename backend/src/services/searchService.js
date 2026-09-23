const axios = require('axios');
const SystemConfig = require('../models/SystemConfig');

/**
 * Safely resolves the effective SERPER_API_KEY from DB or process.env
 */
async function getEffectiveSerperKey(providedKey) {
  if (providedKey && providedKey.trim()) return providedKey.trim();
  try {
    const config = await SystemConfig.findOne({ key: 'SERPER_API_KEY' });
    if (config && config.value && config.value.trim()) {
      return config.value.trim();
    }
  } catch (err) {
    console.warn('Could not read Serper key from SystemConfig:', err.message);
  }
  return process.env.SERPER_API_KEY || '';
}

/**
 * Search Google via Serper.dev or fallback to DuckDuckGo/public search scraping
 */
async function searchGoogle(query, numResults = 5, apiKey = '') {
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
      return (response.data.organic || []).map(r => ({
        title: r.title || '',
        link: r.link || '',
        snippet: r.snippet || ''
      }));
    } catch (error) {
      console.warn(`Serper.dev search failed for "${query}":`, error.message);
    }
  }

  // Fallback: Free DuckDuckGo HTML / instant search parser if Serper key is not configured or fails
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(ddgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });

    const cheerio = require('cheerio');
    const $ = cheerio.load(response.data);
    const results = [];

    $('.result').each((i, el) => {
      if (results.length >= numResults) return false;
      const titleEl = $(el).find('.result__title a');
      const snippetEl = $(el).find('.result__snippet');
      let link = titleEl.attr('href') || '';
      
      // DuckDuckGo redirects through /l/?uddg=...
      if (link.includes('uddg=')) {
        try {
          const match = link.match(/uddg=([^&]+)/);
          if (match && match[1]) {
            link = decodeURIComponent(match[1]);
          }
        } catch (e) {}
      }

      const title = titleEl.text().trim();
      const snippet = snippetEl.text().trim();

      if (title && link) {
        results.push({ title, link, snippet });
      }
    });

    if (results.length > 0) return results;
  } catch (ddgErr) {
    console.warn(`DuckDuckGo fallback search failed for "${query}":`, ddgErr.message);
  }

  return [];
}

/**
 * Runs 3 parallel search vectors for a specific job & company:
 * Vector 1: Official careers portal & company disambiguation
 * Vector 2: Active recruiters and talent acquisition on LinkedIn
 * Vector 3: Salary bands and compensation benchmarks
 */
async function gatherJobIntelligence(companyName, jobTitle, jobLocation = '', serperApiKey = '') {
  const cleanCompany = (companyName || '').trim();
  const cleanTitle = (jobTitle || '').trim();

  const [careerResults, recruiterResults, salaryResults] = await Promise.all([
    // Vector 1: Official careers portal & company disambiguation
    searchGoogle(
      `"${cleanCompany}" official careers portal OR jobs site OR "work with us"`,
      5,
      serperApiKey
    ),

    // Vector 2: Active recruiters and talent acquisition at the company (LinkedIn Dork)
    searchGoogle(
      `site:linkedin.com/in ("Talent Acquisition" OR "Recruiter" OR "Technical Recruiter" OR "Engineering Hiring Manager" OR "People Lead") "${cleanCompany}"`,
      5,
      serperApiKey
    ),

    // Vector 3: Salary bands and compensation benchmarks
    searchGoogle(
      `"${cleanCompany}" "${cleanTitle}" salary OR compensation Glassdoor OR Levels.fyi OR Indeed`,
      5,
      serperApiKey
    )
  ]);

  return {
    careerResults,
    recruiterResults,
    salaryResults
  };
}

module.exports = {
  searchGoogle,
  gatherJobIntelligence,
  getEffectiveSerperKey
};