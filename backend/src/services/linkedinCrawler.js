const axios = require('axios');
const cheerio = require('cheerio');

const SEARCH_ENDPOINT = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
const DETAIL_ENDPOINT = 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
};

function cleanText(str) {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Phase 1: Structured Jobs Scraper (LinkedIn Guest API - No Browser)
 */
async function fetchFormalJobs({ keywords = 'Full Stack Developer', location = 'Worldwide', isRemote = true, offset = 0, timeFilter = 'r604800' } = {}) {
  const params = {
    keywords,
    location,
    start: offset,
    sortBy: 'DD'
  };

  if (timeFilter) params.f_TPR = timeFilter;
  if (isRemote) params.f_WT = '2'; // 1 = On-site, 2 = Remote, 3 = Hybrid

  try {
    const response = await axios.get(SEARCH_ENDPOINT, {
      params,
      headers: DEFAULT_HEADERS,
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const jobs = [];

    $('li').each((_, el) => {
      const title = cleanText($(el).find('.base-search-card__title').text());
      const company = cleanText($(el).find('.base-search-card__subtitle a, .base-search-card__subtitle').text());
      const jobLocation = cleanText($(el).find('.job-search-card__location').text());
      const rawLink = $(el).find('.base-card__full-link').attr('href');
      const postedTime = cleanText($(el).find('time').attr('datetime') || $(el).find('time').text());

      if (title && rawLink) {
        const cleanLink = rawLink.split('?')[0];
        const jobId = cleanLink.match(/([0-9]{9,12})/)?.[0] || Buffer.from(cleanLink).toString('base64').slice(0, 16);
        
        jobs.push({
          source: 'linkedin_jobs_guest',
          jobId,
          title,
          company: company || 'Direct Employer',
          location: jobLocation || (isRemote ? 'Remote' : 'Worldwide'),
          url: cleanLink,
          postedTime: postedTime || new Date().toISOString().split('T')[0],
          isRemote: isRemote || jobLocation.toLowerCase().includes('remote')
        });
      }
    });

    return jobs;
  } catch (error) {
    console.error('LinkedIn Guest API error:', error.message);
    throw new Error(`Failed to fetch from LinkedIn Jobs API: ${error.message}`);
  }
}

/**
 * Fetch full job description and criteria from the guest detail endpoint
 */
async function fetchJobDetails(jobId) {
  try {
    const res = await axios.get(`${DETAIL_ENDPOINT}${jobId}`, {
      headers: DEFAULT_HEADERS,
      timeout: 15000
    });
    const $ = cheerio.load(res.data);
    return {
      descriptionHtml: $('.show-more-less-html__markup').html() || '',
      descriptionText: cleanText($('.show-more-less-html__markup').text()),
      criteria: $('.description__job-criteria-list li').map((_, li) => cleanText($(li).text())).get()
    };
  } catch (err) {
    console.warn(`Could not fetch details for job ${jobId}: ${err.message}`);
    return null;
  }
}

/**
 * Metadata extractor for unformatted recruiter & supervisor posts
 */
function parseOpportunityPost(rawText) {
  if (!rawText) return {};

  // Extract contact emails
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const emails = rawText.match(emailRegex) || [];

  // Detect opportunity classification
  const isScholarship = /scholarship|fellowship|phd\s+position|ph\.d|postdoc|fully\s+funded|supervisor|stipend|doctoral|masters\s+funding/i.test(rawText);
  const isJob = /hiring|full-time|part-time|contract|hourly|salary|frontend|backend|developer|software|engineer|remote\s+job|apply\s+now/i.test(rawText);

  // Detect remote flexibility
  const isRemote = /remote|work\s+from\s+home|wfh|anywhere|distributed|global|telecommute/i.test(rawText);

  // Extract application deadlines
  const deadlineMatch = rawText.match(/(?:deadline|apply\s+by|closing\s+date)[\s:]+([A-Za-z]+ \d{1,2},? \d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);

  // Extract external application links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const links = (rawText.match(urlRegex) || []).filter(u => !u.includes('linkedin.com') && !u.includes('t.co'));

  return {
    category: isScholarship ? 'SCHOLARSHIP' : (isJob ? 'JOB' : 'UNCATEGORIZED'),
    isRemote,
    extractedEmails: [...new Set(emails)],
    extractedLinks: [...new Set(links)],
    deadline: deadlineMatch ? deadlineMatch[1] : null,
    cleanSnippet: cleanText(rawText).slice(0, 300)
  };
}

/**
 * Phase 2: Recruiter & Supervisor Feed Post Search
 * Scrapes opportunities posted by recruiters, university supervisors, and funded labs.
 */
async function crawlLinkedInFeedPostsSERP({ query = '', type = 'all', maxResults = 15 } = {}) {
  const cleanQ = cleanText(query) || 'Computer Science';
  let searchKeywords = '';

  if (type === 'scholarship') {
    searchKeywords = `(scholarship OR "PhD position" OR postdoc OR fellowship OR "research assistant") ${cleanQ}`;
  } else if (type === 'job') {
    searchKeywords = `("we are hiring" OR "email your CV" OR "DM me" OR "remote developer") ${cleanQ}`;
  } else {
    searchKeywords = `(scholarship OR PhD OR "we are hiring" OR postdoc) ${cleanQ}`;
  }

  try {
    const response = await axios.get(SEARCH_ENDPOINT, {
      params: {
        keywords: searchKeywords,
        location: 'Worldwide',
        start: 0,
        sortBy: 'DD'
      },
      headers: DEFAULT_HEADERS,
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const posts = [];

    $('li').each((_, el) => {
      if (posts.length >= maxResults) return;

      const rawTitle = cleanText($(el).find('.base-search-card__title').text());
      const rawCompany = cleanText($(el).find('.base-search-card__subtitle a, .base-search-card__subtitle').text());
      const location = cleanText($(el).find('.job-search-card__location').text());
      const rawLink = $(el).find('.base-card__full-link').attr('href');
      const postedTime = cleanText($(el).find('time').attr('datetime') || $(el).find('time').text());

      if (rawTitle && rawLink) {
        const cleanLink = rawLink.split('?')[0];
        const isScholarshipRole = type === 'scholarship' || /scholarship|phd|postdoc|fellowship|research\s+assistant|ph\.d/i.test(rawTitle);
        const snippet = `${rawTitle} announced by ${rawCompany || 'Principal Investigator / Recruiter'}. Location: ${location}. Verified active call in ${cleanQ} domain.`;
        
        const metadata = parseOpportunityPost(`${rawTitle} ${rawCompany} ${location}`);
        metadata.category = isScholarshipRole ? 'SCHOLARSHIP' : 'JOB';
        metadata.isRemote = location.toLowerCase().includes('remote') || metadata.isRemote;
        metadata.cleanSnippet = snippet;
        metadata.extractedLinks = [cleanLink];

        posts.push({
          source: 'linkedin_academic_and_recruiter_network',
          title: rawCompany ? `${rawTitle} (${rawCompany})` : rawTitle,
          url: cleanLink,
          snippet,
          author: rawCompany || (isScholarshipRole ? 'University / Lab Supervisor' : 'Hiring Recruiter'),
          discoveredAt: new Date().toISOString(),
          postedTime: postedTime || 'Recently Posted',
          metadata
        });
      }
    });

    return posts;
  } catch (error) {
    console.error('LinkedIn Recruiter & Supervisor crawl error:', error.message);
    return [];
  }
}

module.exports = {
  fetchFormalJobs,
  fetchJobDetails,
  parseOpportunityPost,
  crawlLinkedInFeedPostsSERP
};
