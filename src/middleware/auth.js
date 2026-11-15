'use strict';

const jwt = require('jsonwebtoken');
const { z } = require('zod');

const SESSION_COOKIE = 'sentidose_session';
const sessionPayloadSchema = z.object({
  spaceId: z.string().min(1),
  memberId: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(['elder', 'caretaker', 'family']),
  elderName: z.string().min(1),
});

/** @param {boolean} isProduction */
function sessionCookieOptions(isProduction) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 12 * 60 * 60 * 1000,
  };
}

/** @param {string} secret */
function requireAuth(secret) {
  return function authenticate(request, response, next) {
    const token = request.cookies && request.cookies[SESSION_COOKIE];
    if (!token) {
      response.status(401).json({ error: 'Sign in to continue.' });
      return;
    }

    try {
      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
      const parsed = sessionPayloadSchema.safeParse(decoded);
      if (!parsed.success) {
        response.status(401).json({ error: 'Your session is invalid. Please sign in again.' });
        return;
      }
      request.auth = parsed.data;
      next();
    } catch {
      response.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
  };
}

/** @param {...string} roles */
function requireRole(...roles) {
  return function authorize(request, response, next) {
    if (!request.auth || !roles.includes(request.auth.role)) {
      response.status(403).json({ error: 'You do not have permission to do that.' });
      return;
    }
    next();
  };
}

module.exports = { SESSION_COOKIE, sessionCookieOptions, requireAuth, requireRole };
