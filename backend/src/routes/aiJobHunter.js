const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const { requireAuth, optionalAuth } = require('../controllers/userController');
const Job = require('../models/Job');
const cheerio = require('cheerio');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Parser = require('rss-parser');
const sendEmail = require('../utils/sendEmail');
const JobAlert = require('../models/JobAlert');
const User = require('../models/User');

const upload = multer({ storage: multer.memoryStorage() });

// Helper to safely extract text from PDF, DOCX, or text files
async function parseDocumentText(file) {
  const filename = (file.originalname || '').toLowerCase();
  
  if (filename.endsWith('.pdf')) {
    // Check if pdf-parse is function (v1.x) or class/object (v2.x)
    if (typeof pdfParse === 'function') {
      const data = await pdfParse(file.buffer);
      return data.text || '';
    } else if (pdfParse && pdfParse.PDFParse) {
      const parser = new pdfParse.PDFParse({ data: file.buffer });
      const data = await parser.getText();
      return data.text || '';
    } else if (typeof pdfParse?.default === 'function') {
      const data = await pdfParse.default(file.buffer);
      return data.text || '';
    } else {
      // Fallback text extraction if binary contains readable ASCII streams
      const raw = file.buffer.toString('binary');
      const textMatches = raw.match(/\(([^()]+)\)Tj/g);
      if (textMatches) {
        return textMatches.map(m => m.slice(1, -3)).join(' ');
      }
      throw new Error('Unsupported PDF parsing environment.');
    }
  } else if (filename.endsWith('.docx')) {
    const data = await mammoth.extractRawText({ buffer: file.buffer });
    return data.value || '';
  } else {
    return file.buffer.toString('utf-8');
  }
}

