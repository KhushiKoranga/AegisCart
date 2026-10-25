// Firebase Cloud Messaging. Used only to send push notifications, never as a database.
const fs = require('fs');
const path = require('path');
const environment = require('../config/environment');

let messaging = null;

function getMessaging() {
  if (messaging) return messaging;
  if (!environment.firebaseServiceAccountPath) return null; // push is optional

  const firebaseAdmin = require('firebase-admin');
  const filePath = path.resolve(environment.firebaseServiceAccountPath);
  const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  firebaseAdmin.initializeApp({ credential: firebaseAdmin.credential.cert(serviceAccount) });
  messaging = firebaseAdmin.messaging();
  return messaging;
}

async function sendPush(token, { title, body }) {
  const firebaseMessaging = getMessaging();
  if (!firebaseMessaging || !token) return;
  await firebaseMessaging.send({ token, notification: { title, body } });
}

// FCM accepts at most 500 tokens per request.
async function sendPushToMany(tokens, { title, body }) {
  const firebaseMessaging = getMessaging();
  if (!firebaseMessaging) return;
  for (let start = 0; start < tokens.length; start += 500) {
    const batch = tokens.slice(start, start + 500);
    await firebaseMessaging.sendEachForMulticast({ tokens: batch, notification: { title, body } });
  }
}

module.exports = { sendPush, sendPushToMany };
