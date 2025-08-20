const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const { requireAuth, getPreferences, updatePreferences } = require('../controllers/userController');
const router = express.Router();
const RssFeed = require('../models/RssFeed');
const { fetchJobsFromRSS, parseXMLContent } = require('../services/rssService');
const bcrypt = require('bcrypt');

// Configure multer for XML file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || file.originalname.endsWith('.xml')) {
      cb(null, true);
    } else {
      cb(new Error('Only XML files are allowed'));
    }
  }
});

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
    const { type } = req.query; // 'job' or 'scholarship'
    let query = { user: req.userId };
    if (type) {
      query.type = type;
    }
    const feeds = await RssFeed.find(query);
    res.json({ success: true, feeds });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add a new RSS feed for the authenticated user
router.post('/rss-feeds', requireAuth, async (req, res) => {
  try {
    const { url, name, type, category, apiBackupUrl, isXML, contentType } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'Feed URL is required' });
    
    // Auto-detect if it's an XML file based on URL or explicit flag
    const detectedIsXML = isXML || url.toLowerCase().endsWith('.xml');
    const detectedContentType = contentType || (detectedIsXML ? 'xml' : 'rss');
    
    const feed = await RssFeed.create({ 
      user: req.userId, 
      url, 
      name, 
      type: type || 'job',
      category,
      apiBackupUrl,
      isXML: detectedIsXML,
      contentType: detectedContentType
    });
    res.json({ success: true, feed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload and parse XML file directly
router.post('/xml-upload', requireAuth, upload.single('xmlFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No XML file uploaded' });
    }

    const { type, name, category } = req.body;
    const xmlContent = req.file.buffer.toString('utf8');
    
    // Parse the XML content
    const items = await parseXMLContent(xmlContent, type || 'job');
    
    if (items.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid items found in XML file' });
    }

    // Create a feed entry for this XML file
    const feed = await RssFeed.create({
      user: req.userId,
      url: `uploaded://${req.file.originalname}`,
      name: name || req.file.originalname,
      type: type || 'job',
      category,
      isXML: true,
      contentType: 'xml'
    });

    res.json({ 
      success: true, 
      feed,
      items,
      message: `Successfully parsed ${items.length} items from XML file`
    });
  } catch (err) {
    console.error('XML upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Parse and add XML code directly
router.post('/xml-code', requireAuth, async (req, res) => {
  try {
    const { xmlCode, type, name, category } = req.body;
    
    if (!xmlCode || xmlCode.trim() === '') {
      return res.status(400).json({ success: false, error: 'XML code is required' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Feed name is required' });
    }

    // Parse the XML content
    const items = await parseXMLContent(xmlCode.trim(), type || 'job');
    
    if (items.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid items found in XML code' });
    }

    // Create a feed entry for this XML code
    const feed = await RssFeed.create({
      user: req.userId,
      url: `code://${name}-${Date.now()}`, // Generate unique identifier
      name: name,
      type: type || 'job',
      category,
      isXML: true,
      contentType: 'xml',
      xmlContent: xmlCode.trim() // Store the actual XML content
    });

    res.json({ 
      success: true, 
      feed,
      items,
      message: `Successfully parsed ${items.length} items from XML code`
    });
  } catch (err) {
    console.error('XML code parsing error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get XML content for code-based feeds
router.get('/xml-code/:id', requireAuth, async (req, res) => {
  try {
    const feed = await RssFeed.findOne({ _id: req.params.id, user: req.userId });
    if (!feed) {
      return res.status(404).json({ success: false, error: 'Feed not found' });
    }

    if (!feed.xmlContent) {
      return res.status(400).json({ success: false, error: 'This feed does not contain XML code' });
    }

    res.json({ 
      success: true, 
      feed: {
        id: feed._id,
        name: feed.name,
        type: feed.type,
        category: feed.category,
        isXML: feed.isXML,
        contentType: feed.contentType
      },
      xmlContent: feed.xmlContent
    });
  } catch (err) {
    console.error('XML code retrieval error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update XML content for code-based feeds
router.put('/xml-code/:id', requireAuth, async (req, res) => {
  try {
    const { xmlCode, name, category } = req.body;
    
    if (!xmlCode || xmlCode.trim() === '') {
      return res.status(400).json({ success: false, error: 'XML code is required' });
    }

    // Parse the XML content to validate it
    const items = await parseXMLContent(xmlCode.trim());
    
    if (items.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid items found in XML code' });
    }

    // Update the feed
    const feed = await RssFeed.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { 
        xmlContent: xmlCode.trim(),
        name: name || undefined,
        category: category || undefined
      },
      { new: true }
    );

    if (!feed) {
      return res.status(404).json({ success: false, error: 'Feed not found' });
    }

    res.json({ 
      success: true, 
      feed,
      items,
      message: `Successfully updated XML code with ${items.length} items`
    });
  } catch (err) {
    console.error('XML code update error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Edit an RSS feed by ID
router.put('/rss-feeds/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { url, name, apiBackupUrl, isXML, contentType } = req.body;
    
    // Auto-detect if it's an XML file based on URL or explicit flag
    const detectedIsXML = isXML || url.toLowerCase().endsWith('.xml');
    const detectedContentType = contentType || (detectedIsXML ? 'xml' : 'rss');
    
    const feed = await RssFeed.findOneAndUpdate(
      { _id: id, user: req.userId },
      { url, name, apiBackupUrl, isXML: detectedIsXML, contentType: detectedContentType },
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
    
    const { fetchItemsFromRSS, parseXMLContent, fetchXMLFromURL } = require('../services/rssService');
    
    for (let i = 0; i < feeds.length; i++) {
      const feed = feeds[i];
      let items = [];
      let error = null;
      let rawFeed = null;
      
      try {
        if (feed.url.startsWith('code://')) {
          // Handle code-based XML feeds
          if (feed.xmlContent) {
            const xmlItems = await parseXMLContent(feed.xmlContent, feed.type);
            items = xmlItems;
            rawFeed = { items: xmlItems, feedType: 'code-xml' };
          } else {
            error = 'No XML content stored for this code-based feed';
          }
        } else if (feed.isXML || feed.contentType === 'xml') {
          // Handle XML files
          const xmlItems = await fetchXMLFromURL(feed.url, feed.type);
          items = xmlItems;
          rawFeed = { items: xmlItems, feedType: 'xml' };
        } else {
          // Handle RSS feeds
          const Parser = require('rss-parser');
          const parser = new Parser();
          rawFeed = await parser.parseURL(feed.url);
          items = (rawFeed.items || []).map(item => ({
            title: item.title,
            link: item.link,
            description: item.contentSnippet || item.content || item.description || '',
            pubDate: item.pubDate,
            guid: item.guid || item.link,
            feedUrl: feed.url
          }));
        }
        
        if (!firstWorkingFeedRaw && items.length > 0) firstWorkingFeedRaw = rawFeed;
      } catch (err) {
        error = err.message;
      }
      
      results.push({
        url: feed.url,
        apiBackupUrl: feed.apiBackupUrl,
        name: feed.name,
        contentType: feed.contentType,
        isXML: feed.isXML,
        isCodeBased: feed.url.startsWith('code://'),
        itemsCount: items.length,
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
    
    const { fetchItemsFromRSS, parseXMLContent, fetchXMLFromURL } = require('../services/rssService');
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
          if (feed.isXML || feed.contentType === 'xml') {
            // Handle XML files
            const xmlItems = await fetchXMLFromURL(feed.url, feed.type);
            items = xmlItems;
            rawFeed = { items: xmlItems, feedType: 'xml' };
          } else {
            // Handle RSS feeds
            rawFeed = await parser.parseURL(feed.url);
            items = rawFeed.items || [];
          }
          
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
        feed: { url: feed.url, name: feed.name, contentType: feed.contentType, isXML: feed.isXML },
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
    
    const { fetchItemsFromRSS, parseXMLContent, fetchXMLFromURL } = require('../services/rssService');
    const Parser = require('rss-parser');
    const parser = new Parser();
    
    let items = [];
    let error = null;
    let rawFeed = null;
    
    // Retry logic: try up to 2 times if error
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        if (feed.isXML || feed.contentType === 'xml') {
          // Handle XML files
          const xmlItems = await fetchXMLFromURL(feed.url, feed.type);
          items = xmlItems;
          rawFeed = { items: xmlItems, feedType: 'xml' };
        } else {
          // Handle RSS feeds
          rawFeed = await parser.parseURL(feed.url);
          items = rawFeed.items || [];
        }
        
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
      feed: { url: feed.url, name: feed.name, contentType: feed.contentType, isXML: feed.isXML },
      items,
      error
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 