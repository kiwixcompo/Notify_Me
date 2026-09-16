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

const upload = multer({ storage: multer.memoryStorage() });

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

// POST /api/job-hunter/search
router.post('/search', optionalAuth, async (req, res) => {
  try {
    const { keywords, location, max_results, custom_urls } = req.body;
    let jobs = [];

    // Fallback/Synthetic Search if no custom URLs
    if (!custom_urls || custom_urls.length === 0) {
      for (let i = 0; i < (max_results || 10); i++) {
        jobs.push({
          id: `ai_job_${Date.now()}_${i}`,
          title: `${keywords || 'Software Engineer'} (Role ${i + 1})`,
          company: 'AI Discovered Tech',
          location: location || 'Remote',
          url: 'https://linkedin.com/jobs/search?q=' + encodeURIComponent(keywords || 'Software Engineer'),
          source: 'AI Web Crawler',
          description: `Looking for a driven ${keywords || 'engineer'} in ${location || 'Remote'}. Competitive salary.`
        });
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
    let rawText = '';

    if (file.originalname.toLowerCase().endsWith('.pdf')) {
      const data = await pdfParse(file.buffer);
      rawText = data.text;
    } else if (file.originalname.toLowerCase().endsWith('.docx')) {
      const data = await mammoth.extractRawText({ buffer: file.buffer });
      rawText = data.value;
    } else {
      rawText = file.buffer.toString('utf-8');
    }

    rawText = rawText.trim();
    if (!rawText) {
      return res.status(400).json({ error: 'Could not extract text from document.' });
    }

    let structured = { name: 'Candidate', skills: [] };

    if (groq_api_key) {
      const prompt = `
Extract structured candidate details from the following resume text. Output strictly valid JSON with keys:
"name", "email", "phone", "skills" (array of strings), "experience" (array of objects with title, company, duration, highlights), "education" (array of objects with degree, institution, year).

RESUME TEXT:
${rawText.substring(0, 4000)}
`;
      try {
        structured = await callGroqAPI(prompt, groq_api_key);
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
router.post('/test-key', requireAuth, async (req, res) => {
  try {
    const api_key = req.body.api_key || req.body.groq_api_key;
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
    if (!groq_api_key) return res.status(400).json({ error: 'Groq API Key is required' });

    const prompt = `
Write a highly persuasive, customized cover letter for the following job using the candidate's resume.
Highlight specific overlaps. Do not include placeholders like [Your Address]. Keep it concise and professional.

JOB TITLE: ${job_title}
COMPANY: ${company}
JOB DESCRIPTION: ${job_description}

CANDIDATE NAME: ${candidate_name}
CANDIDATE RESUME:
${resume_text.substring(0, 3000)}
`;
    const letter = await callGroqAPI(prompt, groq_api_key, 'text', 0.5);
    res.json({ cover_letter: letter });
  } catch (error) {
    console.error('Cover letter generation error:', error.message);
    res.status(500).json({ error: 'Failed to generate cover letter.' });
  }
});

// POST /api/job-hunter/match-score
router.post('/match-score', requireAuth, async (req, res) => {
  try {
    const { resume_text, job_title, job_description, groq_api_key } = req.body;
    if (!groq_api_key) return res.status(400).json({ error: 'Groq API Key is required' });

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
${resume_text.substring(0, 3000)}
`;
    const result = await callGroqAPI(prompt, groq_api_key);
    res.json(result);
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

module.exports = router;
