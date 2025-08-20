const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const JWT_SECRET = process.env.JWT_SECRET;

// Helper to provision default feeds for a new user
async function provisionDefaultFeedsForUser(userId) {
	try {
		const PredefinedFeed = require('../models/PredefinedFeed');
		const RssFeed = require('../models/RssFeed');

		// Fetch active defaults (both jobs and scholarships)
		let defaultFeeds = await PredefinedFeed.find({
			isActive: true,
			category: { $in: ['default-jobs', 'default-scholarships'] }
		});

		// Fallback to hard-coded defaults if DB is empty
		if (!defaultFeeds || defaultFeeds.length === 0) {
			defaultFeeds = [
				{ name: 'Jobs Found', url: 'https://rss.app/feeds/Ved3zhgCZQ7I2XNo.xml', type: 'job', category: 'default-jobs' },
				{ name: 'Himalayas', url: 'https://himalayas.app/jobs/rss', type: 'job', category: 'default-jobs' },
				{ name: 'Jobicy', url: 'https://jobicy.com/feed/job_feed', type: 'job', category: 'default-jobs' },
				{ name: 'Scholarships Region', url: 'https://rss.app/feeds/VxzvBe8gQnW32JhP.xml', type: 'scholarship', category: 'default-scholarships' },
				{ name: 'Scholarships and Aid', url: 'https://rss.app/feeds/dh2Nxk5zrvEhzRd3.xml', type: 'scholarship', category: 'default-scholarships' }
			];
		}

		// Upsert feeds for this user, avoiding duplicates
		for (const predefined of defaultFeeds) {
			const existing = await RssFeed.findOne({ user: userId, url: predefined.url });
			if (existing) continue;

			// Detect content type heuristically
			const lower = (predefined.url || '').toLowerCase();
			let contentType = 'rss';
			let isXML = false;
			if (lower.endsWith('.xml')) { contentType = 'xml'; isXML = true; }
			else if (lower.endsWith('.json')) { contentType = 'json'; }
			else if (lower.endsWith('.csv')) { contentType = 'csv'; }

			await RssFeed.create({
				user: userId,
				url: predefined.url,
				name: predefined.name,
				type: predefined.type,
				category: predefined.category,
				isXML,
				contentType
			});
		}
	} catch (err) {
		// Do not fail user registration/login if provisioning defaults fails
		console.error('Failed to provision default feeds for user:', err.message);
	}
}

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

    // Provision default feeds for this new user (non-blocking)
    provisionDefaultFeedsForUser(user._id).catch(() => {});

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

    // If user has no feeds yet, provision defaults silently
    try {
      const RssFeed = require('../models/RssFeed');
      const count = await RssFeed.countDocuments({ user: user._id });
      if (count === 0) {
        provisionDefaultFeedsForUser(user._id).catch(() => {});
      }
    } catch (_) {}

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, loginLimiter }; 