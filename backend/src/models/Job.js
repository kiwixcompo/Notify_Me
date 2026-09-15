const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  wwrJobId: { type: String, unique: true, required: true },
  title: String,
  link: String,
  description: String,
  publishedDate: Date,
  firstSeen: { type: Date, default: Date.now },
  notifiedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  company: { type: String, default: 'Direct Employer' },
  location: { type: String, default: 'Remote' },
  status: { 
    type: String, 
    enum: ['saved', 'applied', 'interviewing', 'offer', 'rejected'],
    default: 'saved'
  },
  matchScore: { type: Number, default: 0 },
  matchReasons: [String],
  notes: { type: String, default: '' },
  source: { type: String, default: 'direct_web' },
  feedUrl: String
});

module.exports = mongoose.model('Job', jobSchema); 