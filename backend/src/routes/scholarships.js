const express = require('express');
const router = express.Router();
const { requireAuth } = require('../controllers/userController');
const scholarshipController = require('../controllers/scholarshipController');
const { TARGET_SITES, crawlAllScholarshipSites } = require('../services/scholarshipCrawler');
const Scholarship = require('../models/Scholarship');
const axios = require('axios');

// GET /api/scholarships/crawler/sites - List registered sites in config
router.get('/crawler/sites', (req, res) => {
  res.json({ success: true, sites: TARGET_SITES });
});

// GET /api/scholarships/crawler/live - Crawl registered target sites with normalization & filters
router.get('/crawler/live', requireAuth, async (req, res) => {
  try {
    const { siteId, onlyFullyFunded, excludeExpired, computerScienceOnly, country } = req.query;

    const filters = {
      onlyFullyFunded: onlyFullyFunded === 'true',
      excludeExpired: excludeExpired === 'true',
      computerScienceOnly: computerScienceOnly === 'true',
      targetCountries: country && country !== 'All' ? [country] : []
    };

    const results = await crawlAllScholarshipSites(filters, siteId || 'all');
    res.json({ success: true, count: results.length, opportunities: results });
  } catch (error) {
    console.error('Scholarship crawler live error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to crawl scholarship websites' });
  }
});

// POST /api/scholarships/crawler/save - Save crawled opportunity into database
router.post('/crawler/save', requireAuth, async (req, res) => {
  try {
    const { item } = req.body;
    const scholarship = new Scholarship({
      title: item.title,
      description: `[${item.source}] ${item.benefits?.join(', ') || 'Scholarship Opportunity'}. Location: ${item.matchedCountries?.join(', ') || 'International'}. Deadline: ${item.rawDeadline || 'Check Link'}`,
      link: item.url,
      country: item.matchedCountries?.[0] || 'International',
      categories: [item.source, item.isFullyFunded ? 'Fully Funded' : 'Partially Funded'],
      amount: item.isFullyFunded ? 'Fully Funded (Tuition + Stipend)' : 'Tuition Support',
      deadline: item.deadline ? new Date(item.deadline) : null,
      eligibility: item.benefits?.length ? `Benefits: ${item.benefits.join(', ')}` : 'See application portal',
      level: 'PhD / Postgraduate',
      field: item.isComputerScience ? 'Computer Science & Technology' : 'All Fields',
      createdAt: new Date()
    });

    await scholarship.save();
    res.json({ success: true, saved: scholarship });
  } catch (error) {
    console.error('Save crawled scholarship error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to save scholarship' });
  }
});

// Node.js implementation of analyze-fit using Groq API directly
router.post('/analyze-fit', requireAuth, async (req, res) => {
  try {
    const { scholarship_text, candidate_profile, groq_api_key } = req.body;
    const effectiveApiKey = groq_api_key || process.env.GROQ_API_KEY;
    
    if (!effectiveApiKey) {
      return res.status(400).json({ error: 'Groq API Key is not configured on the server.' });
    }

    const prompt = `
ACT AS A DISTINGUISHED ACADEMIC ADVISOR AND POST-DOC MENTOR.
Evaluate the alignment between the candidate and the PhD scholarship.

Scholarship Details:
${scholarship_text}

Candidate Profile:
${candidate_profile}

RETURN STRICT JSON WITH NO MARKDOWN CODE BLOCKS OR EXTRA TEXT:
{
  "fitScore": 85,
  "fitRationale": "Short paragraph explaining why.",
  "isFullyFunded": true,
  "isPhD": true,
  "isComputerScience": true,
  "missingRequirements": ["List of things they might need"],
  "emailDraft": {
    "salutation": "Dear Professor X,",
    "opening": "Opening line",
    "alignment": "Alignment line",
    "callToAction": "Call to action",
    "fullEmailText": "Full text of the email"
  },
  "researchProposalDraft": {
    "title": "Proposed Title",
    "backgroundAndGap": "Background...",
    "methodology": "Methodology...",
    "expectedContributions": "Contributions..."
  }
}
`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-70b-8192',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    }, {
      headers: {
        'Authorization': `Bearer ${effectiveApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    const content = response.data.choices[0].message.content;
    const parsedData = JSON.parse(content);
    res.json({ analysis: parsedData });
  } catch (error) {
    console.error('Scholarship fit analysis error:', error.message);
    res.status(500).json({ error: 'Failed to evaluate scholarship alignment using Groq' });
  }
});

// Node.js implementation of generate-cold-email using Groq API directly
router.post('/generate-cold-email', requireAuth, async (req, res) => {
  try {
    const { project_title, university_or_lab, pi_name, project_summary, candidate_name, candidate_background, groq_api_key } = req.body;
    const effectiveApiKey = groq_api_key || process.env.GROQ_API_KEY;

    if (!effectiveApiKey) {
      return res.status(400).json({ error: 'Groq API Key is not configured on the server.' });
    }

    const prompt = `
ACT AS A DISTINGUISHED ACADEMIC MENTOR WHO SPECIALIZES IN HELPING TOP RESEARCHERS CONTACT PRINCIPAL INVESTIGATORS (PIs).
Write a personalized, high-converting cold outreach email to a potential PhD supervisor or lab director.

KEY PRINCIPLES:
- 'Research Partner' Framework: Treat the candidate as an intellectually rigorous collaborator, not a generic applicant begging for funding.
- Open with the supervisor's specific research problem space, recent papers, or lab objectives.
- Bridge the candidate's software engineering, systems design, and applied AI strengths into concrete solutions for the lab's technical bottlenecks.
- Keep it concise, respectful of their time, and clear in call-to-action.

DETAILS:
- Project Title / Focus: ${project_title}
- University / Lab: ${university_or_lab}
- Supervisor / PI: ${pi_name}
- Project Summary: ${project_summary}
- Candidate Background: ${candidate_background}
- Candidate Name: ${candidate_name}

RETURN STRICT JSON WITH NO MARKDOWN CODE BLOCKS OR EXTRA TEXT:
{
  "subjectLines": [
    "Subject option 1 (specific and compelling)",
    "Subject option 2 (direct and academic)",
    "Subject option 3 (paper or problem-space focused)"
  ],
  "emailBody": "Full formatted email body with salutation, body paragraphs, and sign-off ready to copy and send",
  "strategicTips": [
    "Tip 1 (e.g. attach your CV)",
    "Tip 2 (e.g. read their latest paper)",
    "Tip 3 (e.g. follow up in 7 days)"
  ]
}
`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-70b-8192',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    }, {
      headers: {
        'Authorization': `Bearer ${effectiveApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const content = response.data.choices[0].message.content;
    const parsedData = JSON.parse(content);
    res.json(parsedData);
  } catch (error) {
    console.error('Generate cold email error:', error.message);
    res.status(500).json({ error: 'Failed to generate cold email using Groq API' });
  }
});

// Protected routes
router.get('/', requireAuth, scholarshipController.getScholarships);
router.get('/calendar', requireAuth, scholarshipController.getScholarshipCalendar);
router.get('/search', scholarshipController.searchScholarshipsRealTime);

// Protected routes
router.get('/raw/:feedId', requireAuth, scholarshipController.getRawScholarshipFeed);

module.exports = router;
