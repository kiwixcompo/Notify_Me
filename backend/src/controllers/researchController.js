const { gatherJobIntelligence } = require('../services/searchService');
const { synthesizeJobResearch } = require('../services/researchSynthesizer');
const JobResearch = require('../models/JobResearch');
const Job = require('../models/Job');

/**
 * Executes or retrieves deep company and recruiter research for a job
 * POST /api/job-hunter/research/:jobId
 * or POST /api/jobs/:jobId/research
 */
async function handleJobResearch(req, res) {
  try {
    const { jobId } = req.params;
    const {
      title,
      company,
      url,
      description,
      location,
      forceRefresh = false,
      gemini_api_key,
      serper_api_key
    } = req.body;

    const targetTitle = (title || 'Software Engineer').trim();
    const targetCompany = (company || 'Employer').trim();
    const targetUrl = url || '';
    const targetDesc = description || '';

    // 1. Check if research is already cached in MongoDB (unless forceRefresh is true)
    if (!forceRefresh) {
      // Look up by jobId or company+title
      const cached = await JobResearch.findOne({
        $or: [
          { jobId: jobId },
          { companyName: new RegExp(`^${targetCompany}$`, 'i'), jobTitle: new RegExp(`^${targetTitle}$`, 'i') }
        ]
      }).sort({ updatedAt: -1 });

      if (cached && cached.dossier) {
        return res.json({
          success: true,
          cached: true,
          data: cached.dossier,
          engine: cached.engineUsed,
          lastUpdated: cached.updatedAt
        });
      }
    }

    // 2. Stage 1-3: Gather real-time ground truth search data via Multi-Vector search
    const searchData = await gatherJobIntelligence(
      targetCompany,
      targetTitle,
      location || '',
      serper_api_key || ''
    );

    // 3. Stage 4: Synthesize using Gemini / Groq LLM
    const { dossier, engine } = await synthesizeJobResearch({
      jobTitle: targetTitle,
      companyName: targetCompany,
      jobUrl: targetUrl,
      jobDescription: targetDesc,
      searchData,
      geminiApiKey: gemini_api_key || ''
    });

    // 4. Save/Update dossier in database cache
    const totalResults =
      (searchData.careerResults?.length || 0) +
      (searchData.recruiterResults?.length || 0) +
      (searchData.salaryResults?.length || 0);

    await JobResearch.findOneAndUpdate(
      { jobId: jobId },
      {
        jobId,
        companyName: targetCompany,
        jobTitle: targetTitle,
        jobUrl: targetUrl,
        dossier,
        searchVectorCount: totalResults,
        engineUsed: engine,
        requestedBy: req.userId || null
      },
      { upsert: true, new: true }
    );

    // Also update Job model if job exists in user's pipeline
    try {
      await Job.findOneAndUpdate(
        { wwrJobId: jobId },
        {
          notes: dossier.compensation?.estimatedRange
            ? `Estimated Pay: ${dossier.compensation.estimatedRange}`
            : ''
        }
      );
    } catch (dbErr) {
      // Non-fatal
    }

    return res.status(200).json({
      success: true,
      cached: false,
      data: dossier,
      engine,
      searchVectorCount: totalResults
    });
  } catch (error) {
    console.error('Job research pipeline failed:', error);
    return res.status(500).json({
      error: 'Failed to conduct job research. ' + (error.message || '')
    });
  }
}

/**
 * GET /api/job-hunter/research/:jobId
 * Quick check if research exists without triggering search
 */
async function getJobResearch(req, res) {
  try {
    const { jobId } = req.params;
    const research = await JobResearch.findOne({ jobId }).sort({ updatedAt: -1 });
    if (!research) {
      return res.status(404).json({ error: 'No research dossier found for this job ID.' });
    }
    return res.json({
      success: true,
      data: research.dossier,
      engine: research.engineUsed,
      lastUpdated: research.updatedAt
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch job research.' });
  }
}

module.exports = {
  handleJobResearch,
  getJobResearch
};
