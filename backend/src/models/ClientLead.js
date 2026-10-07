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
    enum: ['no_website', 'needs_redesign', 'new_domain_no_site', 'parked_domain', 'unverified'],
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
      'google_maps_free',
      'social_only',
      'yellowpages_directory',
      'parked_domains_free',
      'google_places',
      'outscraper_b2b',
      'facebook_pages',
      'whois_new_domains',
      'manual'
    ],
    default: 'yellowpages_directory'
  },
  verification: {
    isLegitimate: { type: Boolean, default: true },
    confidenceScore: { type: Number, default: 0 },
    verifiedAt: { type: Date, default: Date.now },
    checks: {
      phoneVerified: { type: Boolean, default: false },
      addressVerified: { type: Boolean, default: false },
      activitySignals: { type: String, default: '' },
      summary: { type: String, default: '' }
    }
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
