const PredefinedFeed = require('../models/PredefinedFeed');
const RssFeed = require('../models/RssFeed');

// Get all predefined feed categories
exports.getCategories = async (req, res) => {
  try {
    const { type } = req.query; // 'job' or 'scholarship'
    
    let query = { isActive: true };
    if (type) {
      query.type = type;
    }
    
    const feeds = await PredefinedFeed.find(query);
    
    // Group feeds by category
    const categories = {};
    feeds.forEach(feed => {
      if (!categories[feed.category]) {
        categories[feed.category] = {
          name: feed.category,
          type: feed.type,
          feeds: []
        };
      }
      categories[feed.category].feeds.push({
        _id: feed._id,
        name: feed.name,
        description: feed.description,
        url: feed.url,
        source: feed.source
      });
    });
    
    res.json({ categories: Object.values(categories) });
  } catch (error) {
    console.error('Error fetching predefined feed categories:', error);
    res.status(500).json({ error: 'Failed to fetch predefined feed categories' });
  }
};

// Auto-add default feeds for new users
exports.addDefaultFeedsForUser = async (userId, type = 'job') => {
  try {
    // Get default feeds for the specified type
    const defaultFeeds = await PredefinedFeed.find({
      category: type === 'job' ? 'default-jobs' : 'default-scholarships',
      type: type,
      isActive: true
    });
    
    // Check which feeds the user doesn't have yet
    const existingFeeds = await RssFeed.find({ user: userId, type: type });
    const existingUrls = existingFeeds.map(feed => feed.url);
    
    const feedsToAdd = defaultFeeds.filter(feed => !existingUrls.includes(feed.url));
    
    // Add missing default feeds
    const newFeeds = feedsToAdd.map(feed => ({
      user: userId,
      url: feed.url,
      name: feed.name,
      type: feed.type,
      category: feed.category
    }));
    
    if (newFeeds.length > 0) {
      await RssFeed.insertMany(newFeeds);
      console.log(`Added ${newFeeds.length} default ${type} feeds for user ${userId}`);
    }
    
    return newFeeds.length;
  } catch (error) {
    console.error('Error adding default feeds for user:', error);
    return 0;
  }
};

// Get feeds by category
exports.getFeedsByCategory = async (req, res) => {
  try {
    const { category, type } = req.params;
    
    const feeds = await PredefinedFeed.find({
      category,
      type,
      isActive: true
    });
    
    res.json({ feeds });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feeds for category' });
  }
};

// Add a predefined feed to user's feeds
exports.addToUserFeeds = async (req, res) => {
  try {
    const { predefinedFeedId } = req.body;
    const userId = req.userId;
    
    const predefinedFeed = await PredefinedFeed.findById(predefinedFeedId);
    if (!predefinedFeed) {
      return res.status(404).json({ error: 'Predefined feed not found' });
    }
    
    // Check if user already has this feed
    const existingFeed = await RssFeed.findOne({
      user: userId,
      url: predefinedFeed.url
    });
    
    if (existingFeed) {
      return res.status(400).json({ error: 'Feed already exists in your list' });
    }
    
    // Add to user's feeds
    const newFeed = new RssFeed({
      user: userId,
      url: predefinedFeed.url,
      name: predefinedFeed.name,
      type: predefinedFeed.type,
      category: predefinedFeed.category
    });
    
    await newFeed.save();
    
    res.json({ message: 'Feed added successfully', feed: newFeed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add feed to user list' });
  }
};

// Admin: Add predefined feed
exports.addPredefinedFeed = async (req, res) => {
  try {
    const { name, description, category, type, url, source } = req.body;
    
    const newFeed = new PredefinedFeed({
      name,
      description,
      category,
      type,
      url,
      source
    });
    
    await newFeed.save();
    
    res.json({ message: 'Predefined feed added successfully', feed: newFeed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add predefined feed' });
  }
};

// Admin: Update predefined feed
exports.updatePredefinedFeed = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const feed = await PredefinedFeed.findByIdAndUpdate(id, updates, { new: true });
    
    if (!feed) {
      return res.status(404).json({ error: 'Predefined feed not found' });
    }
    
    res.json({ message: 'Predefined feed updated successfully', feed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update predefined feed' });
  }
};

// Admin: Delete predefined feed
exports.deletePredefinedFeed = async (req, res) => {
  try {
    const { id } = req.params;
    
    const feed = await PredefinedFeed.findByIdAndDelete(id);
    
    if (!feed) {
      return res.status(404).json({ error: 'Predefined feed not found' });
    }
    
    res.json({ message: 'Predefined feed deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete predefined feed' });
  }
}; 