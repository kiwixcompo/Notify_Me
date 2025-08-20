const express = require('express');
const router = express.Router();
const { requireAuth } = require('../controllers/userController');
const predefinedFeedController = require('../controllers/predefinedFeedController');

// Public routes
router.get('/categories', predefinedFeedController.getCategories);
router.get('/categories/:type/:category', predefinedFeedController.getFeedsByCategory);

// Protected routes
router.post('/add-to-user', requireAuth, predefinedFeedController.addToUserFeeds);

// Admin routes (you might want to add admin middleware)
router.post('/admin/add', requireAuth, predefinedFeedController.addPredefinedFeed);
router.put('/admin/:id', requireAuth, predefinedFeedController.updatePredefinedFeed);
router.delete('/admin/:id', requireAuth, predefinedFeedController.deletePredefinedFeed);

module.exports = router; 