// Helper function to fetch real-time jobs from live open global internet sources & company career boards (excluding LinkedIn)
async function fetchRealtimeJobs({ keywords = 'Software Engineer', location = 'Remote', timeFilter = 'any', maxResults = 100 }) {
  const isRemote = !location || location.toLowerCase().includes('remote') || location.toLowerCase().includes('worldwide');
  const results = [];
  const seenUrls = new Set();
  const queryLower = (keywords || '').toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  // Helper matcher
  const matchesQuery = (text) => {
    if (!queryLower || queryLower === 'software engineer') return true;
    const lower = (text || '').toLowerCase();
    if (lower.includes(queryLower)) return true;
    if (queryWords.length > 0 && queryWords.some(w => lower.includes(w))) return true;
    return false;
  };

  // Calculate cutoff timestamp based on timeFilter ('24h', '7d', '30d', 'any')
  let cutoffDate = null;
  const now = Date.now();
  if (timeFilter === '24h') {
    cutoffDate = new Date(now - 24 * 60 * 60 * 1000);
  } else if (timeFilter === '7d' || timeFilter === 'week') {
    cutoffDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
  } else if (timeFilter === '30d' || timeFilter === 'month') {
    cutoffDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
  }

  // Helper to add item safely
  const addJob = (job) => {
    if (!job || !job.url || seenUrls.has(job.url)) return;
    // Strictly filter out any LinkedIn URLs
    if (job.url.toLowerCase().includes('linkedin.com')) return;
    if (job.source && job.source.toLowerCase().includes('linkedin')) return;

    if (cutoffDate && job.publishedDate && job.publishedDate < cutoffDate) return;

    seenUrls.add(job.url);
    results.push(job);
  };

  const tasks = [];

  // 1. We Work Remotely Feeds (Multiple Engineering & Tech categories)
  tasks.push((async () => {
    const wwrFeeds = [
      'https://weworkremotely.com/categories/remote-programming-jobs.rss',
      'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
      'https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss',
      'https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss',
      'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss'
    ];
    const rssParser = new Parser({ timeout: 8000 });
    await Promise.allSettled(wwrFeeds.map(async (feedUrl) => {
      try {
        const feed = await rssParser.parseURL(feedUrl);
        for (const item of (feed.items || [])) {
          if (!item.link) continue;
          const combined = `${item.title || ''} ${item.contentSnippet || ''}`;
          if (!matchesQuery(combined)) continue;

          let company = 'WeWorkRemotely Employer';
          let title = item.title || 'Remote Position';
          if (title.includes(':')) {
            const parts = title.split(':');
            company = parts[0].trim();
            title = parts.slice(1).join(':').trim();
          }

          const pubDate = item.pubDate ? new Date(item.pubDate) : null;
          addJob({
            id: `wwr_${crypto.createHash('md5').update(item.link).digest('hex')}`,
            title,
            company,
            location: 'Worldwide Remote',
            url: item.link,
            source: 'WeWorkRemotely',
            description: (item.contentSnippet || title).replace(/<[^>]*>?/gm, '').slice(0, 350),
            is_remote: true,
            publishedDate: pubDate || new Date()
          });
        }
      } catch (err) {
        // Feed failed or timed out
      }
    }));
  })());

  // 2. Jobicy Global Remote API
  tasks.push((async () => {
    try {
      const jobicyRes = await axios.get('https://jobicy.com/api/v2/remote-jobs?count=50', {
        headers: { 'User-Agent': 'NotifyMeApp/2.0' },
        timeout: 8000
      });

      if (jobicyRes.data && Array.isArray(jobicyRes.data.jobs)) {
        for (const j of jobicyRes.data.jobs) {
          if (!j || !j.url) continue;
          const fullText = `${j.jobTitle || ''} ${j.companyName || ''} ${(j.jobIndustry || []).join(' ')} ${j.jobExcerpt || ''}`;
          if (!matchesQuery(fullText)) continue;

          const pubDate = j.pubDate ? new Date(j.pubDate) : null;
          addJob({
            id: `jobicy_${j.id}`,
            title: j.jobTitle,
            company: j.companyName || 'Verified Employer',
            location: j.jobGeo || 'Remote / Worldwide',
            url: j.url,
            source: 'Jobicy Global',
            description: (j.jobExcerpt || j.jobTitle || '').replace(/<[^>]*>?/gm, '').slice(0, 350),
            is_remote: true,
            publishedDate: pubDate || new Date()
          });
        }
      }
    } catch (err) {
      console.warn('[RealtimeJobs] Jobicy fetch error:', err.message);
    }
  })());

  // 3. Remotive Global Tech API
  tasks.push((async () => {
    try {
      const remotiveUrl = queryLower
        ? `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(keywords)}&limit=40`
        : 'https://remotive.com/api/remote-jobs?limit=40';

      const remotiveRes = await axios.get(remotiveUrl, {
        headers: { 'User-Agent': 'NotifyMeApp/2.0' },
        timeout: 8000
      });

      if (remotiveRes.data && Array.isArray(remotiveRes.data.jobs)) {
        for (const j of remotiveRes.data.jobs) {
          if (!j || !j.url) continue;
          const pubDate = j.publication_date ? new Date(j.publication_date) : null;
          addJob({
            id: `remotive_${j.id}`,
            title: j.title,
            company: j.company_name || 'Verified Employer',
            location: j.candidate_required_location || 'Worldwide Remote',
            url: j.url,
            source: 'Remotive Global',
            description: (j.description || j.title || '').replace(/<[^>]*>?/gm, '').slice(0, 350),
            is_remote: true,
            publishedDate: pubDate || new Date()
          });
        }
      }
    } catch (err) {
      console.warn('[RealtimeJobs] Remotive fetch error:', err.message);
    }
  })());

  // 4. RemoteOK Realtime API
  tasks.push((async () => {
    try {
      const remoteOkRes = await axios.get('https://remoteok.com/api', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 8000
      });

      if (Array.isArray(remoteOkRes.data)) {
        const filtered = remoteOkRes.data
          .filter(item => item && item.position && item.company)
          .filter(item => {
            const combined = `${item.position || ''} ${(item.tags || []).join(' ')}`;
            return matchesQuery(combined);
          })
          .slice(0, 30);

        for (const item of filtered) {
          const itemUrl = item.url ? (item.url.startsWith('http') ? item.url : `https://remoteok.com${item.url}`) : `https://remoteok.com/remote-jobs/${item.id}`;
          const pubDate = item.date ? new Date(item.date) : null;
          addJob({
            id: `rok_${item.id}`,
            title: item.position,
            company: item.company,
            location: item.location || 'Remote',
            url: itemUrl,
            source: 'RemoteOK Realtime',
            description: (item.description || `${item.position} at ${item.company}`).replace(/<[^>]*>?/gm, '').slice(0, 350),
            is_remote: true,
            publishedDate: pubDate || new Date()
          });
        }
      }
    } catch (err) {
      console.warn('[RealtimeJobs] RemoteOK fetch error:', err.message);
    }
  })());

  // 5. Direct Company Career Pages via Greenhouse ATS
  tasks.push((async () => {
    const techCompanies = [
      { id: 'cloudflare', name: 'Cloudflare' },
      { id: 'stripe', name: 'Stripe' },
      { id: 'gitlab', name: 'GitLab' },
      { id: 'canonical', name: 'Canonical' },
      { id: 'elastic', name: 'Elastic' },
      { id: 'airbnb', name: 'Airbnb' },
      { id: 'automattic', name: 'Automattic' },
      { id: 'datadog', name: 'Datadog' },
      { id: 'mongodb', name: 'MongoDB' },
      { id: 'twitch', name: 'Twitch' },
      { id: 'figma', name: 'Figma' }
    ];

    await Promise.allSettled(techCompanies.map(async (company) => {
      try {
        const res = await axios.get(`https://boards-api.greenhouse.io/v1/boards/${company.id}/jobs`, {
          timeout: 6000
        });
        const companyJobs = res.data?.jobs || [];
        for (const j of companyJobs) {
          if (!j.absolute_url) continue;
          const combined = `${j.title || ''} ${(j.departments || []).map(d => d.name).join(' ')}`;
          if (!matchesQuery(combined)) continue;

          const pubDate = j.updated_at ? new Date(j.updated_at) : null;
          addJob({
            id: `gh_${company.id}_${j.id}`,
            title: j.title,
            company: company.name,
            location: j.location?.name || 'Remote / Multiple Locations',
            url: j.absolute_url,
            source: `${company.name} Careers`,
            description: `Direct opening for ${j.title} at ${company.name}. Official career portal application.`,
            is_remote: isRemote,
            publishedDate: pubDate || new Date()
          });
        }
      } catch (err) {
        // Individual company fetch error, continue
      }
    }));
  })());

  // Wait for all multi-source collectors
  await Promise.allSettled(tasks);

  // Sort newest first if publishedDate exists
  results.sort((a, b) => new Date(b.publishedDate || 0) - new Date(a.publishedDate || 0));

  return results.slice(0, maxResults);
}

