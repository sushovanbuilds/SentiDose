'use strict';

const request = require('supertest');
const { createApp } = require('../src/server');
const { testConfig, loadConfig } = require('../src/config');

const app = () => createApp({ config: testConfig() });

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

describe('vercel entrypoint', () => {
  test('api/index exports an Express app instance that responds to /health', async () => {
    process.env.SESSION_SECRET = 'test-secret-for-api-entry';
    const vercelApp = require('../api/index');

    const response = await request(vercelApp).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'sentidose' });
  });
});
