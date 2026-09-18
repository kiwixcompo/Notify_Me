const mongoose = require('mongoose');

const jobAlertSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  email: { type: String, required: true, trim: true, lowercase: true },
  keywords: { type: String, required: true, trim: true },
  location: { type: String, default: 'Remote', trim: true },
  frequency: { type: String, enum: ['instant', 'daily', 'weekly'], default: 'instant' },
  isActive: { type: Boolean, default: true },
  lastNotifiedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

jobAlertSchema.index({ email: 1, keywords: 1 }, { unique: true });

module.exports = mongoose.model('JobAlert', jobAlertSchema);
