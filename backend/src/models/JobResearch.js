const mongoose = require('mongoose');

const jobResearchSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    index: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  jobTitle: {
    type: String,
    required: true,
    trim: true
  },
  jobUrl: {
    type: String,
    default: ''
  },
  dossier: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  searchVectorCount: {
    type: Number,
    default: 0
  },
  engineUsed: {
    type: String,
    default: 'gemini'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index to quickly look up research by job ID or company+title
jobResearchSchema.index({ companyName: 1, jobTitle: 1 });

const JobResearch = mongoose.model('JobResearch', jobResearchSchema);
module.exports = JobResearch;
