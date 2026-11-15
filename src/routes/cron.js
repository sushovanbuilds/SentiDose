'use strict';

const { timingSafeEqual } = require('node:crypto');
const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/error');

const emptySchema = z.object({}).strict();

function noQuery(request, response, next) {
  if (!emptySchema.safeParse(request.query).success) {
    response.status(400).json({ error: 'This endpoint does not accept query parameters.' });
    return;
  }
  next();
}

function noBody(request, response, next) {
  if (!emptySchema.safeParse(request.body || {}).success) {
    response.status(400).json({ error: 'This endpoint does not accept a request body.' });
    return;
  }
  next();
}

/** @param {string} configured @param {string|undefined} supplied */
function secretsMatch(configured, supplied) {
  if (!configured || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** @param {object} config @param {{tick:Function}} reminderService */
function createCronRouter(config, reminderService) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many scheduler requests. Try again next minute.' },
  });

  router.post('/tick', limiter, (request, response, next) => {
    if (!config.cronSecret) {
      response.status(503).json({ error: 'Scheduled reminders are not configured.' });
      return;
    }
    if (!secretsMatch(config.cronSecret, request.get('x-cron-secret'))) {
      response.status(401).json({ error: 'Invalid scheduler credentials.' });
      return;
    }
    next();
  }, noQuery, noBody, asyncHandler(async (_request, response) => {
    const result = await reminderService.tick();
    response.status(200).json({ status: 'ok', ...result });
  }));

  return router;
}

module.exports = { createCronRouter, secretsMatch };
