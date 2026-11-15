'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const names = /\b(?:Dadu|Subrata|Halder|Rahul|Priya|Meena|Banerjee|Sen)\b/iu;

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(fullPath) : [fullPath];
  });
}

describe('new accounts have no mock identities', () => {
  test('runtime source and rendered page templates contain no demo people', () => {
    const files = [...sourceFiles(path.join(root, 'public')), ...sourceFiles(path.join(root, 'src')), path.join(root, 'index.html')];
    files.forEach((file) => {
      expect(fs.readFileSync(file, 'utf8')).not.toMatch(names);
    });
  });

  test('the empty in-memory cache starts with no sample roster or records', () => {
    const storeSource = fs.readFileSync(path.join(root, 'public/js/store.js'), 'utf8');
    expect(storeSource).not.toMatch(names);
    expect(storeSource).toContain('members: []');
    expect(storeSource).toContain('medicines: []');
    expect(storeSource).toContain('appointments: []');
  });
});
