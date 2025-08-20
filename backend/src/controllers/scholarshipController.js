const Scholarship = require('../models/Scholarship');
const RssFeed = require('../models/RssFeed');
const searchService = require('../services/searchService');

// Get scholarships with filtering
exports.getScholarships = async (req, res) => {
  try {
    const userId = req.userId;
    const { date, last24h, category, level, country, field } = req.query;
    const { fetchItemsFromMultipleSources } = require('../services/rssService');
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    // Get user's scholarship feeds
    const userFeeds = await RssFeed.find({ user: userId, type: 'scholarship' });
    
    if (userFeeds.length === 0) {
      return res.json({
        scholarships: [],
        message: 'No scholarship feeds configured. Please add some RSS feeds in preferences.',
        totalScholarships: 0
      });
    }
    
    // Fetch scholarships from user's RSS feeds
    console.log(`Fetching scholarships from ${userFeeds.length} feeds for user ${userId}`);
    const rssScholarships = await fetchItemsFromMultipleSources(userFeeds, 'scholarship');
    
    // Convert RSS scholarships to the expected format
    let scholarships = rssScholarships.map(rssScholarship => {
      // Extract scholarship details from title/description
      const title = rssScholarship.title || '';
      const description = rssScholarship.description || '';
      const content = rssScholarship.content || '';
      
      // Try to extract amount, deadline, level, etc. from content
      let amount = '';
      let deadline = null;
      let scholarshipLevel = '';
      let scholarshipCountry = '';
      let scholarshipField = '';
      
      // Extract amount (common patterns)
      const amountPatterns = [
        /\$[\d,]+(?:\.\d{2})?/g,
        /USD\s*[\d,]+/gi,
        /EUR\s*[\d,]+/gi,
        /GBP\s*[\d,]+/gi,
        /[\d,]+\s*(?:dollars?|euros?|pounds?)/gi
      ];
      
      for (const pattern of amountPatterns) {
        const matches = content.match(pattern) || description.match(pattern) || title.match(pattern);
        if (matches) {
          amount = matches[0];
          break;
        }
      }
      
      // Extract deadline
      const deadlinePatterns = [
        /deadline[:\s]+([^.\n]+)/gi,
        /apply\s+by[:\s]+([^.\n]+)/gi,
        /application\s+deadline[:\s]+([^.\n]+)/gi,
        /due\s+date[:\s]+([^.\n]+)/gi
      ];
      
      for (const pattern of deadlinePatterns) {
        const match = content.match(pattern) || description.match(pattern);
        if (match) {
          const dateStr = match[1].trim();
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            deadline = parsedDate;
            break;
          }
        }
      }
      
      // Extract level
      const levelPatterns = [
        /undergraduate/gi,
        /graduate/gi,
        /phd|doctorate/gi,
        /masters?/gi,
        /bachelor/gi,
        /postgraduate/gi
      ];
      
      for (const pattern of levelPatterns) {
        if (content.match(pattern) || description.match(pattern) || title.match(pattern)) {
          scholarshipLevel = pattern.source.replace(/[()]/g, '').toLowerCase();
          break;
        }
      }
      
      // Extract country
      const countryPatterns = [
        /USA|United States|America/gi,
        /UK|United Kingdom|England/gi,
        /Canada/gi,
        /Australia/gi,
        /Germany/gi,
        /France/gi,
        /Japan/gi,
        /China/gi
      ];
      
      for (const pattern of countryPatterns) {
        if (content.match(pattern) || description.match(pattern) || title.match(pattern)) {
          scholarshipCountry = pattern.source.replace(/[()|]/g, '').toLowerCase();
          break;
        }
      }
      
      // Extract field of study
      const fieldPatterns = [
        /computer science|CS/gi,
        /engineering/gi,
        /medicine|medical/gi,
        /business/gi,
        /arts/gi,
        /science/gi,
        /mathematics|math/gi,
        /physics/gi,
        /chemistry/gi,
        /biology/gi
      ];
      
      for (const pattern of fieldPatterns) {
        if (content.match(pattern) || description.match(pattern) || title.match(pattern)) {
          scholarshipField = pattern.source.replace(/[()|]/g, '').toLowerCase();
          break;
        }
      }
      
      return {
        title: rssScholarship.title,
        description: rssScholarship.description,
        link: rssScholarship.link,
        pubDate: rssScholarship.pubDate ? new Date(rssScholarship.pubDate) : new Date(),
        categories: rssScholarship.categories || [],
        feedUrl: rssScholarship.feedUrl,
        feedName: rssScholarship.feedName,
        guid: rssScholarship.guid,
        // Extracted scholarship details
        amount,
        deadline,
        level: scholarshipLevel,
        country: scholarshipCountry,
        field: scholarshipField,
        // Add format indicators for frontend
        isXML: rssScholarship.isXML,
        isJSON: rssScholarship.isJSON,
        isCSV: rssScholarship.isCSV,
        isCodeBased: rssScholarship.isCodeBased
      };
    });
    
    // Apply filters
    if (last24h === 'true') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      scholarships = scholarships.filter(s => new Date(s.pubDate) >= yesterday);
    } else if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      scholarships = scholarships.filter(s => {
        const pubDate = new Date(s.pubDate);
        return pubDate >= startDate && pubDate < endDate;
      });
    }
    
    if (category) {
      scholarships = scholarships.filter(s => s.categories.includes(category));
    }
    
    if (level) {
      scholarships = scholarships.filter(s => s.level === level);
    }
    
    if (country) {
      scholarships = scholarships.filter(s => s.country === country);
    }
    
    if (field) {
      scholarships = scholarships.filter(s => s.field === field);
    }
    
    // Sort by publication date (newest first)
    scholarships.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // Limit results
    scholarships = scholarships.slice(0, 100);
    
    res.json({ 
      scholarships,
      totalScholarships: scholarships.length,
      feedsCount: userFeeds.length,
      message: scholarships.length === 0 ? 'No scholarships found from your feeds' : undefined
    });
  } catch (error) {
    console.error('Error fetching scholarships:', error);
    res.status(500).json({ error: 'Failed to fetch scholarships from your feeds' });
  }
};

