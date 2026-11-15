'use strict';

/**
 * Vercel Serverless Function entry point.
 * Exports the Express app instance so Vercel can handle incoming requests dynamically.
 */

const { createApp } = require('../src/server');

const app = createApp();

module.exports = app;
