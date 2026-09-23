const { findAcademicProfiles } = require('../services/academicSearchService');
const { synthesizeAcademicDossier } = require('../services/supervisorSynthesizer');

/**
 * Discovers academic supervisors, lab heads, and graduate program chairs via multi-vector Google Dorks & Gemini
 * POST /api/supervisors/discover
 * or POST /api/scholarships/supervisors/discover
 */
async function handleSupervisorSearch(req, res) {
  try {
    const { topic, country, serper_api_key, gemini_api_key } = req.body;

    if (!topic || topic.trim().length < 3) {
      return res.status(400).json({ error: 'Please provide a valid research topic or study field.' });
    }

    const cleanTopic = topic.trim();
    const cleanCountry = (country || '').trim();

    console.log(`[Supervisor Finder] Querying for: "${cleanTopic}" in "${cleanCountry || 'Worldwide'}"`);

    // 1. Run the multi-vector dorking engine
    const searchData = await findAcademicProfiles(cleanTopic, cleanCountry, serper_api_key || '');

    // 2. Synthesize with Gemini / Groq
    const resultDossier = await synthesizeAcademicDossier(cleanTopic, searchData, gemini_api_key || '');

    const profiles = resultDossier?.profiles || [];

    return res.status(200).json({
      success: true,
      topic: cleanTopic,
      country: cleanCountry,
      count: profiles.length,
      data: profiles
    });
  } catch (error) {
    console.error('Supervisor discovery failed:', error);
    return res.status(500).json({ error: 'Failed to discover academic contacts. ' + (error.message || '') });
  }
}

module.exports = {
  handleSupervisorSearch
};
