'use strict';

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('node:path');

const { loadConfig } = require('./config');
const { notFound, errorHandler } = require('./middleware/error');
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
  app.get(['/today', '/dashboard', '/medicines', '/appointments', '/approvals', '/family', '/audit'], (request, response) => {
    response.sendFile(path.join(PUBLIC_DIR, `${request.path.slice(1)}.html`));
  });

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok', service: 'sentidose' });
  });

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
