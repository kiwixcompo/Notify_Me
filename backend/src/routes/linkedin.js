const express = require('express');
const router = express.Router();
const { requireAuth } = require('../controllers/userController');
const {
  fetchFormalJobs,
  fetchJobDetails,
  crawlLinkedInFeedPostsSERP,
  parseOpportunityPost
} = require('../services/linkedinCrawler');
const Job = require('../models/Job');
const Scholarship = require('../models/Scholarship');

// GET /api/linkedin/jobs - Phase 1: Rapid Guest API for remote jobs
router.get('/jobs', requireAuth, async (req, res) => {
  try {
    const { keywords, location, isRemote, offset, timeFilter } = req.query;
    const jobs = await fetchFormalJobs({
      keywords: keywords || 'Full Stack Developer',
      location: location || 'Worldwide',
      isRemote: isRemote === undefined ? true : isRemote === 'true',
      offset: parseInt(offset) || 0,
      timeFilter: timeFilter || 'r604800'
    });

    res.json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    console.error('LinkedIn Jobs error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to crawl LinkedIn Jobs' });
  }
});

// GET /api/linkedin/job/:id - Full job description & criteria
router.get('/job/:id', requireAuth, async (req, res) => {
  try {
    const details = await fetchJobDetails(req.params.id);
    if (!details) {
      return res.status(404).json({ error: 'Job details could not be retrieved.' });
    }
    res.json({ success: true, details });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/linkedin/posts - Phase 2: Recruiter shouts & Supervisor scholarships (SERP / public posts)
router.get('/posts', requireAuth, async (req, res) => {
  try {
    const { query, type, maxResults } = req.query;
    const posts = await crawlLinkedInFeedPostsSERP({
      query: query || '',
      type: type || 'all',
      maxResults: parseInt(maxResults) || 15
    });

    res.json({ success: true, count: posts.length, posts });
  } catch (error) {
    console.error('LinkedIn Feed Posts error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to crawl LinkedIn Posts' });
  }
});

// GET /api/linkedin/x-posts - Crawl opportunities on X (Twitter)
router.get('/x-posts', requireAuth, async (req, res) => {
  try {
    const { crawlXOpportunities } = require('../services/socialCrawler');
    const { query, type, timeFilter, maxResults, authToken, ct0 } = req.query;
    const posts = await crawlXOpportunities({
      query: query || '',
      type: type || 'all',
      timeFilter: timeFilter || 'any',
      maxResults: parseInt(maxResults) || 15,
      authToken,
      ct0
    });
    res.json({ success: true, count: posts.length, posts });
  } catch (error) {
    console.error('X Opportunities crawl error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to crawl X posts' });
  }
});

// GET /api/linkedin/fb-posts - Crawl opportunities on Facebook
router.get('/fb-posts', requireAuth, async (req, res) => {
  try {
    const { crawlFacebookOpportunities } = require('../services/socialCrawler');
    const { query, type, timeFilter, targetGroupUrl, maxResults, cUser, xsToken } = req.query;
    const posts = await crawlFacebookOpportunities({
      query: query || '',
      type: type || 'all',
      timeFilter: timeFilter || 'any',
      targetGroupUrl: targetGroupUrl || null,
      maxResults: parseInt(maxResults) || 15,
      cUser,
      xsToken
    });
    res.json({ success: true, count: posts.length, posts });
  } catch (error) {
    console.error('Facebook Opportunities crawl error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to crawl Facebook posts' });
  }
});

// POST /api/linkedin/save-opportunity - Save a crawled item directly to user's jobs or scholarships
router.post('/save-opportunity', requireAuth, async (req, res) => {
  try {
    const { type, item } = req.body;
    
    if (type === 'scholarship') {
      const scholarship = new Scholarship({
        title: item.title,
        description: item.snippet || item.title,
        link: item.url,
        country: 'International',
        categories: ['LinkedIn Crawled', item.metadata?.category || 'Scholarship'],
        eligibility: item.metadata?.extractedEmails?.length ? `Contact: ${item.metadata.extractedEmails.join(', ')}` : 'See LinkedIn post',
        createdAt: new Date()
      });
      await scholarship.save();
      return res.json({ success: true, saved: scholarship, model: 'scholarship' });
    } else {
      const existing = await Job.findOne({ wwrJobId: `li_${item.jobId || Buffer.from(item.url || item.title).toString('base64').slice(0, 16)}` });
      if (existing) {
        return res.json({ success: true, message: 'Already saved in pipeline', saved: existing });
      }

      const job = new Job({
        wwrJobId: `li_${item.jobId || Buffer.from(item.url || item.title).toString('base64').slice(0, 16)}`,
        title: item.title,
        company: item.company || item.author || 'LinkedIn Poster',
        location: item.location || (item.isRemote ? 'Remote' : 'Worldwide'),
        link: item.url,
        description: item.snippet || item.descriptionText || item.title,
        source: item.source || 'linkedin',
        publishedDate: item.postedTime ? new Date(item.postedTime) : new Date(),
        status: 'saved',
        notes: item.metadata?.extractedEmails?.length ? `Direct emails: ${item.metadata.extractedEmails.join(', ')}` : ''
      });
      await job.save();
      return res.json({ success: true, saved: job, model: 'job' });
    }
  } catch (error) {
    console.error('Save opportunity error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to save opportunity' });
  }
});

module.exports = router;
