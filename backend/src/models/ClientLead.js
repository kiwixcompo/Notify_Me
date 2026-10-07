const mongoose = require('mongoose');

const clientLeadSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  websiteStatus: {
    type: String,
    enum: ['no_website', 'needs_redesign', 'new_domain_no_site', 'unverified'],
    default: 'no_website'
  },
  domain: {
    type: String,
    trim: true,
    default: ''
  },
  sourceChannel: {
    type: String,
    enum: [
      'google_places',
      'outscraper_b2b',
      'facebook_pages',
      'yellowpages_directory',
      'whois_new_domains',
      'manual'
    ],
    default: 'yellowpages_directory'
  },
  status: {
    type: String,
    enum: ['discovered', 'pitch_generated', 'contacted', 'negotiating', 'won', 'declined'],
    default: 'discovered'
  },
  pitchDeck: {
    subject: { type: String, default: '' },
    body: { type: String, default: '' },
    suggestedServices: [{ type: String }],
    estimatedValue: { type: String, default: '' }
  },
  notes: {
    type: String,
    default: ''
  },
  firstSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

clientLeadSchema.index({ businessName: 1, email: 1, user: 1 });

module.exports = mongoose.model('ClientLead', clientLeadSchema);
