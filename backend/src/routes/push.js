const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../controllers/userController');
const webpush = require('web-push');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      `mailto:${process.env.EMAIL_FROM || 'test@example.com'}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (err) {
    console.error('Failed to configure web-push:', err);
  }
} else {
  console.warn('WARNING: VAPID keys are missing. Push notifications will not work.');
}

// POST /api/push/subscribe
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const subscription = req.body;
    
    // Save subscription to the user model
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if subscription already exists to avoid duplicates
    const exists = user.pushSubscriptions.some(
      sub => sub.endpoint === subscription.endpoint
    );
    
    if (!exists) {
      user.pushSubscriptions.push(subscription);
      await user.save();
    }
    
    res.status(201).json({ success: true, message: 'Subscribed successfully.' });
  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ error: 'Failed to subscribe.' });
  }
});

// For testing purposes
router.post('/test', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.pushSubscriptions.length === 0) {
      return res.status(400).json({ error: 'No active push subscriptions found.' });
    }

    const payload = JSON.stringify({
      title: 'Test Notification',
      body: 'This is a test notification from Notify Me!',
      icon: '/icon512_rounded.png',
      url: '/dashboard'
    });

    const sendPromises = user.pushSubscriptions.map(sub => 
      webpush.sendNotification(sub, payload).catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or invalid
          console.log('Subscription expired, removing...');
          user.pushSubscriptions = user.pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
        } else {
          console.error('Error sending notification:', err);
        }
      })
    );

    await Promise.all(sendPromises);
    await user.save();
    
    res.status(200).json({ success: true, message: 'Test notification sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send test notification.' });
  }
});

module.exports = router;
