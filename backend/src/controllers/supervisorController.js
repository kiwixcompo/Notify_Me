const { findAcademicProfiles } = require('../services/academicSearchService');
const { synthesizeAcademicDossier } = require('../services/supervisorSynthesizer');

/**
 * Discovers academic supervisors, lab heads, and graduate program chairs via multi-vector Google Dorks & Gemini
 * POST /api/supervisors/discover
 * or POST /api/scholarships/supervisors/discover
 */
async function handleSupervisorSearch(req, res) {
  try {
    const { topic, country, recruitment_timeframe, serper_api_key, gemini_api_key } = req.body;

    if (!topic || topic.trim().length < 3) {
      return res.status(400).json({ error: 'Please provide a valid research topic or study field.' });
    }

    const cleanTopic = topic.trim();
    const cleanCountry = (country || '').trim();
    const cleanTimeframe = (recruitment_timeframe || '').trim();

    console.log(`[Supervisor Finder] Querying for: "${cleanTopic}" in "${cleanCountry || 'Worldwide'}" (Timeframe: "${cleanTimeframe || 'Any'}")`);

    // 1. Run the multi-vector dorking engine with timeframe filtering
    const searchData = await findAcademicProfiles(cleanTopic, cleanCountry, serper_api_key || '', cleanTimeframe);

    // 2. Synthesize with Gemini / Groq / Heuristic (Senior Lecturer Outreach Guidelines)
    const resultDossier = await synthesizeAcademicDossier(cleanTopic, searchData, gemini_api_key || '');

    const allProfiles = resultDossier?.profiles || [];

    // Optional page & limit parameters for pagination
    const page = parseInt(req.body.page || req.query.page || '1', 10);
    const limit = parseInt(req.body.limit || req.query.limit || '8', 10);
    const startIndex = (page - 1) * limit;
    const paginatedProfiles = allProfiles.slice(startIndex, startIndex + limit);

    return res.status(200).json({
      success: true,
      topic: cleanTopic,
      country: cleanCountry,
      recruitment_timeframe: cleanTimeframe,
      totalCount: allProfiles.length,
      page,
      limit,
      totalPages: Math.ceil(allProfiles.length / limit) || 1,
      count: paginatedProfiles.length,
      data: paginatedProfiles,
      allData: allProfiles
    });
  } catch (error) {
    console.error('Supervisor discovery failed:', error);
    return res.status(500).json({ error: 'Failed to discover academic contacts. ' + (error.message || '') });
  }
}

module.exports = {
  handleSupervisorSearch
};
