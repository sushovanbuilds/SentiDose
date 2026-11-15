'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const pageScript = fs.readFileSync(path.join(__dirname, '../public/js/family.js'), 'utf8');
const members = [
  { id: 'elder', name: 'Subrata Halder', role: 'elder' },
  { id: 'caretaker', name: 'Meena', role: 'caretaker' },
  { id: 'family', name: 'Rahul', role: 'family' },
];

async function renderFor(role) {
  const dom = new JSDOM('<div id="header-holder"></div><div id="nav-holder"></div><main id="main"><h1>Loading</h1></main>', {
    url: 'https://sentidose.test/family',
    runScripts: 'outside-only',
  });
  const { window } = dom;
  window.SentiDoseRole = { ready: Promise.resolve({ role, name: 'Meena', spaceId: 'space-1', elderName: 'Subrata Halder' }) };
  window.API = { get: jest.fn(async () => ({ members })), post: jest.fn() };
  window.renderHeader = (title) => `<header>${title}</header>`;
  window.renderNav = (sessionRole) => `<nav data-role="${sessionRole}"></nav>`;
  window.escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  window.hydrateIcons = jest.fn();
  window.initTextSize = jest.fn();
  window.toast = jest.fn();
  window.eval(pageScript);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await new Promise((resolve) => window.setTimeout(resolve, 0));
  return { dom, html: window.document.querySelector('main').innerHTML };
}

describe('family page role views', () => {
  test('elder sees role roster, invite actions, activity log and role descriptions', async () => {
    const { dom, html } = await renderFor('elder');
    expect(html).toContain('Your care circle');
    expect(html).toContain('Subrata Halder (you)');
    expect(html).toContain('Generate a new invite code for caretaker');
    expect(html).toContain('Generate a new invite code for family');
    expect(html).toContain('/audit');
    expect(html).toContain('Caretaker');
    expect(html).toContain('Family');
    expect(html).not.toContain('suggestion-create-form');
    dom.window.close();
  });

  test('caretaker sees read-only members and care links with no invite controls', async () => {
    const { dom, html } = await renderFor('caretaker');
    expect(html).toContain("Subrata Halder's care circle");
    expect(html).toContain('You can add medicines, record doses and manage appointments.');
    expect(html).toContain('href="/medicines"');
    expect(html).toContain('href="/appointments"');
    expect(html).toContain('href="/today"');
    expect(html).not.toContain('data-generate-code');
    expect(html).not.toContain('invite-code');
    dom.window.close();
  });

  test('family sees read-only roster, schedule and suggestion form without edit or invite controls', async () => {
    const { dom, html } = await renderFor('family');
    expect(html).toContain("Subrata Halder's care circle");
    expect(html).toContain('You can see the schedule and suggest changes. Dadu approves them.');
    expect(html).toContain('href="/dashboard">Schedule');
    expect(html).toContain('Suggest a change');
    expect(html).toContain('suggestion-create-form');
    expect(html).not.toContain('data-generate-code');
    expect(html).not.toContain('data-decide');
    expect(html).not.toContain('Edit');
    expect(html).not.toContain('Delete');
    dom.window.close();
  });
});
