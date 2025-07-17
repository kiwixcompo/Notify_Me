const mongoose = require('mongoose');

const rssFeedSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  name: { type: String },
  apiBackupUrl: { type: String }, // Optional API backup URL
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RssFeed', rssFeedSchema); 