// Get scholarship calendar data
exports.getScholarshipCalendar = async (req, res) => {
  try {
    const { month, year, filterByPreferences } = req.query;
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    let query = {
      pubDate: { $gte: startDate, $lte: endDate }
    };
    
    // If filtering by preferences, get user's scholarship feeds
    if (filterByPreferences === 'true' && req.user) {
      const userFeeds = await RssFeed.find({ 
        user: req.user.id, 
        type: 'scholarship' 
      });
      const feedIds = userFeeds.map(feed => feed._id);
      query.feed = { $in: feedIds };
    }
    
    const scholarships = await Scholarship.find(query);
    
    // Group by date
    const calendarData = {};
    scholarships.forEach(scholarship => {
      const date = scholarship.pubDate.toISOString().split('T')[0];
      calendarData[date] = (calendarData[date] || 0) + 1;
    });
    
    res.json({ calendarData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scholarship calendar data' });
  }
};

// Get raw scholarship feed data
exports.getRawScholarshipFeed = async (req, res) => {
  try {
    const { feedId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify user owns this feed
    const feed = await RssFeed.findOne({ 
      _id: feedId, 
      user: req.user.id,
      type: 'scholarship'
    });
    
    if (!feed) {
      return res.status(404).json({ error: 'Feed not found' });
    }
    
    // Fetch scholarships from this feed
    const scholarships = await Scholarship.find({ feed: feedId })
      .sort({ pubDate: -1 })
      .limit(50);
    
    res.json({
      feed: {
        url: feed.url,
        name: feed.name
      },
      items: scholarships
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch raw scholarship feed' });
  }
};

// Process scholarship from RSS feed
exports.processScholarshipFromRSS = async (rssItem, feedId) => {
  try {
    // Check if scholarship already exists
    const existing = await Scholarship.findOne({
      title: rssItem.title,
      link: rssItem.link,
      feed: feedId
    });
    
    if (existing) {
      return null; // Already exists
    }
    
    // Extract scholarship details from title/description
    const title = rssItem.title || '';
    const description = rssItem.description || rssItem.contentSnippet || '';
    const content = rssItem.content || '';
    
    // Try to extract amount, deadline, level, etc. from content
    let amount = '';
    let deadline = null;
    let level = '';
    let country = '';
    let field = '';
    
    // Extract amount (common patterns)
    const amountPatterns = [
      /\$[\d,]+(?:\.\d{2})?/g,
      /USD\s*[\d,]+/gi,
      /EUR\s*[\d,]+/gi,
      /GBP\s*[\d,]+/gi,
      /[\d,]+\s*(?:dollars?|euros?|pounds?)/gi
    ];
    
    for (const pattern of amountPatterns) {
      const matches = content.match(pattern) || description.match(pattern) || title.match(pattern);
      if (matches) {
        amount = matches[0];
        break;
      }
    }
    
    // Extract deadline
    const deadlinePatterns = [
      /deadline[:\s]+([^.\n]+)/gi,
      /apply\s+by[:\s]+([^.\n]+)/gi,
      /application\s+deadline[:\s]+([^.\n]+)/gi,
      /due\s+date[:\s]+([^.\n]+)/gi
    ];
    
    for (const pattern of deadlinePatterns) {
      const match = content.match(pattern) || description.match(pattern);
      if (match) {
        const dateStr = match[1].trim();
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          deadline = parsedDate;
          break;
        }
      }
    }
    
    // Extract level
    const levelPatterns = [
      /undergraduate/gi,
      /graduate/gi,
      /phd|doctorate/gi,
      /masters?/gi,
      /bachelor/gi,
      /postgraduate/gi
    ];
    
    for (const pattern of levelPatterns) {
      if (content.match(pattern) || description.match(pattern) || title.match(pattern)) {
        level = pattern.source.replace(/[()]/g, '').toLowerCase();
        break;
      }
    }
    
    // Extract country
    const countryPatterns = [
      /USA|United States|America/gi,
      /UK|United Kingdom|England/gi,
      /Canada/gi,
      /Australia/gi,
      /Germany/gi,
      /France/gi,
      /Japan/gi,
      /China/gi
    ];
    
    for (const pattern of countryPatterns) {
      if (content.match(pattern) || description.match(pattern) || title.match(pattern)) {
        country = pattern.source.replace(/[()|]/g, '').toLowerCase();
        break;
      }
    }
    
    // Extract field of study
    const fieldPatterns = [
      /computer science|CS/gi,
      /engineering/gi,
      /medicine|medical/gi,
      /business/gi,
      /arts/gi,
      /science/gi,
      /mathematics|math/gi,
      /physics/gi,
      /chemistry/gi,
      /biology/gi
    ];
    
    for (const pattern of fieldPatterns) {
      if (content.match(pattern) || description.match(pattern) || title.match(pattern)) {
        field = pattern.source.replace(/[()|]/g, '').toLowerCase();
        break;
      }
    }
    
    // Create new scholarship
    const scholarship = new Scholarship({
      title: rssItem.title,
      description: rssItem.description || rssItem.contentSnippet,
      link: rssItem.link || rssItem.guid,
      pubDate: rssItem.pubDate ? new Date(rssItem.pubDate) : new Date(),
      feed: feedId,
      categories: rssItem.categories || [],
      amount,
      deadline,
      level,
      country,
      field
    });
    
    await scholarship.save();
    return scholarship;
  } catch (error) {
    console.error('Error processing scholarship from RSS:', error);
    return null;
  }
};

// Search scholarships in real-time from multiple sources
exports.searchScholarshipsRealTime = async (req, res) => {
  try {
    const { query = '', limit = 50 } = req.query;
    
    // Get real-time search results
    const searchResults = await searchService.searchScholarships(query, parseInt(limit));
    
    res.json({
      success: true,
      scholarships: searchResults,
      total: searchResults.length,
      query,
      sources: searchResults.map(scholarship => scholarship.source)
    });
  } catch (error) {
    console.error('Error in searchScholarshipsRealTime:', error);
    res.status(500).json({ error: 'Failed to search scholarships' });
  }
};

// All functions are already exported using exports.functionName
// No need for additional module.exports 