const express = require('express');
const router = express.Router();
const { requireAuth } = require('../controllers/userController');
const scholarshipController = require('../controllers/scholarshipController');

// Protected routes
router.get('/', requireAuth, scholarshipController.getScholarships);
router.get('/calendar', requireAuth, scholarshipController.getScholarshipCalendar);
router.get('/search', scholarshipController.searchScholarshipsRealTime);

// Protected routes
router.get('/raw/:feedId', requireAuth, scholarshipController.getRawScholarshipFeed);

module.exports = router; 