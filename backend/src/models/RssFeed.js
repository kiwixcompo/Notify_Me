const mongoose = require('mongoose');

const rssFeedSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  name: { type: String },
  source: { type: String }, // Source website/hostname
  description: { type: String }, // Optional description
  apiBackupUrl: { type: String }, // Optional API backup URL
  type: { type: String, enum: ['job', 'scholarship'], default: 'job' }, // Type of feed
  category: { type: String, default: 'custom' }, // Category for predefined feeds
  isXML: { type: Boolean, default: false }, // Flag to indicate if this is an XML file
  isDynamic: { type: Boolean, default: false }, // Flag for dynamically generated feeds
  lastFetched: { type: Date }, // When the feed was last fetched
  fetchInterval: { type: Number, default: 3600 }, // In seconds, default 1 hour
  contentType: { 
    type: String, 
    enum: ['rss', 'xml', 'atom', 'json', 'csv', 'html'], 
    default: 'rss' 
  },
  xmlContent: { type: String }, // Store XML content for code-based feeds
  keywords: [{ type: String }], // Keywords to filter this specific feed
  isActive: { type: Boolean, default: true }, // Enable/disable feed
  lastError: { type: String }, // Last error message if any
  errorCount: { type: Number, default: 0 }, // Consecutive error count
  lastSuccess: { type: Date }, // Last successful fetch
  nextFetchAt: { type: Date }, // When to fetch next
  metadata: { type: mongoose.Schema.Types.Mixed }, // Additional metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better query performance
rssFeedSchema.index({ user: 1, type: 1 });
rssFeedSchema.index({ url: 1 }, { unique: true });
rssFeedSchema.index({ nextFetchAt: 1 });
rssFeedSchema.index({ isActive: 1 });

// Pre-save hook to update timestamps
rssFeedSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('RssFeed', rssFeedSchema); 