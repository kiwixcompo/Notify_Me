const mongoose = require('mongoose');

const predefinedFeedSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true }, // e.g., 'remote-jobs', 'scholarships', 'tech-jobs', etc.
  type: { type: String, enum: ['job', 'scholarship'], required: true },
  url: { type: String, required: true },
  source: { type: String }, // e.g., 'Remote.co', 'Indeed', 'Scholarship.com'
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PredefinedFeed', predefinedFeedSchema); 