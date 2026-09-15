const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireAuth } = require('../controllers/userController');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

// GET /api/portals/config - Retrieve list of configured national portals & shortage criteria
router.get('/config', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/portals/config`, { timeout: 10000 });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching portals config:', error.message);
    res.status(500).json({ error: 'Failed to fetch portal configurations.' });
  }
});

// POST /api/portals/search - Discover vacancies & shortage tracks across official portals
router.post('/search', requireAuth, async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/portals/search`, req.body, { timeout: 35000 });
    res.json(response.data);
  } catch (error) {
    console.error('Error searching portals:', error.message);
    res.status(500).json({ error: error.response?.data?.detail || 'Failed to search international portals.' });
  }
});

// POST /api/portals/assist - Generate tailored international application package (Cover Letter, Visa match, Outreach, Checklist)
router.post('/assist', requireAuth, async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/portals/assist`, req.body, { timeout: 90000 });
    res.json(response.data);
  } catch (error) {
    console.error('Error generating application assist:', error.message);
    res.status(500).json({ error: error.response?.data?.detail || 'Failed to generate application package.' });
  }
});

module.exports = router;
