const mongoose = require('mongoose');

const scholarshipSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  link: { type: String },
  pubDate: { type: Date },
  feed: { type: mongoose.Schema.Types.ObjectId, ref: 'RssFeed' },
  categories: [String],
  amount: { type: String }, // Scholarship amount
  deadline: { type: Date }, // Application deadline
  eligibility: { type: String }, // Eligibility criteria
  level: { type: String }, // Undergraduate, Graduate, PhD, etc.
  country: { type: String }, // Country of the scholarship
  field: { type: String }, // Field of study
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scholarship', scholarshipSchema); 