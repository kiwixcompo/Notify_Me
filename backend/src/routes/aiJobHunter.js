const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const { requireAuth } = require('../controllers/userController');
const Job = require('../models/Job');

const upload = multer({ storage: multer.memoryStorage() });
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

// POST /api/job-hunter/search
// Search jobs across ATS/direct portals using Python AI microservice
router.post('/search', requireAuth, async (req, res) => {
  try {
    const { keywords, location, max_results, custom_urls } = req.body;
    const response = await axios.post(`${PYTHON_SERVICE_URL}/jobs/search`, {
      keywords: keywords || 'Software Engineer',
      location: location || 'Remote',
      max_results: max_results || 15,
      custom_urls: custom_urls || []
    }, { timeout: 30000 });

    res.json(response.data);
  } catch (error) {
    console.error('Job Hunter search error:', error.message);
    res.status(500).json({ error: error.response?.data?.detail || 'Failed to search jobs. Verify Python microservice is active.' });
  }
});

// POST /api/job-hunter/resume/upload and /api/job-hunter/parse-resume
// Parse and extract structured details from resume
const handleResumeUploadRoute = async (req, res) => {
  try {
    const uploadedFile = req.file;
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No resume file uploaded' });
    }

    const form = new FormData();
    form.append('file', uploadedFile.buffer, {
      filename: uploadedFile.originalname,
      contentType: uploadedFile.mimetype
    });

    const response = await axios.post(`${PYTHON_SERVICE_URL}/resume/parse`, form, {
      headers: { ...form.getHeaders() },
      timeout: 60000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Resume parse error:', error.message);
    res.status(500).json({ error: error.response?.data?.detail || 'Failed to parse resume document' });
  }
};

router.post('/resume/upload', requireAuth, upload.fields([{ name: 'resume', maxCount: 1 }, { name: 'file', maxCount: 1 }]), (req, res) => {
  req.file = (req.files?.resume && req.files.resume[0]) || (req.files?.file && req.files.file[0]);
  return handleResumeUploadRoute(req, res);
});

router.post('/parse-resume', requireAuth, upload.fields([{ name: 'resume', maxCount: 1 }, { name: 'file', maxCount: 1 }]), (req, res) => {
  req.file = (req.files?.resume && req.files.resume[0]) || (req.files?.file && req.files.file[0]);
  return handleResumeUploadRoute(req, res);
});

// POST /api/job-hunter/test-key
// Test if the provided Groq API key is valid and responsive
router.post('/test-key', requireAuth, async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/api/test-key`, req.body, { timeout: 20000 });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ valid: false, message: error.response?.data?.message || 'Failed to reach AI microservice.' });
  }
});

// POST /api/job-hunter/cover-letter
// Generate 1-click tailored cover letter or cold email
router.post('/cover-letter', requireAuth, async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/application/cover-letter`, req.body, { timeout: 45000 });
    res.json(response.data);
  } catch (error) {
    console.error('Cover letter generation error:', error.message);
    res.status(500).json({ error: 'Failed to generate cover letter.' });
  }
});

// POST /api/job-hunter/match-score
// Calculate semantic score and reasons
router.post('/match-score', requireAuth, async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/application/match-score`, req.body, { timeout: 20000 });
    res.json(response.data);
  } catch (error) {
    console.error('Match scoring error:', error.message);
    res.status(500).json({ error: 'Failed to compute match score.' });
  }
});

// GET /api/job-hunter/pipeline
// Get user tracked jobs in the pipeline
router.get('/pipeline', requireAuth, async (req, res) => {
  try {
    const jobs = await Job.find({ notifiedUsers: req.userId }).sort({ updatedAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/job-hunter/pipeline/save
// Save or update a job in pipeline
router.post('/pipeline/save', requireAuth, async (req, res) => {
  try {
    const { id, title, company, location, url, description, status, matchScore, matchReasons, notes } = req.body;
    const wwrJobId = id || `custom_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    let job = await Job.findOne({ wwrJobId });
    if (!job) {
      job = new Job({
        wwrJobId,
        title,
        company,
        location,
        link: url,
        description,
        status: status || 'saved',
        matchScore: matchScore || 0,
        matchReasons: matchReasons || [],
        notes: notes || '',
        notifiedUsers: [req.userId],
        source: 'ai_job_hunter'
      });
    } else {
      if (status) job.status = status;
      if (matchScore !== undefined) job.matchScore = matchScore;
      if (matchReasons) job.matchReasons = matchReasons;
      if (notes !== undefined) job.notes = notes;
      if (!job.notifiedUsers.includes(req.userId)) {
        job.notifiedUsers.push(req.userId);
      }
    }

    await job.save();
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/job-hunter/pipeline/clear
// Clearance feature: clears user's saved and pipeline jobs
router.delete('/pipeline/clear', requireAuth, async (req, res) => {
  try {
    const result = await Job.deleteMany({ notifiedUsers: req.userId });
    res.json({ success: true, message: 'All pipeline data cleared successfully.', deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
