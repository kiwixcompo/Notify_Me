const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const { requireAuth } = require('../controllers/userController');
const sendEmail = require('../utils/sendEmail');

// Admin authorization middleware
async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
    }
    req.adminUser = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify admin privileges.' });
  }
}

// GET /api/admin/users - List all users with filtering
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query = {
        $or: [{ name: regex }, { email: regex }]
      };
    }

    const users = await User.find(query)
      .select('name email phone role createdAt updatedAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error('Admin fetch users error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch users.' });
  }
});

// PUT /api/admin/users/:id/password - Admin directly changes user password
router.put('/users/:id/password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { passwordHash, updatedAt: new Date() },
      { new: true }
    ).select('name email role');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true, message: 'Password for ' + user.name + ' (' + user.email + ') updated successfully.' });
  } catch (err) {
    console.error('Admin update password error:', err);
    res.status(500).json({ error: err.message || 'Failed to update user password.' });
  }
});

// POST /api/admin/users/:id/send-reset - Admin sends a password reset link email to the user
router.post('/users/:id/send-reset', requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour expiration
    await user.save({ validateBeforeSave: false });

    const frontendBase = process.env.FRONTEND_URL || 'https://notify-me-rw.netlify.app';
    const resetUrl = frontendBase + '/reset-password?token=' + resetToken;

    const htmlMessage = '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">' +
      '<div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 24px; color: #ffffff; text-align: center;">' +
        '<h2 style="margin: 0; font-size: 20px; font-weight: 800;">Password Reset Notification</h2>' +
        '<p style="margin: 6px 0 0 0; font-size: 13px; color: #bfdbfe;">Notify_Me Security Center</p>' +
      '</div>' +
      '<div style="padding: 24px;">' +
        '<p style="font-size: 15px; color: #334155; margin-top: 0;">Hello <strong>' + user.name + '</strong>,</p>' +
        '<p style="font-size: 14px; color: #475569; line-height: 1.6;">An administrator has requested a password reset for your account. Click the button below to choose a new password:</p>' +
        '<div style="text-align: center; margin: 24px 0;">' +
          '<a href="' + resetUrl + '" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 6px -1px rgba(37,99,235,0.2);">Reset My Password</a>' +
        '</div>' +
        '<p style="font-size: 12px; color: #64748b; line-height: 1.5;">Or copy and paste this link into your browser:<br/><a href="' + resetUrl + '" style="color: #2563eb; word-break: break-all;">' + resetUrl + '</a></p>' +
        '<div style="margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 12px; color: #64748b; text-align: center;">This link will expire in 1 hour. If you did not request this, please contact your administrator.</div>' +
      '</div>' +
    '</div>';

    await sendEmail({
      email: user.email,
      subject: 'Notify Me - Your Password Reset Link',
      message: 'Hello ' + user.name + ',\n\nAn administrator has requested a password reset for your account. Reset your password using the link below:\n\n' + resetUrl + '\n\nThis link will expire in 1 hour.',
      html: htmlMessage
    });

    res.json({ success: true, message: 'Password reset link sent to ' + user.email });
  } catch (err) {
    console.error('Admin send reset email error:', err);
    res.status(500).json({ error: err.message || 'Failed to send password reset email.' });
  }
});

// PUT /api/admin/users/:id/role - Admin change user role
router.put('/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'publisher', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, updatedAt: new Date() },
      { new: true }
    ).select('name email role');

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ success: true, message: 'Role for ' + user.name + ' updated to ' + role, user });
  } catch (err) {
    console.error('Admin update role error:', err);
    res.status(500).json({ error: err.message || 'Failed to update user role.' });
  }
});

// DELETE /api/admin/users/:id - Admin deletes a registered user's account
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.userId.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    try {
      const RssFeed = require('../models/RssFeed');
      const WebsiteLink = require('../models/WebsiteLink');
      const JobAlert = require('../models/JobAlert');
      const Job = require('../models/Job');

      await Promise.all([
        RssFeed.deleteMany({ user: user._id }),
        WebsiteLink.deleteMany({ user: user._id }),
        JobAlert.deleteMany({ $or: [{ user: user._id }, { email: user.email }] }),
        Job.updateMany({ notifiedUsers: user._id }, { $pull: { notifiedUsers: user._id } })
      ]);
    } catch (cleanErr) {
      console.warn('Non-fatal error cleaning associated user data:', cleanErr.message);
    }

    res.json({ success: true, message: 'User account "' + user.name + '" (' + user.email + ') deleted successfully.' });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete user.' });
  }
});

// GET /api/admin/config - Get system configuration settings (e.g. GROQ_API_KEY status)
router.get('/config', requireAuth, requireAdmin, async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    const groqConfig = await SystemConfig.findOne({ key: 'GROQ_API_KEY' });
    const groqValue = (groqConfig && groqConfig.value) || process.env.GROQ_API_KEY || '';

    let maskedKey = '';
    if (groqValue) {
      if (groqValue.length > 8) {
        maskedKey = groqValue.substring(0, 4) + '...' + groqValue.substring(groqValue.length - 4);
      } else {
        maskedKey = '••••••••';
      }
    }

    res.json({
      success: true,
      config: {
        groq_api_key_configured: Boolean(groqValue),
        groq_api_key_masked: maskedKey,
        groq_api_key_source: groqConfig?.value ? 'database' : (process.env.GROQ_API_KEY ? 'environment' : 'none')
      }
    });
  } catch (err) {
    console.error('Admin get config error:', err);
    res.status(500).json({ error: err.message || 'Failed to load system configuration.' });
  }
});

// PUT /api/admin/config - Update system configuration settings
router.put('/config', requireAuth, requireAdmin, async (req, res) => {
  try {
    const SystemConfig = require('../models/SystemConfig');
    const { groq_api_key } = req.body;

    if (groq_api_key !== undefined) {
      const trimmed = groq_api_key.trim();
      await SystemConfig.findOneAndUpdate(
        { key: 'GROQ_API_KEY' },
        { 
          key: 'GROQ_API_KEY', 
          value: trimmed, 
          description: 'Universal Groq API key for system-wide AI features',
          updatedBy: req.userId 
        },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, message: 'System configuration updated successfully.' });
  } catch (err) {
    console.error('Admin update config error:', err);
    res.status(500).json({ error: err.message || 'Failed to update system configuration.' });
  }
});

module.exports = router;
