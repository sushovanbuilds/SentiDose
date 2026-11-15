'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/server');
const { testConfig, loadConfig } = require('../src/config');
const { requireRole } = require('../src/middleware/auth');
const { calculateAdherence, doseDocumentId, medicineScheduledOn } = require('../src/services/records');
const {
  appointmentReminderKinds,
  doseReminderActions,
  eventCanBeClaimed,
  formatLocalDateTime,
  localMinuteNumber,
  previousDate,
} = require('../src/services/reminders');
const { createMailer } = require('../src/services/mailer');

const app = () => createApp({ config: testConfig() });

function authApp() {
  const authService = {
    createCareSpace: jest.fn(async ({ elderName }) => ({
      spaceId: 'space-1',
      memberId: 'member-1',
      name: elderName,
      role: 'elder',
      inviteCodes: { caretaker: '123456', family: '654321' },
    })),
    joinCareSpace: jest.fn(async ({ name, role, code }) => {
      if (code !== '123456') {
        const error = new Error('That code is invalid or has expired.');
        error.status = 401;
        throw error;
      }
      return { spaceId: 'space-1', memberId: 'member-2', name, role };
    }),
  };
  return { app: createApp({ config: testConfig(), authService }), authService };
}

function recordsApp(role = 'elder') {
  const authService = {
    createCareSpace: jest.fn(async () => ({
      spaceId: 'space-1', memberId: 'member-1', name: 'Subrata', role: 'elder', inviteCodes: {},
    })),
    joinCareSpace: jest.fn(async ({ name }) => ({
      spaceId: 'space-1', memberId: 'member-2', name, role,
    })),
  };
  const recordsService = {
    listMedicines: jest.fn(async () => []),
    createMedicine: jest.fn(async (_spaceId, _actor, data) => ({ id: 'med-1', ...data })),
    updateMedicine: jest.fn(),
    deleteMedicine: jest.fn(),
    listAppointments: jest.fn(async () => []),
    createAppointment: jest.fn(async (_spaceId, _actor, data) => ({ id: 'appt-1', ...data })),
    updateAppointment: jest.fn(),
    deleteAppointment: jest.fn(),
    listDoses: jest.fn(async () => []),
    recordDose: jest.fn(async (_spaceId, _actor, data) => ({ id: 'dose-1', ...data })),
    adherence: jest.fn(async () => ({ percent: 100, taken: 1, total: 1, days: [] })),
  };
  return {
    app: createApp({ config: testConfig(), authService, recordsService }),
    recordsService,
  };
}

describe('service skeleton', () => {
  test('health check reports service status', async () => {
    const response = await request(app()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'sentidose' });
  });

  test('serves the accessible landing page', async () => {
    const response = await request(app()).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('<html lang="en">');
    expect(response.text).toContain('Skip to content');
    expect(response.text).toContain('<main id="main"');
    expect(response.text).toContain('Not medical advice. Consult your doctor.');
  });

  test.each([
    '/today', '/dashboard', '/medicines', '/add-medicine', '/appointments',
    '/approvals', '/family', '/audit', '/join', '/alarm', '/scan',
  ])('serves the %s page route', async (route) => {
    const response = await request(app()).get(route);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
  });

  test('unknown API path returns JSON 404', async () => {
    const response = await request(app()).get('/api/nope');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  test('does not advertise the framework', async () => {
    const response = await request(app()).get('/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  test('sets a content security policy that forbids inline script', async () => {
    const response = await request(app()).get('/health');

    expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    expect(response.headers['content-security-policy']).not.toContain("'unsafe-inline'");
  });

  test('health check succeeds even when database credentials are misconfigured', async () => {
    const brokenConfig = loadConfig({
      NODE_ENV: 'test',
      SESSION_SECRET: 'test-secret',
      GOOGLE_APPLICATION_CREDENTIALS_JSON: 'this-is-not-valid-json-secret-12345',
    });

    const response = await request(createApp({ config: brokenConfig })).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'sentidose' });
  });
});

