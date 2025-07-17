const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  wwrJobId: { type: String, unique: true, required: true },
  title: String,
  link: String,
  description: String,
  publishedDate: Date,
  firstSeen: { type: Date, default: Date.now },
  notifiedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  source: { type: String, enum: ['rss'], default: 'rss' },
  feedUrl: String // New: which RSS feed this job came from
});

module.exports = mongoose.model('Job', jobSchema); 