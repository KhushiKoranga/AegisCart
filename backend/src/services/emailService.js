const nodemailer = require('nodemailer');
const environment = require('../config/environment');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { host, port, user, pass } = environment.smtp;
  if (!host) return null; // email is optional
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });
  return transporter;
}

// Does nothing (and does not fail) when SMTP is not configured.
async function sendEmail({ to, subject, text }) {
  const mailTransporter = getTransporter();
  if (!mailTransporter) return;
  await mailTransporter.sendMail({ from: environment.smtp.from || environment.smtp.user, to, subject, text });
}

module.exports = { sendEmail };
