const mongoose = require('mongoose');

const rssFeedSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  name: { type: String },
  apiBackupUrl: { type: String }, // Optional API backup URL
  type: { type: String, enum: ['job', 'scholarship'], default: 'job' }, // New field to distinguish feed types
  category: { type: String }, // Category for predefined feeds
  isXML: { type: Boolean, default: false }, // Flag to indicate if this is an XML file
  contentType: { type: String, enum: ['rss', 'xml', 'atom'], default: 'rss' }, // Type of feed content
  xmlContent: { type: String }, // Store XML content for code-based feeds
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RssFeed', rssFeedSchema); 