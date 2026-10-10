const User = require('../models/User');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

// Auth middleware
async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth) {
    try {
      const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth.trim();
      const payload = jwt.verify(token, JWT_SECRET);
      const uid = payload?.userId || payload?.id || payload?._id;
      if (uid) {
        req.userId = uid;
        req.user = payload;
        return next();
      }
    } catch (err) {
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        error: isExpired ? 'Session expired. Please log in again.' : 'Not authorized, token failed',
        code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
      });
    }
  }

  return res.status(401).json({ error: 'Not authorized, no token' });
}

// Optional Auth middleware (populates req.userId if valid token, but does not reject request)
async function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth) {
    try {
      const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth.trim();
      const payload = jwt.verify(token, JWT_SECRET);
      const uid = payload?.userId || payload?.id || payload?._id;
      if (uid) {
        req.userId = uid;
        req.user = payload;
      }
    } catch (err) {
      // Ignore token failure for optional routes
    }
  }
  return next();
}

// GET preferences
async function getPreferences(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ jobPreferences: user.jobPreferences });
  } catch (err) {
    next(err);
  }
}

// UPDATE preferences
async function updatePreferences(req, res, next) {
  try {
    let { jobPreferences } = req.body;
    if (!Array.isArray(jobPreferences)) jobPreferences = [];
    jobPreferences = jobPreferences.map(j => validator.escape(j.trim())).filter(j => j.length > 0);
    const user = await User.findByIdAndUpdate(
      req.userId,
      { jobPreferences, updatedAt: new Date() },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ jobPreferences: user.jobPreferences });
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth, optionalAuth, getPreferences, updatePreferences }; 