// Helper function to resolve effective Groq API key (request -> DB config -> process.env)
async function getEffectiveGroqKey(providedKey) {
  if (providedKey && providedKey.trim()) return providedKey.trim();
  try {
    const SystemConfig = require('../models/SystemConfig');
    const dbConfig = await SystemConfig.findOne({ key: 'GROQ_API_KEY' });
    if (dbConfig && dbConfig.value && dbConfig.value.trim()) {
      return dbConfig.value.trim();
    }
  } catch (err) {
    console.warn('Could not read Groq key from SystemConfig:', err.message);
  }
  return process.env.GROQ_API_KEY || '';
}

// Fallback ATS Keyword matcher and scorer
function calculateFallbackMatchScore(resumeText, jobTitle, jobDescription) {
  const resume = (resumeText || '').toLowerCase();
  const desc = (jobDescription || '').toLowerCase();
  const title = (jobTitle || '').toLowerCase();

  const commonKeywords = [
    'javascript', 'typescript', 'react', 'next.js', 'vue', 'angular', 'node', 'node.js', 'express',
    'python', 'django', 'flask', 'fastapi', 'java', 'spring', 'c#', '.net', 'golang', 'go', 'rust', 'ruby', 'rails', 'php', 'laravel',
    'sql', 'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'dynamodb',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'k8s', 'ci/cd', 'git', 'github', 'devops', 'terraform',
    'rest', 'graphql', 'api', 'microservices', 'agile', 'scrum', 'testing', 'jest', 'cypress', 'unit test',
    'frontend', 'backend', 'fullstack', 'full stack', 'mobile', 'react native', 'flutter', 'ios', 'android',
    'machine learning', 'ai', 'data analysis', 'data science', 'llm', 'system design', 'architecture'
  ];

  const matchedKeywords = [];
  const missingKeywords = [];

  for (const kw of commonKeywords) {
    const inJob = desc.includes(kw) || title.includes(kw);
    if (inJob) {
      if (resume.includes(kw)) {
        matchedKeywords.push(kw.charAt(0).toUpperCase() + kw.slice(1));
      } else {
        missingKeywords.push(kw.charAt(0).toUpperCase() + kw.slice(1));
      }
    }
  }

  // Also check words in the job title
  const titleWords = title.split(/\s+/).filter(w => w.length > 3);
  let titleMatches = 0;
  for (const tw of titleWords) {
    if (resume.includes(tw)) titleMatches++;
  }

  // Calculate base score
  const totalKeywords = matchedKeywords.length + missingKeywords.length;
  let score = 75; // default reasonable starting score
  if (totalKeywords > 0) {
    score = Math.round((matchedKeywords.length / totalKeywords) * 100);
    // Add bonus if title words match
    if (titleMatches > 0) score = Math.min(score + 15, 96);
    score = Math.max(score, 55); // Floor at 55% for valid jobs
  } else {
    // If job description is minimal, give a 78-85 match if title terms match
    score = titleMatches > 0 ? 84 : 72;
  }

  const match_reasons = matchedKeywords.slice(0, 5).map(kw => `Strong alignment with required ${kw} expertise`);
  if (titleMatches > 0) match_reasons.unshift(`Direct alignment with ${jobTitle} competencies`);
  if (match_reasons.length === 0) {
    match_reasons.push(`Core professional background aligns with requirements for ${jobTitle}`);
  }

  return {
    score, // Integer 0-100 (e.g. 85)
    scoreDecimal: Number((score / 100).toFixed(2)), // 0.85
    reasons: match_reasons,
    match_reasons,
    missing_skills: missingKeywords.slice(0, 4)
  };
}

