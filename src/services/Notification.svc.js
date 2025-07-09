const admin = require('../firebase');

const sendPushNotification = async (token, title, body) => {
  const message = {
    notification: { title, body },
    token
  };

  try {
    await admin.messaging().send(message);
    console.log('Notification sent');
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
};


module.exports = sendPushNotification;