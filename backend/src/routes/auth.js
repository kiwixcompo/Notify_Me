const express = require('express');
const { register, login, loginLimiter, forgotPassword, resetPassword } = require('../controllers/authController');
const router = express.Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', loginLimiter, login);

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// PUT /api/auth/reset-password/:token
router.put('/reset-password/:token', resetPassword);

module.exports = router; 