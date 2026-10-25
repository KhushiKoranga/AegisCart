// Reads all settings from environment variables in one place.
require('dotenv').config();

const env = process.env;

const settings = {
  nodeEnv: env.NODE_ENV || 'development',
  port: Number(env.PORT) || 5000,
  corsOrigins: (env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
  databaseUrl: env.DATABASE_URL,
  jwtAccessSecret: env.JWT_ACCESS_SECRET,
  accessTokenMinutes: Number(env.ACCESS_TOKEN_MINUTES) || 15,
  refreshTokenDays: Number(env.REFRESH_TOKEN_DAYS) || 30,
  reservationMinutes: Number(env.RESERVATION_MINUTES) || 15,
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  },
  smtp: {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT) || 587,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.EMAIL_FROM,
  },
  firebaseServiceAccountPath: env.FIREBASE_SERVICE_ACCOUNT_PATH,
  tryOn: {
    replicateApiToken: env.REPLICATE_API_TOKEN,
    replicateModelVersion: env.REPLICATE_MODEL_VERSION,
    retentionHours: Number(env.TRYON_RETENTION_HOURS) || 24,
  },
  privateStorageDir: env.PRIVATE_STORAGE_DIR || './storage/private',
};

// The app cannot run safely without these, so we stop at startup with a clear message.
function assertRequiredEnvironment() {
  const missing = [];
  if (!settings.databaseUrl) missing.push('DATABASE_URL');
  if (!settings.jwtAccessSecret) missing.push('JWT_ACCESS_SECRET');
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
  }
}

settings.assertRequiredEnvironment = assertRequiredEnvironment;
module.exports = settings;
