const mongoose = require('mongoose');

const websiteLinkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  url: {
    type: String,
    required: [true, 'Please provide a URL'],
    trim: true,
    match: [
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
      'Please provide a valid URL with HTTP or HTTPS'
    ]
  },
  title: {
    type: String,
    trim: true,
    default: ''
  },
  type: {
    type: String,
    enum: ['job', 'scholarship', 'other'],
    default: 'other'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastChecked: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster querying
websiteLinkSchema.index({ user: 1, type: 1 });

// Create and export the model
const WebsiteLink = mongoose.model('WebsiteLink', websiteLinkSchema);
module.exports = WebsiteLink;
