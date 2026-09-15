const User = require('../models/User');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const JWT_SECRET = process.env.JWT_SECRET;

// Auth middleware
async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const token = auth.split(' ')[1];
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload && payload.userId) {
        req.userId = payload.userId;
        return next();
      }
    } catch (err) {
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ error: 'Not authorized, no token' });
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

module.exports = { requireAuth, getPreferences, updatePreferences }; 