describe('config', () => {
  test('fails fast when required secrets are missing', () => {
    expect(() => loadConfig({})).toThrow(/Missing required environment variables: SESSION_SECRET/);
  });

  test('only SESSION_SECRET is required; other services are optional', () => {
    const config = loadConfig({ SESSION_SECRET: 'a-valid-session-secret' });

    expect(config.sessionSecret).toBe('a-valid-session-secret');
    expect(config.cronSecret).toBe('');
    expect(config.projectId).toBe('');
    expect(config.geminiApiKey).toBe('');
  });

  test('parses valid GOOGLE_APPLICATION_CREDENTIALS_JSON and derives projectId', () => {
    const sa = JSON.stringify({ project_id: 'auto-derived-proj', client_email: 'sa@proj.iam.gserviceaccount.com' });
    const config = loadConfig({
      SESSION_SECRET: 'secret',
      GOOGLE_APPLICATION_CREDENTIALS_JSON: sa,
    });

    expect(config.googleCredentials).toEqual({ project_id: 'auto-derived-proj', client_email: 'sa@proj.iam.gserviceaccount.com' });
    expect(config.projectId).toBe('auto-derived-proj');
    expect(config.googleCredentialsError).toBeNull();
  });

  test('safely handles invalid GOOGLE_APPLICATION_CREDENTIALS_JSON without leaking credentials', () => {
    const fakeSecret = 'SUPER_SECRET_PRIVATE_KEY_DATA';
    const invalidJson = `{"private_key": "${fakeSecret}`; // incomplete JSON

    // Capture stderr to ensure secret is never printed
    let loggedOutput = '';
    const originalStderrWrite = process.stderr.write;
    process.stderr.write = (chunk) => {
      loggedOutput += chunk.toString();
      return true;
    };

    try {
      const config = loadConfig({
        SESSION_SECRET: 'secret',
        GOOGLE_APPLICATION_CREDENTIALS_JSON: invalidJson,
      });

      expect(config.googleCredentials).toBeNull();
      expect(config.googleCredentialsError).toContain('Invalid JSON format');
      expect(loggedOutput).not.toContain(fakeSecret);
    } finally {
      process.stderr.write = originalStderrWrite;
    }
  });

  test('defaults the port and mail port', () => {
    const config = testConfig();

    expect(config.port).toBe(8080);
    expect(config.smtpPort).toBe(587);
  });
});

