'use strict';

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const { asyncHandler } = require('../middleware/error');
const { requireAuth, requireRole, SESSION_COOKIE, sessionCookieOptions } = require('../middleware/auth');

const normalizeText = (value) => value.trim().replace(/\s+/gu, ' ');
const personName = (min, max) => z.string().transform(normalizeText).pipe(
  z.string().min(min, 'Enter a name with at least 2 letters.').max(max, `Keep the name to ${max} characters or fewer.`).regex(/^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u, 'Use letters, spaces, apostrophes or hyphens.')
);
const emailAddress = z.string().trim().toLowerCase().pipe(z.string().email('Please enter an email like name@example.com.').max(254));
const createPersonSchema = z.object({
  name: personName(2, 60),
  email: emailAddress,
  phone: z.string().trim().max(32).optional().default(''),
}).strict();
const familyPersonSchema = createPersonSchema.extend({
  relation: z.enum(['Son', 'Daughter', 'Grandson', 'Granddaughter', 'Spouse', 'Sibling', 'Friend', 'Other']),
});
const idempotencyKeySchema = z.string().min(16).max(128).regex(/^[A-Za-z0-9_-]+$/);
const createSchema = z.object({
  elderName: personName(2, 60),
  displayName: personName(2, 30),
  elderEmail: emailAddress,
  language: z.enum(['English', 'Hindi', 'Bengali']),
  caretakers: z.array(createPersonSchema).max(3, 'Add up to 3 caretakers.'),
  familyMembers: z.array(familyPersonSchema).max(10, 'Add up to 10 family members.'),
  pin: z.string().regex(/^\d{6}$/),
  idempotencyKey: idempotencyKeySchema,
  timezone: z.string().trim().min(1).max(100).refine((value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, 'Choose a valid time zone'),
}).strict().superRefine((value, context) => {
  const addresses = [value.elderEmail, ...value.caretakers.map((person) => person.email), ...value.familyMembers.map((person) => person.email)];
  const seen = new Set();
  addresses.forEach((email, index) => {
    if (seen.has(email)) {
      const path = index === 0 ? ['elderEmail'] : index <= value.caretakers.length ? ['caretakers', index - 1, 'email'] : ['familyMembers', index - value.caretakers.length - 1, 'email'];
      context.addIssue({ code: 'custom', path, message: 'Use a different email for each person.' });
    }
    seen.add(email);
  });
});
const joinSchema = z.object({
  name: personName(2, 60),
  role: z.enum(['elder', 'caretaker', 'family']).optional(),
  email: emailAddress.optional(),
  code: z.string().regex(/^\d{6}$/),
}).strict();
const emptySchema = z.object({}).strict();

function fieldIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || (issue.keys && issue.keys[0]) || 'form',
    message: issue.keys ? `Remove unknown field: ${issue.keys.join(', ')}.` : issue.message,
  }));
}

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
  const authenticate = requireAuth(config.sessionSecret, authService.getMemberStatus);

  function issueSession(identity, response) {
    const claims = {
      spaceId: identity.spaceId,
      memberId: identity.memberId,
      name: identity.name,
      role: identity.role,
      elderName: identity.elderName,
      displayName: identity.displayName,
      sessionVersion: identity.sessionVersion || 0,
    };
    const token = jwt.sign(claims, config.sessionSecret, { algorithm: 'HS256', expiresIn: '12h' });
    response.cookie(SESSION_COOKIE, token, sessionCookieOptions(config.isProduction));
    return claims;
  }

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

function createSpacesRouter(config, authService) {
  const router = Router();
  const createLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many spaces were created from this connection. Wait a minute and try again.' },
  });
  router.post('/', noQuery, createLimiter, asyncHandler(async (request, response) => {
    const input = createSchema.safeParse(request.body);
    if (!input.success) {
      response.status(400).json({
        error: 'Check the highlighted details and try again.',
        fields: fieldIssues(input.error),
      });
      return;
    }
    const identity = await authService.createCareSpace(input.data);
    if (identity.alreadyCreated) {
      response.status(409).json({ error: 'This request was already completed. Sign in with the elder access code.' });
      return;
    }
    const claims = {
      spaceId: identity.spaceId,
      memberId: identity.memberId,
      name: identity.displayName,
      role: 'elder',
      elderName: identity.elderName,
      displayName: identity.displayName,
      sessionVersion: identity.sessionVersion || 0,
    };
    const token = jwt.sign(claims, config.sessionSecret, { algorithm: 'HS256', expiresIn: '12h' });
    response.cookie(SESSION_COOKIE, token, sessionCookieOptions(config.isProduction));
    response.status(201).json({ user: claims, elderCode: identity.elderCode, inviteCodes: identity.inviteCodes });
  }));
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
  router.post('/:spaceId/codes', noQuery, requireAuth(config.sessionSecret, authService.getMemberStatus), requireRole('elder'), limiter, asyncHandler(async (request, response) => {
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

module.exports = { createAuthRouter, createSpaceRouter, createSpacesRouter, createSchema, fieldIssues };
