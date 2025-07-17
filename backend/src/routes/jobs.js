const express = require('express');
const { requireAuth } = require('../controllers/userController');
const { getUserJobs, getJobCalendar, getJobStats } = require('../controllers/jobController');
const router = express.Router();

// GET /api/jobs - Get jobs for a specific date or today
router.get('/', requireAuth, getUserJobs);

// GET /api/jobs/calendar - Get job counts for calendar view
router.get('/calendar', requireAuth, getJobCalendar);

// GET /api/jobs/stats - Get job statistics
router.get('/stats', requireAuth, getJobStats);

// GET /api/jobs/test - Test endpoint to check database and fetch jobs
router.get('/test', requireAuth, async (req, res) => {
  try {
    const Job = require('../models/Job');
    const { fetchJobsFromRSS } = require('../services/rssService');
    const { fetchJobsFromTwitter } = require('../services/twitterService');
    
    // Check current jobs in database
    const totalJobs = await Job.countDocuments({});
    const recentJobs = await Job.find().sort({ firstSeen: -1 }).limit(5);
    
    // Try to fetch new jobs
    let rssJobs = [];
    let twitterJobs = [];
    try {
      rssJobs = await fetchJobsFromRSS();
    } catch (err) {
      console.error('RSS fetch error:', err);
    }
    
    try {
      twitterJobs = await fetchJobsFromTwitter();
    } catch (err) {
      console.error('Twitter fetch error:', err);
    }
    
    res.json({
      totalJobsInDB: totalJobs,
      recentJobs: recentJobs.map(job => ({
        title: job.title,
        publishedDate: job.publishedDate,
        source: job.source,
        firstSeen: job.firstSeen
      })),
      rssJobsFound: rssJobs.length,
      twitterJobsFound: twitterJobs.length,
      rssJobs: rssJobs.slice(0, 3), // Show first 3 RSS jobs
      twitterJobs: twitterJobs.slice(0, 3) // Show first 3 Twitter jobs
    });
  } catch (err) {
    console.error('Test endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/debug - Public debug endpoint (no auth required)
router.get('/debug', async (req, res) => {
  try {
    const Job = require('../models/Job');
    const { fetchJobsFromRSS } = require('../services/rssService');
    
    // Check current jobs in database
    const totalJobs = await Job.countDocuments({});
    const recentJobs = await Job.find().sort({ firstSeen: -1 }).limit(5);
    
    // Try to fetch RSS jobs only (skip Twitter for now)
    let rssJobs = [];
    try {
      rssJobs = await fetchJobsFromRSS();
    } catch (err) {
      console.error('RSS fetch error:', err);
    }
    
    res.json({
      status: 'ok',
      totalJobsInDB: totalJobs,
      recentJobs: recentJobs.map(job => ({
        title: job.title,
        publishedDate: job.publishedDate,
        source: job.source,
        firstSeen: job.firstSeen
      })),
      rssJobsFound: rssJobs.length,
      rssJobs: rssJobs.slice(0, 3), // Show first 3 RSS jobs
      message: 'Database and RSS service check completed'
    });
  } catch (err) {
    console.error('Debug endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 