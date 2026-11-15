'use strict';

const logger = require('./utils/logger');

/**
 * Environment configuration, read once at boot.
 * Only variables strictly required to boot the web service safely
 * are required. Service integrations (database, mail, ai) are optional
 * at boot and emit structured warnings when absent.
 */

const REQUIRED = /** @type {const} */ ([
  'SESSION_SECRET',
]);

const OPTIONAL_VARS = Object.freeze([
  { key: 'GOOGLE_CLOUD_PROJECT', desc: 'Google Cloud project ID (required for Firestore and Cloud Storage)' },
  { key: 'GOOGLE_APPLICATION_CREDENTIALS_JSON', desc: 'Google service account credentials JSON (required outside GCP)' },
  { key: 'CRON_SECRET', desc: 'Secret for securing /api/cron/tick endpoints' },
  { key: 'GEMINI_API_KEY', desc: 'Gemini API key for prescription scans and voice features' },
  { key: 'GEMINI_MODEL', desc: 'Gemini model name' },
  { key: 'SMTP_HOST', desc: 'SMTP host for reminder and escalation emails' },
  { key: 'SMTP_USER', desc: 'SMTP username' },
  { key: 'SMTP_PASS', desc: 'SMTP password' },
  { key: 'MAIL_FROM', desc: 'Sender email address' },
]);

/**
 * Read and validate process.env.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {Record<string, any>} validated config
 * @throws {Error} when a required variable is absent
 */
function loadConfig(env = process.env) {
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Warn about missing optional services (omitted in test to keep test logs quiet)
  if (env.NODE_ENV !== 'test') {
    for (const { key, desc } of OPTIONAL_VARS) {
      if (!env[key]) {
        logger.warn('optional_env_missing', {
          variable: key,
          impact: desc,
        });
      }
    }
  }

  // Safely parse Firestore credentials JSON without exposing raw credential values on error
  let googleCredentials = null;
  let googleCredentialsError = null;

  if (env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const parsed = JSON.parse(env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        googleCredentials = parsed;
      } else {
        googleCredentialsError = 'Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON: Expected a JSON object';
        logger.error('firestore_credentials_invalid_structure', {
          error: googleCredentialsError,
        });
      }
    } catch {
      // Intentionally discard error message: V8 SyntaxError includes snippet of input which would leak credentials
      googleCredentialsError = 'Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON: Invalid JSON format';
      logger.error('firestore_credentials_parse_failed', {
        error: googleCredentialsError,
      });
    }
  }

  const projectId =
    env.GOOGLE_CLOUD_PROJECT ||
    (googleCredentials && typeof googleCredentials.project_id === 'string'
      ? googleCredentials.project_id
      : '');

  return {
    nodeEnv: env.NODE_ENV || 'development',
    port: Number(env.PORT) || 8080,
    isProduction: env.NODE_ENV === 'production',
    sessionSecret: env.SESSION_SECRET,
    cronSecret: env.CRON_SECRET || '',
    projectId,
    googleCredentials,
    googleCredentialsError,
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
 * @returns {Record<string, any>}
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

module.exports = { loadConfig, testConfig, REQUIRED, OPTIONAL_VARS };
