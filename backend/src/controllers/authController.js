const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

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
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    
    const { email, password, name, phone } = req.body;
    
    // Log the raw body for debugging
    console.log('Raw body received:', {
      email: typeof email,
      password: typeof password,
      name: typeof name,
      phone: typeof phone
    });
    
    console.log('Registration attempt with:', { email, name, phone, hasPassword: !!password });
    
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      console.log('Name validation failed');
      return res.status(400).json({ error: 'Name is required and must be at least 2 characters.' });
    }
    
    if (!email || !validator.isEmail(email)) {
      console.log('Email validation failed');
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    
    if (!password || typeof password !== 'string') {
      console.log('Password validation failed - missing or invalid type');
      return res.status(400).json({ error: 'Password is required.' });
    }
    
    if (!validator.isStrongPassword(password, { minLength: 8 })) {
      console.log('Password strength validation failed');
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long and include a mix of uppercase, lowercase, numbers, and symbols.' 
      });
    }
    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('Registration failed: Email already exists', { email });
      return res.status(400).json({ error: 'Email already registered.' });
    }

    try {
      // Hash the password
      console.log('Hashing password...');
      const passwordHash = await bcrypt.hash(password, 10);
      
      console.log('Creating user...');
      const user = await User.create({
        name: name.trim(),
        phone: (phone || '').trim(),
        email: email.trim().toLowerCase(),
        passwordHash
      });

      console.log('User created successfully:', { userId: user._id, email: user.email });

      // Provision default feeds for this new user (non-blocking)
      provisionDefaultFeedsForUser(user._id)
        .then(() => console.log('Default feeds provisioned for user:', user._id))
        .catch(err => console.error('Error provisioning default feeds:', err));

      const token = jwt.sign(
        { userId: user._id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        message: 'Registration successful.',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      });
    } catch (err) {
      console.error('Error during user creation:', {
        error: err.message,
        stack: err.stack,
        email: email,
        name: name,
        hasPassword: !!password
      });
      throw err; // Let the error be handled by the outer catch
    }
  } catch (err) {
    console.error('Registration error:', {
      error: err.message,
      stack: err.stack,
      email: email,
      name: name,
      hasPassword: !!password
    });
    
    // More specific error handling
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: err.message 
      });
    }
    
    // Default error response
    res.status(500).json({ 
      error: 'Registration failed. Please try again later.' 
    });
  }
}

// Login handler
async function login(req, res, next) {
  try {
    console.log('Login attempt - Request body:', JSON.stringify(req.body, null, 2));
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('Login failed: Missing email or password');
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    
    if (!validator.isEmail(email)) {
      console.log('Login failed: Invalid email format', { email });
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    
    if (typeof password !== 'string') {
      console.log('Login failed: Password must be a string');
      return res.status(400).json({ error: 'Invalid password format.' });
    }
    console.log('Looking up user with email:', email);
    const user = await User.findOne({ email }).select('+passwordHash');
    
    if (!user) {
      console.log('Login failed: No user found with email', email);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    console.log('User found, comparing password...');
    try {
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        console.log('Login failed: Password does not match');
        return res.status(401).json({ error: 'Invalid credentials.' });
      }
      console.log('Password matches, generating token...');
    } catch (bcryptErr) {
      console.error('Error comparing passwords:', {
        error: bcryptErr.message,
        stack: bcryptErr.stack,
        passwordLength: password ? password.length : 0,
        passwordHashExists: !!user.passwordHash,
        passwordHashType: typeof user.passwordHash,
        passwordHashLength: user.passwordHash ? user.passwordHash.length : 0
      });
      return res.status(500).json({ error: 'Error processing login.' });
    }

    // If user has no feeds yet, provision defaults silently
    try {
      const RssFeed = require('../models/RssFeed');
      const count = await RssFeed.countDocuments({ user: user._id });
      if (count === 0) {
        console.log('Provisioning default feeds for user:', user._id);
        provisionDefaultFeedsForUser(user._id)
          .then(() => console.log('Successfully provisioned default feeds for user:', user._id))
          .catch(err => console.error('Error provisioning default feeds:', err));
      }
    } catch (feedErr) {
      console.error('Error in feed provisioning:', feedErr);
      // Continue with login even if feed provisioning fails
    }

    try {
      console.log('Generating JWT token for user:', user._id);
      if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
      }
      
      const token = jwt.sign(
        { userId: user._id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      console.log('Login successful for user:', user.email);
      return res.json({ 
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      });
    } catch (tokenErr) {
      console.error('Error generating JWT token:', {
        error: tokenErr.message,
        stack: tokenErr.stack,
        userId: user._id,
        hasJwtSecret: !!JWT_SECRET
      });
      throw new Error('Failed to generate authentication token');
    }
  } catch (err) {
    console.error('Login error:', {
      error: err.message,
      stack: err.stack,
      email: email,
      hasPassword: !!password
    });
    
    // Don't expose internal errors to the client
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Login failed: ${err.message}`
      : 'Login failed. Please try again.';
      
    res.status(500).json({ error: errorMessage });
  }
}

// Forgot Password handler
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'There is no user with that email.' });
    }

    // Generate token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const resetBase = process.env.FRONTEND_URL || 'https://notify-me-rw.netlify.app';
    const resetUrl = `${resetBase}/reset-password?token=${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;
    const htmlMessage = `
      <h3>Password Reset Request</h3>
      <p>You requested a password reset. Please click the button below to reset your password:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
    `;

    try {
      const sendEmail = require('../utils/sendEmail');
      await sendEmail({
        email: user.email,
        subject: 'Notify Me - Password Reset Token',
        message,
        html: htmlMessage
      });

      res.status(200).json({ success: true, data: 'Email sent' });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ error: 'Email could not be sent' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Reset Password handler
async function resetPassword(req, res, next) {
  try {
    const crypto = require('crypto');
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid token or token expired' });
    }

    // Set new password
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Generate new token and login immediately
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ success: true, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { register, login, loginLimiter, forgotPassword, resetPassword }; 