'use strict';

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const { asyncHandler } = require('../middleware/error');
const { requireAuth, requireRole, SESSION_COOKIE, sessionCookieOptions } = require('../middleware/auth');

const createSchema = z.object({
  elderName: z.string().trim().min(2).max(80),
  elderEmail: z.string().trim().email().max(254),
  pin: z.string().regex(/^\d{6}$/),
  timezone: z.string().trim().min(1).max(100).refine((value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, 'Choose a valid time zone'),
}).strict();
const joinSchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.enum(['elder', 'caretaker', 'family']).optional(),
  email: z.string().trim().email().max(254).optional(),
  code: z.string().regex(/^\d{6}$/),
}).strict();
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

/** @param {object} config @param {object} authService */
function createAuthRouter(config, authService) {
  const router = Router();
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Wait a little and try again.' },
  });
  const authenticate = requireAuth(config.sessionSecret);

  function issueSession(identity, response) {
    const claims = {
      spaceId: identity.spaceId,
      memberId: identity.memberId,
      name: identity.name,
      role: identity.role,
      elderName: identity.elderName,
    };
    const token = jwt.sign(claims, config.sessionSecret, { algorithm: 'HS256', expiresIn: '12h' });
    response.cookie(SESSION_COOKIE, token, sessionCookieOptions(config.isProduction));
    return claims;
  }

  router.post('/create', noQuery, authLimiter, asyncHandler(async (request, response) => {
    const input = createSchema.safeParse(request.body);
    if (!input.success) {
      response.status(400).json({ error: 'Enter your name, a valid email, a valid time zone, and a 6-digit PIN.' });
      return;
    }
    const identity = await authService.createCareSpace(input.data);
    const user = issueSession(identity, response);
    response.status(201).json({
      user,
      inviteCodes: identity.inviteCodes,
    });
  }));

  router.post('/join', noQuery, authLimiter, asyncHandler(async (request, response) => {
    const input = joinSchema.safeParse(request.body);
    if (!input.success) {
      response.status(400).json({ error: 'Enter your name, choose a role, provide an email if you are family or a caretaker, and enter a 6-digit code.' });
      return;
    }
    const identity = await authService.joinCareSpace(input.data);
    response.status(200).json({ user: issueSession(identity, response) });
  }));

  router.get('/me', noQuery, noBody, authenticate, asyncHandler(async (request, response) => {
    response.json({ user: request.auth });
  }));

  router.post('/logout', noQuery, noBody, (_request, response) => {
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'strict',
      path: '/',
    });
    response.status(204).end();
  });

  return router;
}

/** @param {object} config @param {object} authService */
function createSpaceRouter(config, authService) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many code requests. Wait a little and try again.' },
  });
  router.post('/:spaceId/codes', noQuery, requireAuth(config.sessionSecret), requireRole('elder'), limiter, asyncHandler(async (request, response) => {
    const params = z.object({ spaceId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }).safeParse(request.params);
    const body = z.object({ role: z.enum(['caretaker', 'family']) }).strict().safeParse(request.body);
    if (!params.success || !body.success) {
      response.status(400).json({ error: 'Choose a valid care space and invite role.' });
      return;
    }
    if (params.data.spaceId !== request.auth.spaceId) {
      response.status(403).json({ error: 'You can only create codes for your own care space.' });
      return;
    }
    const code = await authService.rotateInviteCode(params.data.spaceId, body.data.role);
    response.status(201).json({ role: body.data.role, code: code.code, expiresAt: code.expiresAt.toISOString() });
  }));
  return router;
}

module.exports = { createAuthRouter, createSpaceRouter };
