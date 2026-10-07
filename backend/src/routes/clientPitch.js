const express = require('express');
const router = express.Router();
const { optionalAuth, requireAuth } = require('../controllers/userController');
const ClientLead = require('../models/ClientLead');
const {
  discoverLocalMapDirectoryLeads,
  discoverSocialOnlyLeads,
  discoverParkedDomainLeads,
  extractBusinessContactsForFree,
  verifyBusinessLegitimacy
} = require('../services/freeClientPitchService');
const {
  discoverGooglePlacesLeads,
  discoverOutscraperLeads,
  discoverFacebookLeads,
  discoverYellowpagesLeads,
  discoverWhoisNewDomainLeads
} = require('../services/clientPitchService');
const { generateWebsitePitch } = require('../services/pitchGeneratorService');

// POST /api/client-pitch/discover - Free zero-API discovery with verified contact & legitimacy checks
router.post('/discover', optionalAuth, async (req, res) => {
  try {
    const {
      channel, // 'directory_free' | 'social_free' | 'parked_domains_free' | 'google_places' | 'outscraper_b2b' | 'whois_new_domains'
      keyword,
      location,
      apiKey,
      dateString
    } = req.body;

    let leads = [];

    switch (channel) {
      // 100% Free, Zero-API-Key Channels:
      case 'directory_free':
      case 'yellowpages_directory':
        leads = await discoverLocalMapDirectoryLeads(keyword || 'contractor', location || 'Dallas, TX');
        break;

      case 'social_free':
      case 'social_only':
        leads = await discoverSocialOnlyLeads(keyword || 'roofing', location || 'Miami, FL');
        break;

      case 'parked_domains_free':
        leads = await discoverParkedDomainLeads(keyword || 'dental');
        break;

      // Optional API Channels (still supported if user passes key or configured in DB):
      case 'google_places':
        leads = await discoverGooglePlacesLeads(`${keyword || 'local business'} in ${location || 'New York'}`, apiKey);
        break;

      case 'outscraper_b2b':
        leads = await discoverOutscraperLeads(`${keyword || 'contractor'} in ${location || 'London'}`, apiKey);
        break;

      case 'whois_new_domains':
        leads = await discoverWhoisNewDomainLeads(apiKey, dateString);
        break;

      default:
        leads = await discoverLocalMapDirectoryLeads(keyword || 'contractor', location || 'New York, NY');
        break;
    }

    res.json({
      success: true,
      channel: channel || 'directory_free',
      count: leads.length,
      leads
    });
  } catch (error) {
    console.error('Client pitch lead discovery error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to discover business leads' });
  }
});

// POST /api/client-pitch/generate-pitch - Craft high-converting proposal & cold email
router.post('/generate-pitch', optionalAuth, async (req, res) => {
  try {
    const { businessName, location, serviceNiche, websiteStatus, domain, ownerName, groqApiKey } = req.body;

    if (!businessName) {
      return res.status(400).json({ error: 'Business name is required' });
    }

    const pitch = await generateWebsitePitch({
      businessName,
      location,
      serviceNiche,
      websiteStatus,
      domain,
      ownerName,
      groqApiKey
    });

    res.json({
      success: true,
      pitch
    });
  } catch (error) {
    console.error('Pitch generation error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to generate website development pitch' });
  }
});

// GET /api/client-pitch/saved - Retrieve saved leads for the user
router.get('/saved', requireAuth, async (req, res) => {
  try {
    const savedLeads = await ClientLead.find({ user: req.userId }).sort({ updatedAt: -1 });
    res.json({ success: true, count: savedLeads.length, leads: savedLeads });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/client-pitch/save - Save or update lead in repository
router.post('/save', requireAuth, async (req, res) => {
  try {
    const { leadData } = req.body;
    if (!leadData || !leadData.businessName) {
      return res.status(400).json({ error: 'Valid lead data is required' });
    }

    const saved = await ClientLead.findOneAndUpdate(
      { user: req.userId, businessName: leadData.businessName },
      {
        ...leadData,
        user: req.userId,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, lead: saved });
  } catch (error) {
    console.error('Save lead error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/client-pitch/delete/:id - Remove lead from saved list
router.delete('/delete/:id', requireAuth, async (req, res) => {
  try {
    await ClientLead.findOneAndDelete({ _id: req.params.id, user: req.userId });
    res.json({ success: true, message: 'Lead removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
