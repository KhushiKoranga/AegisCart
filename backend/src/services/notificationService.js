const { query } = require('../config/database');
const emailService = require('./emailService');
const pushService = require('./pushService');

function logFailures(results, channelNames) {
  results.forEach((result, index) => {
    if (result.status === 'rejected') console.error(`${channelNames[index]} notification failed:`, result.reason.message);
  });
}

async function deliverNotification(userId, { title, body, type }) {
  const userResult = await query('SELECT email, fcm_token FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  if (!user) return;

  await query('INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, $4)', [userId, title, body, type]);

  const results = await Promise.allSettled([
    pushService.sendPush(user.fcmToken, { title, body }),
    emailService.sendEmail({ to: user.email, subject: title, text: body }),
  ]);
  logFailures(results, ['Push', 'Email']);
}

// Runs in the background, so a slow email server or a Firebase error never breaks checkout.
function notifyUser(userId, notification) {
  setImmediate(() => {
    deliverNotification(userId, notification).catch((error) => console.error('Notification failed:', error.message));
  });
}

// Used for flash sales: one row per customer, then one push message per device token.
function notifyAllCustomers({ title, body, type }) {
  setImmediate(async () => {
    try {
      await query(
        `INSERT INTO notifications (user_id, title, body, type)
         SELECT id, $1, $2, $3 FROM users WHERE role = 'CUSTOMER'`,
        [title, body, type]
      );
      const tokenResult = await query("SELECT fcm_token FROM users WHERE role = 'CUSTOMER' AND fcm_token IS NOT NULL");
      await pushService.sendPushToMany(tokenResult.rows.map((row) => row.fcmToken), { title, body });
    } catch (error) {
      console.error('Broadcast notification failed:', error.message);
    }
  });
}

async function listNotifications(userId) {
  const result = await query(
    'SELECT id, title, body, type, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [userId]
  );
  return result.rows;
}

async function markAllAsRead(userId) {
  await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [userId]);
}

async function savePushToken(userId, fcmToken) {
  await query('UPDATE users SET fcm_token = $2 WHERE id = $1', [userId, fcmToken]);
}

module.exports = { notifyUser, notifyAllCustomers, listNotifications, markAllAsRead, savePushToken };
