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
  // Normalize unicode (e.g. bold mathematical alphanumeric characters often used in LinkedIn titles)
  return str.normalize('NFKD').replace(/\s+/g, ' ').trim();
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

  const clean = cleanText(rawText);

  // Extract contact emails
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const emails = clean.match(emailRegex) || [];

  // Extract phone numbers if present
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = clean.match(phoneRegex) || [];

  // Detect opportunity classification
  const isScholarship = /scholarship|fellowship|phd\s+position|ph\.d|postdoc|fully\s+funded|supervisor|stipend|doctoral|masters\s+funding|student\s+will\s+collaborate/i.test(clean);
  const isJob = /hiring|full-time|part-time|contract|hourly|salary|frontend|backend|developer|software|engineer|remote\s+job|apply\s+now|immediate\s+joiners/i.test(clean);

  // Detect remote flexibility
  const isRemote = /remote|work\s+from\s+home|wfh|anywhere|distributed|global|telecommute/i.test(clean);

  // Extract application deadlines
  const deadlineMatch = clean.match(/(?:deadline|apply\s+by|closing\s+date)[\s:]+([A-Za-z]+ \d{1,2},? \d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);

  // Extract external links
  const urlRegex = /(https?:\/\/[^\s"',]+)/g;
  const links = (clean.match(urlRegex) || []).filter(u => !u.includes('news.google.com') && !u.includes('t.co'));

  // Extract "What's needed" / Requirements analysis
  const requirements = [];
  
  // Experience requirement
  const expMatch = clean.match(/(?:\d+\+?\s*(?:to|-)\s*\d+|\d+\+?)\s*(?:years?|yrs?)(?:\s+of)?\s*(?:experience|exp)?/i);
  if (expMatch) requirements.push(`Experience: ${expMatch[0]}`);

  // Skills / Qualifications
  const skillKeywords = ['Python', 'Java', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Go', 'Rust', 'C++', 'AI', 'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'LLM', 'NLP', 'Computer Vision', 'Blockchain', 'Cybersecurity', 'AWS', 'Docker', 'Kubernetes', 'SQL', 'Bioinformatics'];
  const matchedSkills = skillKeywords.filter(s => new RegExp(`\\b${s.replace('+', '\\+')}\\b`, 'i').test(clean));
  if (matchedSkills.length > 0) requirements.push(`Key Skills / Tech: ${matchedSkills.join(', ')}`);

  // Degrees / Eligibility
  if (/phd|doctoral/i.test(clean)) requirements.push('Degree: PhD / Doctoral candidate');
  else if (/master|msc/i.test(clean)) requirements.push('Degree: Master\'s degree or equivalent');
  else if (/bachelor|degree/i.test(clean)) requirements.push('Degree: Bachelor\'s degree or equivalent');

  // Funding or Compensation mention
  const fundingMatch = clean.match(/(?:salary|stipend|funding|funded|aud|usd|eur|gbp|inr|€|\$|£)\s*[:=]?\s*([0-9kK,]+(?:\s*(?:eur|usd|aud|gbp|\/year|\/month))?)/i);
  if (fundingMatch) requirements.push(`Compensation / Funding: ${fundingMatch[0]}`);

  if (requirements.length === 0) {
    requirements.push('Review post content for direct application requirements & instructions.');
  }

  return {
    category: isScholarship ? 'SCHOLARSHIP' : (isJob ? 'JOB' : 'OPPORTUNITY'),
    isRemote,
    extractedEmails: [...new Set(emails)],
    extractedPhones: [...new Set(phones)],
    extractedLinks: [...new Set(links)],
    deadline: deadlineMatch ? deadlineMatch[1] : null,
    whatsNeeded: requirements,
    cleanSnippet: clean.slice(0, 400)
  };
}

/**
 * Phase 2: Recruiter & Supervisor Feed Post Search
 * Scrapes opportunities posted by recruiters, university supervisors, and funded labs.
 */
/**
 * Phase 2: Recruiter & Supervisor Feed Post Search
 * Scrapes opportunities posted by real people (recruiters, lab directors, professors) on LinkedIn posts.
 */
async function crawlLinkedInFeedPostsSERP({ query = '', type = 'all', timeFilter = 'any', maxResults = 15 } = {}) {
  const cleanQ = cleanText(query) || 'Computer Science';
  
  // Construct search terms based on user classification
  let baseQuery = '';
  if (type === 'scholarship') {
    baseQuery = `site:linkedin.com/posts/ ("PhD position" OR "scholarship" OR "postdoc" OR "doctoral" OR "funded PhD") "${cleanQ}"`;
  } else if (type === 'job') {
    baseQuery = `site:linkedin.com/posts/ ("we are hiring" OR "email your resume" OR "DM me" OR "looking for a developer" OR "hiring") "${cleanQ}"`;
  } else {
    baseQuery = `site:linkedin.com/posts/ ("PhD position" OR "we are hiring" OR "scholarship" OR "DM me" OR "postdoc") "${cleanQ}"`;
  }

  // Timeframe qualifier for Google News RSS
  let whenQualifier = '';
  if (timeFilter === '24h') whenQualifier = ' when:1d';
  else if (timeFilter === 'week' || timeFilter === '7d') whenQualifier = ' when:7d';
  else if (timeFilter === 'month' || timeFilter === '30d') whenQualifier = ' when:30d';

  const fullQuery = `${baseQuery}${whenQualifier}`;
  const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(fullQuery)}&hl=en-US&gl=US&ceid=US:en`;

  const posts = [];

  try {
    const response = await axios.get(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data, { xmlMode: true });

    $('item').each((_, el) => {
      if (posts.length >= maxResults) return;

      const rawTitle = cleanText($(el).find('title').text());
      const pubDate = cleanText($(el).find('pubDate').text());

      if (!rawTitle) return;

      // Extract raw post content (stripping ' - LinkedIn' ending)
      const postContent = rawTitle.replace(/\s*-\s*LinkedIn\s*$/i, '').trim();

      // Extract metadata (contact emails, phones, deadline, requirements)
      const metadata = parseOpportunityPost(postContent);

      // Extract high-probability author or organization
      const authorMatch = postContent.match(/(?:at|by|from)\s+([A-Z][a-zA-Z\s&]{2,35})/);
      const author = authorMatch ? authorMatch[1].trim() : (metadata.category === 'SCHOLARSHIP' ? 'Lab Supervisor / University PI' : 'Hiring Recruiter / Member');

      // Build direct LinkedIn search URL that locates this exact post on LinkedIn
      const searchKeywords = postContent
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .slice(0, 8)
        .join(' ');

      const directLinkedInPostUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(searchKeywords)}&sortBy=%22date_posted%22`;

      // Human readable relative or formatted date
      let formattedDate = 'Recently Posted';
      if (pubDate) {
        try {
          const d = new Date(pubDate);
          if (!isNaN(d.getTime())) {
            formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }
        } catch (e) {}
      }

      posts.push({
        source: 'linkedin_user_posts',
        title: postContent.length > 100 ? `${postContent.substring(0, 97)}...` : postContent,
        fullContent: postContent,
        url: directLinkedInPostUrl,
        author,
        discoveredAt: new Date().toISOString(),
        postedTime: formattedDate,
        rawPubDate: pubDate,
        metadata
      });
    });
  } catch (error) {
    console.error('LinkedIn User Posts crawl error:', error.message);
  }

  // If feed yielded fewer than expected, fall back to general post query without when qualifier
  if (posts.length === 0 && whenQualifier) {
    return crawlLinkedInFeedPostsSERP({ query, type, timeFilter: 'any', maxResults });
  }

  return posts;
}

module.exports = {
  fetchFormalJobs,
  fetchJobDetails,
  parseOpportunityPost,
  crawlLinkedInFeedPostsSERP
};
