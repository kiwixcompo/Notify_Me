const express = require('express');
const router = express.Router();
const { generateFeed } = require('../controllers/feedGeneratorController');
const { protect } = require('../middleware/auth');

// POST /api/generate-feed - Generate RSS/XML feed from a website URL
router.post('/generate-feed', protect, generateFeed);

module.exports = router;
