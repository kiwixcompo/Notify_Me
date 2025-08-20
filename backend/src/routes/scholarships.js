const express = require('express');
const router = express.Router();
const { requireAuth } = require('../controllers/userController');
const scholarshipController = require('../controllers/scholarshipController');

// Public routes
router.get('/', scholarshipController.getScholarships);
router.get('/calendar', scholarshipController.getScholarshipCalendar);
router.get('/search', scholarshipController.searchScholarshipsRealTime);

// Protected routes
router.get('/raw/:feedId', requireAuth, scholarshipController.getRawScholarshipFeed);

module.exports = router; 