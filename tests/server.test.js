'use strict';

const request = require('supertest');
const { createApp } = require('../src/server');
const { testConfig, loadConfig } = require('../src/config');

const app = () => createApp({ config: testConfig() });

describe('service skeleton', () => {
  test('health check reports service status', async () => {
    const response = await request(app()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'carecircle' });
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
});

describe('config', () => {
  test('fails fast when required secrets are missing', () => {
    expect(() => loadConfig({})).toThrow(/Missing required environment variables/);
  });

  test('defaults the port and mail port', () => {
    const config = testConfig();

    expect(config.port).toBe(8080);
    expect(config.smtpPort).toBe(587);
  });
});
