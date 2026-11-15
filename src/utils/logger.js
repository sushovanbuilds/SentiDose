'use strict';

/**
 * Minimal structured logger. One JSON line per event so Cloud Logging
 * can index severity. Never pass secrets, passcodes or third-party emails.
 */

/** @type {ReadonlyArray<string>} */
const LEVELS = Object.freeze(['debug', 'info', 'warn', 'error']);
const MIN_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * @param {string} level one of LEVELS
 * @returns {boolean} whether the level is emitted
 */
function enabled(level) {
  return LEVELS.indexOf(level) >= LEVELS.indexOf(MIN_LEVEL);
}

/**
 * @param {string} level
 * @param {string} message
 * @param {Record<string, unknown>} [meta] non-secret context
 */
function write(level, message, meta) {
  if (!enabled(level)) return;
  const line = JSON.stringify({
    severity: level.toUpperCase(),
    message,
    ...(meta || {}),
  });
  if (level === 'error') process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

module.exports = {
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
