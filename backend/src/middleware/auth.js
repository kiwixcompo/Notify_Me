const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization) {
    const auth = req.headers.authorization;
    token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth.trim();
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const uid = decoded.id || decoded.userId || decoded._id;
    req.user = await User.findById(uid);
    req.userId = uid;
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      error: isExpired ? 'Session expired. Please log in again.' : 'Not authorized to access this route',
      code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};
