'use strict';

const { createAuthService } = require('../src/services/auth');

function memoryFirestore({ failMemberWrite = false } = {}) {
  const documents = new Map();
  let nextId = 0;
  const ref = (path) => ({
    id: path.split('/').at(-1),
    path,
    collection(name) { return collection(`${path}/${name}`); },
    get() { return Promise.resolve(snapshot(this)); },
  });
  const collection = (path) => ({
    doc(id) { return ref(`${path}/${id || `doc-${++nextId}`}`); },
  });
  const snapshot = (documentRef) => {
    const item = documents.get(documentRef.path);
    return {
      exists: Boolean(item),
      ref: documentRef,
      data: () => item && structuredClone(item),
      get: (field) => item && item[field],
    };
  };
  const db = {
    collection,
    async runTransaction(work) {
      const writes = [];
      const transaction = {
        async get(documentRef) { return snapshot(documentRef); },
        create(documentRef, data) {
          if (failMemberWrite && documentRef.path.includes('/members/')) throw new Error('injected member write failure');
          writes.push([documentRef.path, structuredClone(data)]);
        },
        update(documentRef, data) { writes.push([documentRef.path, { ...(documents.get(documentRef.path) || {}), ...structuredClone(data) }]); },
        delete(documentRef) { writes.push([documentRef.path, null]); },
      };
      const result = await work(transaction);
      writes.forEach(([path, data]) => data === null ? documents.delete(path) : documents.set(path, data));
      return result;
    },
  };
  return { db, documents };
}

const input = {
  elderName: 'শুভ্রা সেন',
  displayName: 'শুভ্রা',
  elderEmail: 'elder@example.test',
  language: 'Bengali',
  caretakers: [{ name: 'अनिल कुमार', email: 'helper@example.test', phone: '' }],
  familyMembers: [{ name: 'কাবেরী দাস', relation: 'Daughter', email: 'family@example.test', phone: '' }],
  pin: '042591',
  idempotencyKey: 'one-request-key-000000000001',
  timezone: 'Asia/Kolkata',
};

describe('atomic care-space creation', () => {
  test('saves Unicode names and all initial members in the same creation transaction', async () => {
    const { db, documents } = memoryFirestore();
    const service = createAuthService({ getFirestore: () => db, sessionSecret: 'test-session-secret', now: () => Date.UTC(2026, 10, 15) });
    const result = await service.createCareSpace(input);
    const stored = [...documents.entries()];
    const space = stored.find(([path]) => path.startsWith('careSpaces/') && !path.includes('/members/') && !path.includes('/auditLog/'))[1];
    const roster = stored.filter(([path]) => path.includes('/members/')).map(([, data]) => data);
    expect(result.displayName).toBe('শুভ্রা');
    expect(space.displayName).toBe('শুভ্রা');
    expect(roster.map((member) => member.name)).toEqual(['শুভ্রা সেন', 'अनिल कुमार', 'কাবেরী দাস']);
    expect(stored.some(([path]) => path.includes('/auditLog/'))).toBe(true);
  });

  test('leaves no care space, members or audit record after a member write fails', async () => {
    const { db, documents } = memoryFirestore({ failMemberWrite: true });
    const service = createAuthService({ getFirestore: () => db, sessionSecret: 'test-session-secret' });
    await expect(service.createCareSpace(input)).rejects.toThrow('injected member write failure');
    expect(documents.size).toBe(0);
  });

  test('retries with the same idempotency key create only one space', async () => {
    const { db, documents } = memoryFirestore();
    const service = createAuthService({ getFirestore: () => db, sessionSecret: 'test-session-secret' });
    const first = await service.createCareSpace(input);
    const retry = await service.createCareSpace(input);
    expect(first.spaceId).toBeTruthy();
    expect(retry).toEqual({ alreadyCreated: true });
    expect([...documents.keys()].filter((path) => /^careSpaces\/[^/]+$/.test(path))).toHaveLength(1);
  });
});
