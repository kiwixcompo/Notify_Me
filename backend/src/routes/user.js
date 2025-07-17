const express = require('express');
const bodyParser = require('body-parser');
const { requireAuth, getPreferences, updatePreferences } = require('../controllers/userController');
const router = express.Router();
const RssFeed = require('../models/RssFeed');
const { fetchJobsFromRSS } = require('../services/rssService');
const bcrypt = require('bcrypt');

router.use(bodyParser.json());

// GET /api/user/preferences
router.get('/preferences', requireAuth, getPreferences);

// PUT /api/user/preferences
router.put('/preferences', requireAuth, updatePreferences);

// GET /api/user/profile - Get current user's profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await require('../models/User').findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ name: user.name, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/user/profile - Update current user's profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const update = {};
    if (name) update.name = name;
    if (email) update.email = email;
    if (password && password.length >= 8) {
      update.passwordHash = await bcrypt.hash(password, 10);
    }
    const user = await require('../models/User').findByIdAndUpdate(
      req.userId,
      update,
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ name: user.name, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all RSS feeds for the authenticated user
router.get('/rss-feeds', requireAuth, async (req, res) => {
  try {
    const feeds = await RssFeed.find({ user: req.userId });
    res.json({ success: true, feeds });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add a new RSS feed for the authenticated user
router.post('/rss-feeds', requireAuth, async (req, res) => {
  try {
    const { url, name } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'Feed URL is required' });
    const feed = await RssFeed.create({ user: req.userId, url, name });
    res.json({ success: true, feed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Edit an RSS feed by ID
router.put('/rss-feeds/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { url, name, apiBackupUrl } = req.body;
    const feed = await RssFeed.findOneAndUpdate(
      { _id: id, user: req.userId },
      { url, name, apiBackupUrl },
      { new: true }
    );
    if (!feed) return res.status(404).json({ success: false, error: 'Feed not found' });
    res.json({ success: true, feed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete an RSS feed by ID
router.delete('/rss-feeds/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const feed = await RssFeed.findOneAndDelete({ _id: id, user: req.userId });
    if (!feed) return res.status(404).json({ success: false, error: 'Feed not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test all RSS feeds for the authenticated user
router.get('/rss-feeds/test', requireAuth, async (req, res) => {
  try {
    const feeds = await RssFeed.find({ user: req.userId });
    if (!feeds.length) return res.json({ success: true, results: [] });
    const results = [];
    let firstWorkingFeedRaw = null;
    for (let i = 0; i < feeds.length; i++) {
      const feed = feeds[i];
      let jobs = [];
      let error = null;
      let rawFeed = null;
      try {
        const Parser = require('rss-parser');
        const parser = new Parser();
        rawFeed = await parser.parseURL(feed.url);
        jobs = (rawFeed.items || []).map(item => ({
          title: item.title,
          link: item.link,
          description: item.contentSnippet || item.content || item.description || '',
          pubDate: item.pubDate,
          guid: item.guid || item.link,
          feedUrl: feed.url
        }));
        if (!firstWorkingFeedRaw && jobs.length > 0) firstWorkingFeedRaw = rawFeed;
      } catch (err) {
        error = err.message;
      }
      results.push({
        url: feed.url,
        apiBackupUrl: feed.apiBackupUrl,
        name: feed.name,
        jobsCount: jobs.length,
        error
      });
    }
    res.json({ success: true, results, firstWorkingFeedRaw });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get raw parsed feed data for all user feeds, with optional filtering
router.get('/rss-feeds/raw', requireAuth, async (req, res) => {
  try {
    const feeds = await RssFeed.find({ user: req.userId });
    if (!feeds.length) return res.json({ success: true, feeds: [] });
    const Parser = require('rss-parser');
    const parser = new Parser();
    const { keyword, date } = req.query;
    const results = [];
    for (const feed of feeds) {
      let rawFeed = null;
      let error = null;
      let items = [];
      // Retry logic: try up to 2 times if error
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          rawFeed = await parser.parseURL(feed.url);
          items = rawFeed.items || [];
          // Filter by keyword
          if (keyword) {
            const kw = keyword.toLowerCase();
            items = items.filter(item =>
              (item.title && item.title.toLowerCase().includes(kw)) ||
              (item.content && item.content.toLowerCase().includes(kw)) ||
              (item.contentSnippet && item.contentSnippet.toLowerCase().includes(kw)) ||
              (item.description && item.description.toLowerCase().includes(kw))
            );
          }
          // Filter by date (YYYY-MM-DD)
          if (date) {
            items = items.filter(item => {
              if (!item.pubDate) return false;
              const itemDate = new Date(item.pubDate);
              const [yyyy, mm, dd] = date.split('-');
              const targetDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
              return itemDate.getFullYear() === targetDate.getFullYear() &&
                     itemDate.getMonth() === targetDate.getMonth() &&
                     itemDate.getDate() === targetDate.getDate();
            });
          }
          error = null;
          break; // Success, exit retry loop
        } catch (err) {
          error = err.message;
          if (attempt === 2) {
            // User-friendly error messages
            if (error.includes('Status code 403')) {
              error = 'This feed is currently inaccessible (403 Forbidden). The source may be blocking access. We will keep trying.';
            } else if (error.includes('Status code 404')) {
              error = 'This feed was not found (404 Not Found). Please check the feed URL.';
            } else if (error.includes('Invalid character in entity name')) {
              error = 'This feed is currently experiencing technical issues and cannot be loaded. Please check back later or contact the feed provider.';
            } else {
              error = 'Unable to fetch this feed at the moment. We will keep trying.';
            }
          }
        }
      }
      results.push({
        feed: { url: feed.url, name: feed.name },
        items,
        error
      });
    }
    // Sort by feed title
    results.sort((a, b) => (a.feed.name || a.feed.url).localeCompare(b.feed.name || b.feed.url));
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/user/rss-feeds/:id/raw - Fetch and parse a single feed for the user
router.get('/rss-feeds/:id/raw', requireAuth, async (req, res) => {
  try {
    const feed = await RssFeed.findOne({ _id: req.params.id, user: req.userId });
    if (!feed) return res.status(404).json({ error: 'Feed not found' });
    const Parser = require('rss-parser');
    const parser = new Parser();
    let items = [];
    let error = null;
    // Retry logic: try up to 2 times if error
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const rawFeed = await parser.parseURL(feed.url);
        items = rawFeed.items || [];
        error = null;
        break;
      } catch (err) {
        error = err.message;
        if (attempt === 2) {
          if (error.includes('Status code 403')) {
            error = 'This feed is currently inaccessible (403 Forbidden). The source may be blocking access. We will keep trying.';
          } else if (error.includes('Status code 404')) {
            error = 'This feed was not found (404 Not Found). Please check the feed URL.';
          } else if (error.includes('Invalid character in entity name')) {
            error = 'This feed is currently experiencing technical issues and cannot be loaded. Please check back later or contact the feed provider.';
          } else {
            error = 'Unable to fetch this feed at the moment. We will keep trying.';
          }
        }
      }
    }
    res.json({
      feed: { url: feed.url, name: feed.name },
      items,
      error
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 