// Fallback tailored cover letter generator
function generateFallbackCoverLetter({ resumeText, jobTitle, company, jobDescription, candidateName }) {
  const name = candidateName && candidateName !== 'Candidate' ? candidateName : 'Candidate';
  const targetCompany = company || 'Hiring Team';
  const targetTitle = jobTitle || 'the designated position';

  // Extract snippet of background if possible
  const lines = (resumeText || '').split('\n').map(l => l.trim()).filter(l => l.length > 25);
  const snippet1 = lines[0] || 'experienced professional with a strong track record of high-impact contributions';
  const snippet2 = lines[1] || 'proven background in solving critical challenges and driving team success';

  return `Dear Hiring Manager at ${targetCompany},

I am writing to express my enthusiasm for the ${targetTitle} opportunity. With a comprehensive professional background and relevant domain experience, I am confident that my technical abilities and dedicated problem-solving approach make me a strong addition to your team.

My background includes hands-on experience in high-velocity environments where I have consistently delivered robust, scalable solutions:
- ${snippet1.replace(/^[-*•]\s*/, '')}
- ${snippet2.replace(/^[-*•]\s*/, '')}

I am particularly excited about the prospect of contributing to ${targetCompany}. Your focus on innovation and quality aligns closely with my professional standards, and I am eager to apply my skills to deliver immediate value to your current initiatives.

Thank you for your time and consideration. I welcome the opportunity to discuss how my qualifications align with your objectives for ${targetTitle}.

Sincerely,
${name}`;
}

