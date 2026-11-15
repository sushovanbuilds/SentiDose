'use strict';

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('node:path');

const { loadConfig } = require('./config');
const { createAuthRouter, createSpaceRouter } = require('./routes/auth');
const { createRecordsRouter } = require('./routes/records');
const { createCronRouter } = require('./routes/cron');
const { createFirestoreAccessor } = require('./services/firestore');
const { createAuthService } = require('./services/auth');
const { createRecordsService } = require('./services/records');
const { createReminderService } = require('./services/reminders');
const { createMailer } = require('./services/mailer');
const { notFound, errorHandler } = require('./middleware/error');
const { requireAuth } = require('./middleware/auth');
const logger = require('./utils/logger');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/**
 * Build the Express application. No listeners are opened here so tests can
 * mount the app directly with supertest.
 * @param {object} [options]
 * @param {ReturnType<typeof loadConfig>} [options.config]
 * @returns {import('express').Express}
 */
function createApp(options = {}) {
  const config = options.config || loadConfig();
  const authService = options.authService || createAuthService({
    getFirestore: createFirestoreAccessor(config),
    sessionSecret: config.sessionSecret,
  });
  const recordsService = options.recordsService || createRecordsService({
    getFirestore: createFirestoreAccessor(config),
  });
  const reminderService = options.reminderService || createReminderService({
    getFirestore: createFirestoreAccessor(config),
    sendEmail: createMailer(config).sendEmail,
  });
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // Google Fonts host the Atkinson Hyperlegible and Inter families.
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          imgSrc: ["'self'", 'data:'],
          mediaSrc: ["'self'", 'https://storage.googleapis.com'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          // Cloud Run terminates TLS, so forcing HTTPS is right in production.
          // Locally it would break the plain-http smoke test.
          upgradeInsecureRequests: config.isProduction ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '32kb' }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use(cookieParser(config.sessionSecret));
  app.use(
    express.static(PUBLIC_DIR, {
      extensions: ['html'],
      maxAge: config.isProduction ? '1h' : 0,
      setHeaders: (response, filePath) => {
        if (filePath.endsWith('.html')) response.setHeader('Cache-Control', 'no-cache');
      },
    })
  );

  // Clean URLs: /today serves public/today.html.
  const CLEAN_PAGES = [
    '/today',
    '/dashboard',
    '/medicines',
    '/add-medicine',
    '/appointments',
    '/approvals',
    '/family',
    '/audit',
    '/join',
    '/alarm',
    '/scan',
  ];
  app.get(CLEAN_PAGES, (request, response) => {
    response.sendFile(path.join(PUBLIC_DIR, `${request.path.slice(1)}.html`));
  });

  app.get('/favicon.ico', (_request, response) => {
    response.sendFile(path.join(PUBLIC_DIR, 'favicon.svg'), {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  });

  app.get('/', (_request, response) => {
    response.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok', service: 'sentidose' });
  });

  app.use('/api/auth', createAuthRouter(config, authService));
  app.use('/api/spaces', createSpaceRouter(config, authService));
  app.get('/api/me', requireAuth(config.sessionSecret), (request, response) => {
    response.json({
      name: request.auth.name,
      role: request.auth.role,
      spaceId: request.auth.spaceId,
      elderName: request.auth.elderName,
    });
  });
  app.use('/api', createRecordsRouter(config, recordsService));
  app.use('/api/cron', createCronRouter(config, reminderService));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

if (require.main === module) {
  const config = loadConfig();
  createApp({ config }).listen(config.port, '0.0.0.0', () => {
    logger.info('server_started', { port: config.port, env: config.nodeEnv });
  });
}

module.exports = { createApp };
