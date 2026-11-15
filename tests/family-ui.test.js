'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const pageHtml = fs.readFileSync(path.join(__dirname, '../public/family.html'), 'utf8');
const pageScript = fs.readFileSync(path.join(__dirname, '../public/js/family.js'), 'utf8');
const members = [
  { id: 'elder', name: 'Nila Sen', role: 'elder' },
  { id: 'caretaker', name: 'Tara Das', role: 'caretaker' },
  { id: 'family', name: 'Asha Roy', role: 'family', relation: 'Daughter' },
];

async function renderFor(role, roster = members) {
  const dom = new JSDOM(pageHtml, { url: 'https://sentidose.test/family', runScripts: 'outside-only' });
  const { window } = dom;
  window.SentiDoseRole = { ready: Promise.resolve({ role, name: 'Tara Das', spaceId: 'space-1', elderName: 'Nila Sen', displayName: 'Nila' }) };
  window.API = { get: jest.fn(async () => ({ members: roster })), post: jest.fn(), patch: jest.fn(), del: jest.fn() };
  window.renderHeader = (title) => `<header>${title}</header>`;
  window.renderNav = (sessionRole) => `<nav data-role="${sessionRole}"></nav>`;
  window.hydrateIcons = jest.fn();
  window.initTextSize = jest.fn();
  window.toast = jest.fn();
  window.confirm = jest.fn(() => true);
  window.eval(pageScript);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await new Promise((resolve) => window.setTimeout(resolve, 0));
  const main = window.document.querySelector('main');
  const isVisible = (element) => !element.closest('[hidden]');
  return { dom, document: window.document, main, isVisible };
}

describe('care-circle roster role views', () => {
  test('elder sees real member names, role chips and all management actions', async () => {
    const { dom, document, main, isVisible } = await renderFor('elder');
    expect(document.getElementById('family-title').textContent).toBe('Your care circle');
    expect(main.textContent).toContain('Nila Sen (you)');
    expect(main.textContent).toContain('Asha Roy');
    expect([...main.querySelectorAll('button')].filter(isVisible).map((button) => button.textContent)).toEqual(expect.arrayContaining(['Add person', 'Edit', 'Remove', 'Generate caretaker code', 'Generate family code']));
    expect(document.getElementById('elder-activity-link').hidden).toBe(false);
    dom.window.close();
  });

  test('caretaker sees a read-only roster and care links', async () => {
    const { dom, document, main, isVisible } = await renderFor('caretaker');
    expect(document.getElementById('family-title').textContent).toBe("Nila's care circle");
    expect(main.textContent).toContain('You can add medicines, record doses and manage appointments.');
    expect(main.querySelector('a[href="/medicines"]')).not.toBeNull();
    expect(main.querySelector('a[href="/appointments"]')).not.toBeNull();
    expect(main.querySelector('a[href="/today"]')).not.toBeNull();
    expect([...main.querySelectorAll('button')].filter(isVisible).map((button) => button.textContent)).not.toEqual(expect.arrayContaining(['Add person', 'Edit', 'Remove', 'Generate caretaker code', 'Generate family code']));
    dom.window.close();
  });

  test('family sees schedule and suggestion controls only', async () => {
    const { dom, document, main, isVisible } = await renderFor('family');
    expect(document.getElementById('family-title').textContent).toBe("Nila's care circle");
    expect(main.textContent).toContain('You can see the schedule and suggest changes. Nila approves them.');
    expect(main.querySelector('a[href="/dashboard"]')).not.toBeNull();
    expect(main.querySelector('#suggestion-create-form')).not.toBeNull();
    const visibleButtons = [...main.querySelectorAll('button')].filter(isVisible).map((button) => button.textContent);
    expect(visibleButtons).toContain('Send suggestion');
    expect(visibleButtons).not.toEqual(expect.arrayContaining(['Add person', 'Edit', 'Remove', 'Generate caretaker code', 'Generate family code']));
    dom.window.close();
  });

  test('member names are inserted as text even if an API response contains markup', async () => {
    const { dom, document } = await renderFor('elder', [{ id: 'family', name: '<script>alert(1)</script>', role: 'family' }]);
    expect(document.querySelector('#member-list script')).toBeNull();
    expect(document.querySelector('#member-list').textContent).toContain('<script>alert(1)</script>');
    dom.window.close();
  });
});
