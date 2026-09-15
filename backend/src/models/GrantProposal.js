const mongoose = require('mongoose');

const grantProposalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  fieldOfStudy: {
    type: String,
    required: true
  },
  coreIdea: {
    type: String,
    required: true
  },
  targetFunder: {
    type: String,
    default: 'National / International Research Council'
  },
  durationMonths: {
    type: Number,
    default: 24
  },
  requestedBudget: {
    type: Number,
    default: 150000
  },
  proposalContent: {
    type: String,
    default: ''
  },
  budgetBreakdown: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'completed', 'submitted', 'awarded'],
    default: 'draft'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GrantProposal', grantProposalSchema);
