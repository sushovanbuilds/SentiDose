'use strict';

/**
 * Environment configuration, read once at boot.
 * Fails fast when a required variable is missing so a misconfigured
 * Cloud Run revision never serves traffic. Never logs secret values.
 */

const REQUIRED = /** @type {const} */ ([
  'SESSION_SECRET',
  'CRON_SECRET',
  'GOOGLE_CLOUD_PROJECT',
]);

/**
 * Read and validate process.env.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {Record<string, string|number|boolean>} validated config
 * @throws {Error} when a required variable is absent
 */
function loadConfig(env = process.env) {
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    nodeEnv: env.NODE_ENV || 'development',
    port: Number(env.PORT) || 8080,
    isProduction: env.NODE_ENV === 'production',
    sessionSecret: env.SESSION_SECRET,
    cronSecret: env.CRON_SECRET,
    projectId: env.GOOGLE_CLOUD_PROJECT,
    gcsBucket: env.GCS_BUCKET || '',
    geminiApiKey: env.GEMINI_API_KEY || '',
    geminiModel: env.GEMINI_MODEL || '',
    smtpHost: env.SMTP_HOST || '',
    smtpPort: Number(env.SMTP_PORT) || 587,
    smtpUser: env.SMTP_USER || '',
    smtpPass: env.SMTP_PASS || '',
    mailFrom: env.MAIL_FROM || '',
    appBaseUrl: env.APP_BASE_URL || '',
  };
}

/**
 * Config for tests: fixed secrets, no network services.
 * @returns {Record<string, string|number|boolean>}
 */
function testConfig() {
  return loadConfig({
    NODE_ENV: 'test',
    PORT: '8080',
    SESSION_SECRET: 'test-session-secret-not-a-real-secret',
    CRON_SECRET: 'test-cron-secret-not-a-real-secret',
    GOOGLE_CLOUD_PROJECT: 'test-project',
  });
}

module.exports = { loadConfig, testConfig, REQUIRED };
