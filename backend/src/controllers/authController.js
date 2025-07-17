const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

const JWT_SECRET = process.env.JWT_SECRET;

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: 'Too many login attempts. Please try again later.' }
});

// Registration handler
async function register(req, res, next) {
  try {
    const { email, password, name, phone } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }
    if (!validator.isStrongPassword(password, { minLength: 8 })) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and strong.' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      phone: phone || '',
      email,
      passwordHash
    });
    return res.status(201).json({ message: 'Registration successful.' });
  } catch (err) {
    next(err);
  }
}

// Login handler
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!validator.isEmail(email) || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, loginLimiter }; 