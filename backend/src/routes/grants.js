const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireAuth } = require('../controllers/userController');
const GrantProposal = require('../models/GrantProposal');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

// POST /api/grants/search - Autonomous discovery of grant opportunities
router.post('/search', requireAuth, async (req, res) => {
  try {
    const { field_of_research, career_stage, region, funder_type, max_results } = req.body;
    const response = await axios.post(`${PYTHON_SERVICE_URL}/grants/search`, {
      field_of_research: field_of_research || 'Academic Research',
      career_stage: career_stage || 'Early to Mid-Career / Faculty',
      region: region || 'Global',
      funder_type: funder_type || 'All',
      max_results: max_results || 15
    }, { timeout: 30000 });

    res.json(response.data);
  } catch (error) {
    console.error('Grant search error:', error.message);
    res.status(500).json({ error: error.response?.data?.detail || 'Failed to search grants.' });
  }
});

// POST /api/grants/generate-proposal - Full structured proposal generator
router.post('/generate-proposal', requireAuth, async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/grants/generate-proposal`, req.body, { timeout: 90000 });
    res.json(response.data);
  } catch (error) {
    console.error('Grant proposal generation error:', error.message);
    res.status(500).json({ error: 'Failed to generate grant proposal.' });
  }
});

// POST /api/grants/generate-budget - Itemized budget & narrative justification
router.post('/generate-budget', requireAuth, async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/grants/generate-budget`, req.body, { timeout: 60000 });
    res.json(response.data);
  } catch (error) {
    console.error('Grant budget generation error:', error.message);
    res.status(500).json({ error: 'Failed to generate budget breakdown.' });
  }
});

// GET /api/grants/proposals - Get all user proposals
router.get('/proposals', requireAuth, async (req, res) => {
  try {
    const proposals = await GrantProposal.find({ user: req.userId }).sort({ updatedAt: -1 });
    res.json(proposals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/grants/proposals/save - Save or update a proposal
router.post('/proposals/save', requireAuth, async (req, res) => {
  try {
    const { id, title, fieldOfStudy, coreIdea, targetFunder, durationMonths, requestedBudget, proposalContent, budgetBreakdown, status } = req.body;
    let proposal;
    if (id) {
      proposal = await GrantProposal.findOne({ _id: id, user: req.userId });
    }
    if (!proposal) {
      proposal = new GrantProposal({
        user: req.userId,
        title,
        fieldOfStudy,
        coreIdea,
        targetFunder,
        durationMonths,
        requestedBudget,
        proposalContent,
        budgetBreakdown,
        status: status || 'draft'
      });
    } else {
      if (title) proposal.title = title;
      if (fieldOfStudy) proposal.fieldOfStudy = fieldOfStudy;
      if (coreIdea) proposal.coreIdea = coreIdea;
      if (targetFunder) proposal.targetFunder = targetFunder;
      if (durationMonths) proposal.durationMonths = durationMonths;
      if (requestedBudget) proposal.requestedBudget = requestedBudget;
      if (proposalContent !== undefined) proposal.proposalContent = proposalContent;
      if (budgetBreakdown !== undefined) proposal.budgetBreakdown = budgetBreakdown;
      if (status) proposal.status = status;
    }

    await proposal.save();
    res.json(proposal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/grants/proposals/clear
// Clearance feature: clears user's saved proposals
router.delete('/proposals/clear', requireAuth, async (req, res) => {
  try {
    const result = await GrantProposal.deleteMany({ user: req.userId });
    res.json({ success: true, message: 'All proposals cleared successfully.', deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
