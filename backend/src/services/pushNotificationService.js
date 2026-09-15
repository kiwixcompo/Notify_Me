const webpush = require('web-push');
const User = require('../models/User');

let isConfigured = false;

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      mailto: + (process.env.EMAIL_FROM || 'test@example.com'),
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    isConfigured = true;
  } catch (err) {
    console.error('Failed to configure web-push:', err);
  }
}

async function sendPushNotification(user, payload) {
  if (!isConfigured) return;
  if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) return;

  const validSubscriptions = [];

  for (const subscription of user.pushSubscriptions) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      validSubscriptions.push(subscription);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.log(Push subscription expired or invalid for user , removing it.);
      } else {
        console.error('Error sending push notification:', err);
        validSubscriptions.push(subscription); // Keep it if it's a temporary error
      }
    }
  }

  // Update DB if any subscriptions were removed
  if (validSubscriptions.length !== user.pushSubscriptions.length) {
    await User.updateOne({ _id: user._id }, { $set: { pushSubscriptions: validSubscriptions } });
  }
}

module.exports = { sendPushNotification };
