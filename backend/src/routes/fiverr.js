const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../controllers/userController');
const { extractFiverrGig, analyzeFiverrGaps, generateFiverrOptimizations } = require('../services/fiverrService');

// POST /api/fiverr/analyze
router.post('/analyze', optionalAuth, async (req, res) => {
  try {
    const { gigUrl, groq_api_key } = req.body;

    if (!gigUrl || typeof gigUrl !== 'string') {
      return res.status(400).json({ error: 'A valid Fiverr Gig or Profile URL is required' });
    }

    // 1. Scrape / extract gig and seller profile data
    const userGig = await extractFiverrGig(gigUrl.trim());

    // 2. Perform algorithmic gap analysis
    const gapAnalysis = analyzeFiverrGaps(userGig);

    // 3. Generate AI optimizations & image prompt
    let optimizations = null;
    let aiError = null;

    const activeApiKey = groq_api_key || process.env.GROQ_API_KEY;
    if (activeApiKey) {
      try {
        optimizations = await generateFiverrOptimizations({
          userGig,
          gapAnalysis,
          groqApiKey: activeApiKey
        });
      } catch (err) {
        console.error('[FiverrRoute] AI Optimization failed:', err.message);
        aiError = err.message;
      }
    } else {
      aiError = 'Groq API Key not configured. Please supply a Groq key to unlock generative title, description, and Midjourney image prompt.';
    }

    res.json({
      status: 'success',
      gigData: userGig,
      gapAnalysis,
      optimizations,
      aiError
    });
  } catch (err) {
    console.error('[FiverrRoute] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to analyze Fiverr gig' });
  }
});

module.exports = router;
