'use strict';

const bcrypt = require('bcryptjs');
const { createAuthService, inviteIndexId } = require('../src/services/auth');

function memoryFirestore(seed) {
  const documents = new Map(Object.entries(seed));
  let nextId = 0;
  const ref = (collectionPath, id) => ({
    id,
    path: `${collectionPath}/${id}`,
    collection: (name) => collection(`${collectionPath}/${id}/${name}`),
  });
  const collection = (collectionPath) => ({
    doc: (id = `generated-${++nextId}`) => ref(collectionPath, id),
    where(field, operator, value) {
      return {
        collectionPath,
        filters: [[field, operator, value]],
        where(nextField, nextOperator, nextValue) {
          this.filters.push([nextField, nextOperator, nextValue]);
          return this;
        },
      };
    },
  });
  const snapshot = (documentRef) => {
    const stored = documents.get(documentRef.path);
    return {
      exists: Boolean(stored),
      ref: documentRef,
      data: () => stored && stored.data,
      get: (field) => stored && stored.data[field],
    };
  };
  const db = {
    collection,
    async runTransaction(work) {
      const transaction = {
        async get(target) {
          if (target.filters) {
            const docs = [];
            for (const [path, stored] of documents) {
              if (stored.collectionPath !== target.collectionPath) continue;
              const matches = target.filters.every(([field, operator, value]) => operator === '==' && stored.data[field] === value);
              if (matches) docs.push(snapshot({ id: path.split('/').at(-1), path, collection: target.collectionPath }));
            }
            return { docs };
          }
          return snapshot(target);
        },
        create(target, data) { documents.set(target.path, { collectionPath: target.path.slice(0, target.path.lastIndexOf('/')), data: structuredClone(data) }); },
        delete(target) { documents.delete(target.path); },
        update(target, patch) {
          const stored = documents.get(target.path);
          for (const [key, value] of Object.entries(patch)) {
            const parts = key.split('.');
            let cursor = stored.data;
            while (parts.length > 1) {
              const part = parts.shift();
              cursor[part] ||= {};
              cursor = cursor[part];
            }
            cursor[parts[0]] = value;
          }
        },
      };
      return work(transaction);
    },
  };
  return { db, documents };
}

describe('invite code rotation', () => {
  test('invalidates the old code and derives the new member role from the index', async () => {
    const secret = 'test-session-secret';
    const oldCode = '123456';
    const oldIndex = inviteIndexId(secret, oldCode);
    const familyHash = await bcrypt.hash(oldCode, 4);
    const { db, documents } = memoryFirestore({
      'careSpaces/space-1': {
        collectionPath: 'careSpaces',
        data: { elderName: 'Subrata', passcodeHashes: { family: familyHash }, inviteCodeIndexIds: { family: oldIndex } },
      },
      [`inviteCodeIndex/${oldIndex}`]: {
        collectionPath: 'inviteCodeIndex',
        data: { spaceId: 'space-1', role: 'family', expiresAt: new Date(Date.now() + 60_000) },
      },
    });
    const authService = createAuthService({ getFirestore: () => db, sessionSecret: secret });

    const rotated = await authService.rotateInviteCode('space-1', 'family');
    expect(documents.has(`inviteCodeIndex/${oldIndex}`)).toBe(false);
    expect(documents.get('careSpaces/space-1').data.passcodeHashes.family).not.toBe(rotated.code);
    await expect(authService.joinCareSpace({ name: 'Rahul', email: 'rahul@example.test', code: oldCode, role: 'family' })).rejects.toMatchObject({ status: 401 });

    const joined = await authService.joinCareSpace({ name: 'Rahul', email: 'rahul@example.test', code: rotated.code, role: 'caretaker' });
    expect(joined.role).toBe('family');
  });
});
