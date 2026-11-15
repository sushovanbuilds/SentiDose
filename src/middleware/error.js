'use strict';

const logger = require('../utils/logger');

/**
 * Wraps an async route handler so rejected promises reach the error
 * middleware. Express 5 forwards rejections itself; this keeps handlers
 * readable and works if the app is mounted under an older router.
 * @param {Function} handler
 * @returns {Function}
 */
function asyncHandler(handler) {
  return function wrapped(request, response, next) {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

/**
 * 404 for unknown API paths. Keeps HTML routes on the static handler.
 * @type {import('express').RequestHandler}
 */
function notFound(request, response) {
  if (request.path.startsWith('/api/')) {
    response.status(404).json({ error: 'Not found' });
    return;
  }
  response.status(404).type('text/plain').send('Not found');
}

/**
 * Terminal error handler. Logs the real cause, returns no stack trace.
 * @type {import('express').ErrorRequestHandler}
 */
function errorHandler(error, _request, response, _next) {
  const status = Number(error.status) || 500;
  const safeMessage = status < 500 ? error.message : 'Something went wrong. Please try again.';

  if (status >= 500) {
    logger.error('unhandled_error', { name: error.name, detail: error.message });
  } else {
    logger.warn('request_rejected', { status, detail: error.message });
  }

  if (response.headersSent) return;
  response.status(status).json({ error: safeMessage });
}

module.exports = { asyncHandler, notFound, errorHandler };