describe('authentication API', () => {
  test('creates a care space, returns invitation codes once, and sets an httpOnly session', async () => {
    const { app: authServer } = authApp();
    const response = await request(authServer).post('/api/auth/create').send({
      elderName: 'Subrata Halder',
      elderEmail: 'subrata@example.com',
      pin: '042591',
      timezone: 'Asia/Kolkata',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      user: { spaceId: 'space-1', memberId: 'member-1', name: 'Subrata Halder', role: 'elder' },
      inviteCodes: { caretaker: '123456', family: '654321' },
    });
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(jwt.decode(response.headers['set-cookie'][0].match(/sentidose_session=([^;]+)/)[1])).not.toHaveProperty('inviteCodes');
  });

  test('joins by role-specific code and exposes the authenticated user through /me', async () => {
    const { app: authServer } = authApp();
    const joined = await request(authServer).post('/api/auth/join').send({
      name: 'Rahul',
      email: 'rahul@example.com',
      role: 'family',
      code: '123456',
    });

    expect(joined.status).toBe(200);
    const sessionCookie = joined.headers['set-cookie'][0].split(';')[0];
    const current = await request(authServer).get('/api/auth/me').set('Cookie', sessionCookie);
    expect(current.status).toBe(200);
    expect(current.body.user).toEqual({ spaceId: 'space-1', memberId: 'member-2', name: 'Rahul', role: 'family' });
  });

  test('rejects invalid input, unknown fields, and missing sessions', async () => {
    const { app: authServer } = authApp();
    const invalid = await request(authServer).post('/api/auth/join').send({
      name: 'Rahul',
      email: 'rahul@example.com',
      role: 'family',
      code: '123456',
      isAdmin: true,
    });
    expect(invalid.status).toBe(400);

    const unauthenticated = await request(authServer).get('/api/auth/me');
    expect(unauthenticated.status).toBe(401);
  });

  test('role middleware denies a member outside the allowed roles', () => {
    const response = { status: jest.fn(() => response), json: jest.fn() };
    const next = jest.fn();
    requireRole('elder')({ auth: { role: 'family' } }, response, next);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('care record API', () => {
  async function joinedCookie(server) {
    const joined = await request(server).post('/api/auth/join').send({
      name: 'Rahul', email: 'rahul@example.com', role: 'family', code: '123456',
    });
    return joined.headers['set-cookie'][0].split(';')[0];
  }

  test('validates and creates medicines under the authenticated care space', async () => {
    const { app: server, recordsService } = recordsApp('elder');
    const cookie = await joinedCookie(server);
    const response = await request(server).post('/api/medicines').set('Cookie', cookie).send({
      name: 'Metformin',
      dose: '500 mg',
      times: ['09:00', '21:00'],
      withFood: 'after',
      stock: 12,
      schedule: { kind: 'daily' },
      note: 'After breakfast and dinner',
    });
    expect(response.status).toBe(201);
    expect(response.body.medicine.id).toBe('med-1');
    expect(recordsService.createMedicine).toHaveBeenCalledWith('space-1', expect.objectContaining({ role: 'elder' }), expect.objectContaining({ name: 'Metformin' }));
  });

  test('allows family reads but denies family writes', async () => {
    const { app: server, recordsService } = recordsApp('family');
    const cookie = await joinedCookie(server);
    const list = await request(server).get('/api/medicines').set('Cookie', cookie);
    expect(list.status).toBe(200);
    expect(list.body).toEqual({ medicines: [] });

    const write = await request(server).post('/api/medicines').set('Cookie', cookie).send({
      name: 'Metformin', dose: '500 mg', times: ['09:00'], withFood: 'after', stock: 1, schedule: { kind: 'daily' },
    });
    expect(write.status).toBe(403);
    expect(recordsService.createMedicine).not.toHaveBeenCalled();

    const unexpectedQuery = await request(server).get('/api/medicines?unexpected=true').set('Cookie', cookie);
    expect(unexpectedQuery.status).toBe(400);
  });

  test('validates dose dates, records an action, and creates appointments', async () => {
    const { app: server, recordsService } = recordsApp('caretaker');
    const cookie = await joinedCookie(server);
    const invalidDate = await request(server).get('/api/doses?date=2026-02-30').set('Cookie', cookie);
    expect(invalidDate.status).toBe(400);

    const dose = await request(server).post('/api/doses').set('Cookie', cookie).send({
      medId: 'med-1', scheduledFor: '2026-11-19T09:00', status: 'taken',
    });
    expect(dose.status).toBe(201);

    const appointment = await request(server).post('/api/appointments').set('Cookie', cookie).send({
      doctor: 'Dr. Sen', datetime: '2026-11-24T16:00', specialty: 'Ophthalmology', location: 'Vision Care', notes: 'Bring reports',
    });
    expect(appointment.status).toBe(201);
    expect(recordsService.createAppointment).toHaveBeenCalledWith('space-1', expect.objectContaining({ role: 'caretaker' }), expect.objectContaining({ doctor: 'Dr. Sen' }));
  });

  test('computes logged adherence and handles weekly schedules', () => {
    const stats = calculateAdherence([
      { scheduledFor: '2026-11-17T08:00', status: 'missed' },
      { scheduledFor: '2026-11-18T08:00', status: 'pending' },
      { scheduledFor: '2026-11-19T08:00', status: 'taken' },
      { scheduledFor: '2026-11-19T20:00', status: 'skipped' },
    ], 3, '2026-11-19');
    expect(stats).toEqual({
      percent: 33,
      taken: 1,
      total: 3,
      days: [
        { date: '2026-11-17', taken: 0, total: 1 },
        { date: '2026-11-18', taken: 0, total: 0 },
        { date: '2026-11-19', taken: 1, total: 2 },
      ],
    });
    expect(medicineScheduledOn({ schedule: { kind: 'weekly', weekday: 0 } }, '2026-11-22')).toBe(true);
    expect(doseDocumentId('med-1', '2026-11-19T08:00')).toBe(doseDocumentId('med-1', '2026-11-19T08:00'));
  });
});

describe('scheduler and reminders', () => {
  test('cron endpoint rejects missing or invalid credentials and runs only with the secret', async () => {
    const reminderService = { tick: jest.fn(async () => ({ spaces: 2, sent: 3, skipped: 1, failed: 0 })) };
    const server = createApp({ config: testConfig(), reminderService });

    const denied = await request(server).post('/api/cron/tick');
    expect(denied.status).toBe(401);
    expect(reminderService.tick).not.toHaveBeenCalled();

    const unauthorizedQuery = await request(server)
      .post('/api/cron/tick?unexpected=true')
      .set('x-cron-secret', 'test-cron-secret-not-a-real-secret');
    expect(unauthorizedQuery.status).toBe(400);

    const accepted = await request(server)
      .post('/api/cron/tick')
      .set('x-cron-secret', 'test-cron-secret-not-a-real-secret');
    expect(accepted.status).toBe(200);
    expect(accepted.body).toEqual({ status: 'ok', spaces: 2, sent: 3, skipped: 1, failed: 0 });
  });

  test('applies the due, 30-minute escalation, and appointment reminder windows', () => {
    expect(doseReminderActions(0, true)).toEqual({ remindElder: true, escalateCaretaker: false });
    expect(doseReminderActions(30, true)).toEqual({ remindElder: true, escalateCaretaker: true });
    expect(doseReminderActions(30, false)).toEqual({ remindElder: false, escalateCaretaker: true });
    expect(appointmentReminderKinds(24 * 60)).toEqual(['day_before']);
    expect(appointmentReminderKinds(120)).toEqual(['two_hours']);
    expect(appointmentReminderKinds(121)).toEqual(['day_before']);
    expect(appointmentReminderKinds(0)).toEqual([]);
  });

  test('deduplication claims are blocked after send and while another worker lease is active', () => {
    const now = Date.now();
    expect(eventCanBeClaimed({ sentAt: new Date(now) }, now)).toBe(false);
    expect(eventCanBeClaimed({ status: 'sending', leaseUntil: new Date(now + 60_000) }, now)).toBe(false);
    expect(eventCanBeClaimed({ status: 'sending', leaseUntil: new Date(now - 1) }, now)).toBe(true);
    expect(eventCanBeClaimed({ status: 'failed' }, now)).toBe(true);
  });

  test('uses the care-space time zone and calendar day boundaries', () => {
    expect(formatLocalDateTime(new Date('2026-11-19T03:30:00.000Z'), 'Asia/Kolkata')).toBe('2026-11-19T09:00');
    expect(previousDate('2026-03-01')).toBe('2026-02-28');
    expect(localMinuteNumber('2026-11-19T09:30') - localMinuteNumber('2026-11-19T09:00')).toBe(30);
  });

  test('mailer configures SMTP, deduplicates recipients, and rejects missing setup', async () => {
    const sendMail = jest.fn(async () => ({ messageId: 'message-1' }));
    const createTransport = jest.fn(() => ({ sendMail }));
    const config = {
      smtpHost: 'smtp.example.test', smtpPort: 587, smtpUser: 'mailer', smtpPass: 'password', mailFrom: 'care@example.test',
    };
    const mailer = createMailer(config, createTransport);
    await mailer.sendEmail({ to: ['family@example.test', 'family@example.test'], subject: 'Reminder', text: 'Dose due.' });
    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.test', port: 587, secure: false, auth: { user: 'mailer', pass: 'password' },
    });
    expect(sendMail.mock.calls[0][0].to).toBe('family@example.test');

    await expect(createMailer({}).sendEmail({ to: 'person@example.test', subject: 'x', text: 'y' })).rejects.toThrow(/not configured/);
  });
});

describe('vercel entrypoint', () => {
  test('api/index exports an Express app instance that responds to /health', async () => {
    process.env.SESSION_SECRET = 'test-secret-for-api-entry';
    const vercelApp = require('../api/index');

    const response = await request(vercelApp).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'sentidose' });
  });
});
