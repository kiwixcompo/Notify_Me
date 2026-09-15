const express = require('express');
const router = express.Router();
const { requireAuth } = require('../controllers/userController');
const scholarshipController = require('../controllers/scholarshipController');
const { TARGET_SITES, crawlAllScholarshipSites } = require('../services/scholarshipCrawler');
const Scholarship = require('../models/Scholarship');

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

// POST /api/scholarships/analyze-fit - Candidate Alignment, PhD/CS Verification, Benefits, Roadmap & Cold Email
router.post('/analyze-fit', requireAuth, async (req, res) => {
  try {
    const axios = require('axios');
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    const response = await axios.post(`${aiServiceUrl}/scholarships/analyze-fit`, req.body, { timeout: 65000 });
    res.json(response.data);
  } catch (error) {
    console.error('Scholarship fit analysis error:', error.message);
    res.status(500).json({ error: error.response?.data?.error || error.message || 'Failed to evaluate scholarship alignment' });
  }
});

// POST /api/scholarships/generate-cold-email - Standalone PI cold outreach generator
router.post('/generate-cold-email', requireAuth, async (req, res) => {
  try {
    const axios = require('axios');
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    const response = await axios.post(`${aiServiceUrl}/scholarships/generate-cold-email`, req.body, { timeout: 30000 });
    res.json(response.data);
  } catch (error) {
    console.error('Generate cold email error:', error.message);
    res.status(500).json({ error: error.response?.data?.error || error.message || 'Failed to generate cold email' });
  }
});

// Protected routes
router.get('/', requireAuth, scholarshipController.getScholarships);
router.get('/calendar', requireAuth, scholarshipController.getScholarshipCalendar);
router.get('/search', scholarshipController.searchScholarshipsRealTime);

// Protected routes
router.get('/raw/:feedId', requireAuth, scholarshipController.getRawScholarshipFeed);

module.exports = router; 