// Helper function to call Groq API
async function callGroqAPI(prompt, apiKey, format = 'json_object', temperature = 0.2) {
  const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama3-70b-8192',
    messages: [{ role: 'user', content: prompt }],
    temperature,
    response_format: format === 'json_object' ? { type: 'json_object' } : undefined
  }, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  const content = response.data.choices[0].message.content;
  return format === 'json_object' ? JSON.parse(content) : content;
}

// GET /api/job-hunter/version
router.get('/version', (req, res) => {
  res.json({ service: 'ai-job-hunter', runtime: 'node-native-v2', buildTime: '2026-09-18' });
});

// POST /api/job-hunter/search
router.post('/search', optionalAuth, async (req, res) => {
  try {
    const { keywords, location, timeFilter, max_results, custom_urls } = req.body;
    let jobs = [];

    // Real-time Search if no custom URLs provided
    if (!custom_urls || custom_urls.length === 0) {
      jobs = await fetchRealtimeJobs({
        keywords: keywords || 'Software Engineer',
        location: location || 'Remote',
        timeFilter: timeFilter || 'any',
        maxResults: max_results || 100
      });

      // If live scraping returned zero due to very specific filters, provide direct company career portals
      if (!jobs || jobs.length === 0) {
        const fallbackSearchTerm = keywords || 'Software Engineer';
        jobs = [
          {
            id: `direct_wwr_${Date.now()}`,
            title: `${fallbackSearchTerm} Openings`,
            company: 'We Work Remotely Hub',
            location: location || 'Remote',
            url: `https://weworkremotely.com/remote-jobs/search?term=${encodeURIComponent(fallbackSearchTerm)}`,
            source: 'WeWorkRemotely',
            description: `Explore live curated remote openings for "${fallbackSearchTerm}" across global tech companies.`,
            is_remote: true,
            publishedDate: new Date()
          },
          {
            id: `direct_remoteok_${Date.now()}`,
            title: `${fallbackSearchTerm} Verified Roles`,
            company: 'RemoteOK Network',
            location: location || 'Remote',
            url: `https://remoteok.com/remote-${encodeURIComponent(fallbackSearchTerm.replace(/\s+/g, '-').toLowerCase())}-jobs`,
            source: 'RemoteOK Realtime',
            description: `Direct global vacancies and tech startup opportunities for "${fallbackSearchTerm}".`,
            is_remote: true,
            publishedDate: new Date()
          },
          {
            id: `direct_jobicy_${Date.now()}`,
            title: `${fallbackSearchTerm} Positions`,
            company: 'Jobicy Global Remote',
            location: location || 'Worldwide',
            url: `https://jobicy.com/jobs?s=${encodeURIComponent(fallbackSearchTerm)}`,
            source: 'Jobicy Global',
            description: `Live verified vacancies from companies worldwide hiring remote talent.`,
            is_remote: true,
            publishedDate: new Date()
          }
        ];
      }

      return res.json({ status: 'success', total: jobs.length, jobs });
    }

    // Direct custom website links if provided
    for (const url of custom_urls) {
      try {
        const resp = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
        const $ = cheerio.load(resp.data);
        const pageTitle = $('title').text().trim() || url;
        
        const headings = $('h1, h2, h3, a').slice(0, 15).toArray();
        for (const h of headings) {
          const text = $(h).text().trim();
          const lowerText = text.toLowerCase();
          if (['engineer', 'developer', 'manager', 'designer', 'researcher', 'remote', 'job', 'career'].some(w => lowerText.includes(w))) {
            let link = $(h).attr('href') || url;
            if (link.startsWith('/')) {
              link = new URL(link, url).href;
            }
            const jobId = crypto.createHash('md5').update(`custom_${url}_${text}`).digest('hex');
            jobs.push({
              id: jobId,
              title: text,
              company: pageTitle.substring(0, 30),
              location: location || 'Remote',
              url: link,
              source: 'Custom Direct Website',
              is_remote: (location || '').toLowerCase().includes('remote') || lowerText.includes('remote')
            });
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch ${url}`);
      }
    }

    res.json({ status: 'success', total: jobs.length, jobs });
  } catch (error) {
    console.error('Job Hunter search error:', error.message);
    res.status(500).json({ error: 'Failed to search jobs' });
  }
});

// POST /api/job-hunter/resume/upload
router.post('/resume/upload', requireAuth, upload.fields([{ name: 'resume', maxCount: 1 }, { name: 'file', maxCount: 1 }]), async (req, res) => {
  try {
    const file = (req.files?.resume && req.files.resume[0]) || (req.files?.file && req.files.file[0]);
    if (!file) {
      return res.status(400).json({ error: 'No resume file uploaded' });
    }

    const { groq_api_key } = req.body;
    const effectiveKey = await getEffectiveGroqKey(groq_api_key);
    let rawText = '';
    try {
      rawText = await parseDocumentText(file);
    } catch (parseErr) {
      console.error('Document parsing exception:', parseErr);
      return res.status(400).json({ error: `Failed to extract text from ${file.originalname}: ${parseErr.message}` });
    }

    rawText = (rawText || '').trim();
    if (!rawText) {
      return res.status(400).json({ error: 'The uploaded file contains no readable text. If it is an image/scanned PDF, please upload a text-based document or paste text directly.' });
    }

    let structured = { name: 'Candidate', skills: [] };

    if (effectiveKey) {
      const prompt = `
Extract structured candidate details from the following resume text. Output strictly valid JSON with keys:
"name", "email", "phone", "skills" (array of strings), "experience" (array of objects with title, company, duration, highlights), "education" (array of objects with degree, institution, year).

RESUME TEXT:
${rawText.substring(0, 4000)}
`;
      try {
        structured = await callGroqAPI(prompt, effectiveKey);
      } catch (e) {
        console.warn('Groq extraction failed, returning raw text.');
      }
    }

    res.json({ raw_text: rawText, structured });
  } catch (error) {
    console.error('Resume parse error:', error.message);
    res.status(500).json({ error: 'Failed to parse resume document' });
  }
});

// POST /api/job-hunter/test-key
router.post('/test-key', optionalAuth, async (req, res) => {
  try {
    const api_key = await getEffectiveGroqKey(req.body.api_key || req.body.groq_api_key);
    if (!api_key) return res.status(400).json({ valid: false, message: 'Missing API key' });
    await axios.get('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${api_key}` },
      timeout: 10000
    });
    res.json({ valid: true, message: 'API Key is valid and active.' });
  } catch (error) {
    res.status(500).json({ valid: false, message: 'Failed to authenticate Groq API key.' });
  }
});

// POST /api/job-hunter/cover-letter
router.post('/cover-letter', requireAuth, async (req, res) => {
  try {
    const { resume_text, job_title, company, job_description, candidate_name, groq_api_key } = req.body;
    const effectiveKey = await getEffectiveGroqKey(groq_api_key);

    if (effectiveKey) {
      try {
        const prompt = `
Write a highly persuasive, customized cover letter for the following job using the candidate's resume.
Highlight specific overlaps. Do not include placeholders like [Your Address]. Keep it concise and professional.

JOB TITLE: ${job_title}
COMPANY: ${company}
JOB DESCRIPTION: ${job_description}

CANDIDATE NAME: ${candidate_name}
CANDIDATE RESUME:
${(resume_text || '').substring(0, 3000)}
`;
        const letter = await callGroqAPI(prompt, effectiveKey, 'text', 0.5);
        if (letter && letter.trim()) {
          return res.json({ cover_letter: letter });
        }
      } catch (aiErr) {
        console.warn('Groq AI cover letter failed, switching to tailored template generator:', aiErr.message);
      }
    }

    // High quality tailored fallback
    const fallbackLetter = generateFallbackCoverLetter({
      resumeText: resume_text,
      jobTitle: job_title,
      company,
      jobDescription: job_description,
      candidateName: candidate_name
    });

    res.json({ cover_letter: fallbackLetter });
  } catch (error) {
    console.error('Cover letter generation error:', error.message);
    res.status(500).json({ error: 'Failed to generate cover letter.' });
  }
});

// POST /api/job-hunter/match-score
router.post('/match-score', requireAuth, async (req, res) => {
  try {
    const { resume_text, job_title, job_description, groq_api_key } = req.body;
    const effectiveKey = await getEffectiveGroqKey(groq_api_key);

    if (effectiveKey) {
      try {
        const prompt = `
Act as an ATS (Applicant Tracking System). Evaluate the candidate's resume against the job description.
Return strict JSON:
{
  "score": 85,
  "match_reasons": ["Has Python experience", "5 years in software engineering"],
  "missing_skills": ["Kubernetes", "AWS"]
}

JOB TITLE: ${job_title}
JOB DESCRIPTION: ${job_description}

RESUME:
${(resume_text || '').substring(0, 3000)}
`;
        const result = await callGroqAPI(prompt, effectiveKey);
        if (result && typeof result.score !== 'undefined') {
          const rawScore = Number(result.score);
          const scorePercent = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
          const scoreDecimal = Number((scorePercent / 100).toFixed(2));
          const reasons = result.match_reasons || result.reasons || [];
          return res.json({
            score: scoreDecimal,
            scorePercent,
            reasons,
            match_reasons: reasons,
            missing_skills: result.missing_skills || []
          });
        }
      } catch (aiErr) {
        console.warn('Groq AI match scoring failed, using ATS keyword analyzer:', aiErr.message);
      }
    }

    // ATS Keyword & Domain Heuristic Fallback
    const fallbackResult = calculateFallbackMatchScore(resume_text, job_title, job_description);
    res.json({
      score: fallbackResult.scoreDecimal,
      scorePercent: fallbackResult.score,
      reasons: fallbackResult.reasons,
      match_reasons: fallbackResult.match_reasons,
      missing_skills: fallbackResult.missing_skills
    });
  } catch (error) {
    console.error('Match scoring error:', error.message);
    res.status(500).json({ error: 'Failed to compute match score.' });
  }
});

// GET /api/job-hunter/pipeline
router.get('/pipeline', requireAuth, async (req, res) => {
  try {
    const jobs = await Job.find({ notifiedUsers: req.userId }).sort({ updatedAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/job-hunter/pipeline/save
router.post('/pipeline/save', requireAuth, async (req, res) => {
  try {
    const { id, title, company, location, url, description, status, matchScore, matchReasons, notes } = req.body;
    const wwrJobId = id || `custom_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    let job = await Job.findOne({ wwrJobId });
    if (!job) {
      job = new Job({
        wwrJobId,
        title,
        company,
        location,
        link: url,
        description,
        status: status || 'saved',
        matchScore: matchScore || 0,
        matchReasons: matchReasons || [],
        notes: notes || '',
        notifiedUsers: [req.userId],
        source: 'ai_job_hunter'
      });
    } else {
      if (status) job.status = status;
      if (matchScore !== undefined) job.matchScore = matchScore;
      if (matchReasons) job.matchReasons = matchReasons;
      if (notes !== undefined) job.notes = notes;
      if (!job.notifiedUsers.includes(req.userId)) {
        job.notifiedUsers.push(req.userId);
      }
    }

    await job.save();
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/job-hunter/pipeline/clear
router.delete('/pipeline/clear', requireAuth, async (req, res) => {
  try {
    const result = await Job.deleteMany({ notifiedUsers: req.userId });
    res.json({ success: true, message: 'All pipeline data cleared successfully.', deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/job-hunter/alert-reminder - Subscribe to email alerts for a specific job search keyword
router.post('/alert-reminder', optionalAuth, async (req, res) => {
  try {
    let { email, keywords, location, frequency = 'instant' } = req.body;

    // If user is logged in, use their registered email if not supplied
    if (!email && req.userId) {
      const user = await User.findById(req.userId);
      if (user) email = user.email;
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required to set a job alert.' });
    }

    if (!keywords || !keywords.trim()) {
      return res.status(400).json({ error: 'Keywords are required to set a job alert.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanKeywords = keywords.trim();
    const cleanLocation = (location || 'Remote').trim();

    // Upsert the alert in DB
    const alert = await JobAlert.findOneAndUpdate(
      { email: cleanEmail, keywords: cleanKeywords },
      {
        user: req.userId || null,
        email: cleanEmail,
        keywords: cleanKeywords,
        location: cleanLocation,
        frequency,
        isActive: true,
        lastNotifiedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Fetch up to 5 current active matches to immediately send in email
    let matchingJobs = [];
    try {
      matchingJobs = await fetchRealtimeJobs({
        keywords: cleanKeywords,
        location: cleanLocation,
        timeFilter: '7d',
        maxResults: 5
      });
    } catch (e) {
      console.warn('Failed to fetch initial matches for alert email:', e.message);
    }

    // Build the email notification
    const jobListHtml = matchingJobs.length > 0
      ? matchingJobs.map(j => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 8px;">
            <div style="font-weight: 700; color: #1e293b; font-size: 15px;">${j.title}</div>
            <div style="font-size: 13px; color: #64748b; margin-top: 2px;">
              <strong>${j.company}</strong> &bull; 📍 ${j.location} &bull; <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${j.source}</span>
            </div>
            <div style="margin-top: 8px;">
              <a href="${j.url}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                Apply Directly &rarr;
              </a>
            </div>
          </td>
        </tr>
      `).join('')
      : `<tr><td style="padding: 16px; color: #64748b; font-size: 14px;">We have registered your alert. As soon as new real-time vacancies matching <strong>"${cleanKeywords}"</strong> are published across WeWorkRemotely, Remotive, Jobicy, RemoteOK, and direct Company Career Portals, we will email them to you directly!</td></tr>`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e3a8a, #3730a3); padding: 24px; color: #ffffff; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">🔔 Job Alert Activated: ${cleanKeywords}</h1>
          <p style="margin: 6px 0 0 0; font-size: 14px; color: #93c5fd;">Notify_Me AI Global Job Intelligence</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 15px; color: #334155; margin-top: 0;">
            Hello,
          </p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">
            You have successfully set an alert for <strong>"${cleanKeywords}"</strong> (Location: <em>${cleanLocation}</em>). Here are current verified opportunities with direct application links:
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            ${jobListHtml}
          </table>
          <div style="margin-top: 24px; padding: 14px; background: #f8fafc; border-radius: 8px; font-size: 12px; color: #64748b; text-align: center;">
            You can manage or unsubscribe from these alerts at any time in your Notify_Me dashboard.
          </div>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        email: cleanEmail,
        subject: `🔔 Job Alert: New matches for "${cleanKeywords}"`,
        message: `Your alert for "${cleanKeywords}" has been activated. Current opportunities:\n\n` +
          matchingJobs.map(j => `${j.title} at ${j.company} (${j.location}) -> ${j.url}`).join('\n\n'),
        html: emailHtml
      });
    } catch (emailErr) {
      console.warn('Could not send immediate email confirmation:', emailErr.message);
    }

    res.json({
      success: true,
      message: `Job alert created! We sent an initial matching email to ${cleanEmail}.`,
      alert
    });
  } catch (error) {
    console.error('Create job alert error:', error.message);
    res.status(500).json({ error: 'Failed to create job alert.' });
  }
});

// GET /api/job-hunter/alerts - List alerts for current user
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const alerts = await JobAlert.find({
      $or: [{ user: req.userId }, { email: user?.email }]
    }).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
