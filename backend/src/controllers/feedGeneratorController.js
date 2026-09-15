const axios = require('axios');
const cheerio = require('cheerio');
const { parseString } = require('xml2js');
const RssFeed = require('../models/RssFeed');
const { generateFeedFromUrl } = require('../services/rssService');
const { promisify } = require('util');
const parseXml = promisify(parseString);

/**
 * Generate RSS feed from a website URL
 * @param {string} url - The URL of the website
 * @param {Object} options - Options for feed generation
 * @returns {Promise<Object>} - Result of the feed generation
 */
const generateFeedFromWebsite = async (url, options = {}) => {
  try {
    const { type = 'job', keywords = [] } = options;
    
    // First, try to find an existing RSS/XML feed in the website
    const feedUrl = await discoverFeedUrl(url);
    
    if (feedUrl) {
      // If we found a feed, return it with metadata
      return {
        success: true,
        feed: {
          name: `Feed from ${new URL(url).hostname}`,
          url: feedUrl,
          type: type,
          category: 'generated',
          source: new URL(url).hostname,
          isDynamic: false
        },
        source: {
          type: 'discovered-feed',
          url: feedUrl,
          originalUrl: url,
          title: `Feed from ${new URL(url).hostname}`,
          description: `Discovered feed from ${url}`
        }
      };
    }
    
    // If no feed found, use the enhanced RSS service to generate one
    const result = await generateFeedFromUrl(url, { type, keywords });
    
    if (result.success) {
      return {
        ...result,
        feed: {
          ...result.feed,
          type: type,
          isDynamic: true
        }
      };
    }
    
    return result;
    
  } catch (error) {
    console.error('Error generating feed:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate feed from website',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};

// Helper function to discover RSS/Atom feed URLs in a webpage
const discoverFeedUrl = async (url) => {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Look for RSS/Atom feed links in the HTML head
    const feedLinks = [
      $('link[type="application/rss+xml"]').attr('href'),
      $('link[type="application/atom+xml"]').attr('href'),
      $('link[type="application/json"]').attr('href')
    ].filter(Boolean);
    
    // If we found feed links, resolve them to absolute URLs
    if (feedLinks.length > 0) {
      const baseUrl = new URL(url);
      return new URL(feedLinks[0], baseUrl.origin).toString();
    }
    
    // Try common feed paths
    const commonFeedPaths = [
      '/feed',
      '/rss',
      '/atom.xml',
      '/rss.xml',
      '/feed.xml',
      '/?feed=rss',
      '/?feed=atom'
    ];
    
    for (const path of commonFeedPaths) {
      try {
        const feedUrl = new URL(path, url).toString();
        const feedResponse = await axios.head(feedUrl, { timeout: 5000 });
        if (feedResponse.status === 200) {
          return feedUrl;
        }
      } catch (e) {
        // Ignore errors and try the next path
        continue;
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('Error discovering feed URL:', error);
    return null;
  }
};

// Function to create a simple feed from webpage content
const createFeedFromWebpage = async (url, type) => {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const title = $('title').text() || `Feed from ${new URL(url).hostname}`;
    
    // Extract potential article/list items
    const items = [];
    $('article, .post, .article, .item, .entry, [role="article"]').each((i, el) => {
      const $el = $(el);
      const itemTitle = $el.find('h1, h2, h3, .title, .entry-title').first().text().trim();
      const link = $el.find('a').first().attr('href');
      const description = $el.text().trim().substring(0, 200) + '...';
      
      if (itemTitle && link) {
        items.push({
          title: itemTitle,
          link: new URL(link, url).toString(),
          description: description,
          pubDate: new Date().toISOString()
        });
      }
    });
    
    // If no items found, try to create from links
    if (items.length === 0) {
      $('a').each((i, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim();
        
        if (href && text && text.length > 10 && text.length < 100 && 
            !href.startsWith('#') && !href.includes('javascript:') &&
            !href.endsWith('.jpg') && !href.endsWith('.png') && !href.endsWith('.gif')) {
          items.push({
            title: text,
            link: new URL(href, url).toString(),
            description: '',
            pubDate: new Date().toISOString()
          });
        }
      });
    }
    
    // Limit to 20 items
    const limitedItems = items.slice(0, 20);
    
    // Create a simple RSS feed
    const rssFeed = {
      title: title,
      link: url,
      description: `Generated feed from ${url}`,
      items: limitedItems
    };
    
    return {
      success: true,
      feed: {
        name: title,
        url: url, // The original URL since we're generating the feed on the fly
        type: type,
        category: 'generated',
        source: new URL(url).hostname,
        isDynamic: true // Flag to indicate this is a dynamically generated feed
      },
      rssFeed: rssFeed // The actual feed data for immediate use
    };
    
  } catch (error) {
    console.error('Error creating feed from webpage:', error);
    throw new Error(`Failed to create feed from webpage: ${error.message}`);
  }
};

/**
 * Middleware to handle feed generation request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateFeed = async (req, res) => {
  try {
    const { url, type = 'job', keywords = [] } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }
    
    // Generate the feed using the enhanced RSS service
    const result = await generateFeedFromUrl(url, { type, keywords });
    
    if (result.success) {
      // Check if we already have this feed in the database
      let feed = await RssFeed.findOne({
        user: req.userId,
        url: result.source.url,
        type: type
      });
      
      const feedData = {
        user: req.userId,
        name: result.source.title || `Feed from ${new URL(url).hostname}`,
        url: result.source.url,
        type: type,
        category: 'generated',
        source: result.source.url,
        description: result.source.description || `Generated feed from ${url}`,
        isDynamic: true,
        lastFetched: new Date(),
        keywords: Array.isArray(keywords) ? keywords : [],
        metadata: {
          isGenerated: true,
          originalUrl: url,
          lastGenerated: new Date()
        }
      };
      
      if (!feed) {
        // Create a new dynamic feed
        feed = new RssFeed(feedData);
      } else {
        // Update existing feed
        Object.assign(feed, feedData);
      }
      
      await feed.save();
      
      // Return the feed with the generated items
      res.json({
        success: true,
        feed: {
          _id: feed._id,
          ...feedData,
          items: result.feed?.items || []
        },
        stats: result.stats || {}
      });
      
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to generate feed',
        details: result.details
      });
    }
    
  } catch (error) {
    console.error('Error in generateFeed controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while generating feed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  generateFeed
};
