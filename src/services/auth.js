'use strict';

const { createHmac, createHash, randomInt } = require('node:crypto');
const bcrypt = require('bcryptjs');

const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 10;
const INVITE_ROLES = Object.freeze(['caretaker', 'family']);
const INDEX_ROLES = Object.freeze(['elder', ...INVITE_ROLES]);

/** @param {string} secret @param {string} code */
function inviteIndexId(secret, code) {
  return createHmac('sha256', secret).update(`sentidose-invite:${code}`).digest('hex');
}

/** @returns {string} a six-digit code, including leading zeroes */
function generatePasscode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** @param {object} dependencies */
function createAuthService({ getFirestore, sessionSecret, now = () => Date.now() }) {
  /**
   * Creates a care space and one-time-to-view invitations for its two member roles.
   * @param {{elderName:string, elderEmail:string, pin:string}} input
   */
  async function createCareSpace(input) {
    const db = getFirestore();
    const spaceRef = db.collection('careSpaces').doc();
    const people = [
      ...input.caretakers.map((person, index) => ({ ...person, role: 'caretaker', primary: index === 0 })),
      ...input.familyMembers.map((person) => ({ ...person, role: 'family' })),
    ];
    const elderRef = spaceRef.collection('members').doc();
    const memberRefs = people.map(() => spaceRef.collection('members').doc());
    const auditRef = spaceRef.collection('auditLog').doc();
    const createdAt = new Date(now());
    const expiresAt = new Date(createdAt.getTime() + INVITE_TTL_MS);
    const requestHash = createHmac('sha256', sessionSecret).update(`space-create:${input.idempotencyKey}`).digest('hex');
    const payloadHash = createHash('sha256').update(JSON.stringify({ ...input, idempotencyKey: undefined })).digest('hex');
    const requestRef = db.collection('spaceCreationRequests').doc(requestHash);
    const inviteCodes = {};
    let indexIds;

    // Ensure both active invite codes are unique in the global lookup collection.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      inviteCodes.caretaker = generatePasscode();
      inviteCodes.family = generatePasscode();
      if (inviteCodes.caretaker === inviteCodes.family || input.pin === inviteCodes.caretaker || input.pin === inviteCodes.family) continue;
      indexIds = INDEX_ROLES.map((role) => inviteIndexId(sessionSecret, role === 'elder' ? input.pin : inviteCodes[role]));
      const available = await db.runTransaction(async (transaction) => {
        const requestSnapshot = await transaction.get(requestRef);
        if (requestSnapshot.exists) return 'already-created';
        const refs = indexIds.map((id) => db.collection('inviteCodeIndex').doc(id));
        const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
        if (snapshots.some((snapshot) => snapshot.exists)) return false;

        const [caretakerHash, familyHash, elderPinHash] = await Promise.all([
          bcrypt.hash(inviteCodes.caretaker, BCRYPT_ROUNDS),
          bcrypt.hash(inviteCodes.family, BCRYPT_ROUNDS),
          bcrypt.hash(input.pin, BCRYPT_ROUNDS),
        ]);

        transaction.create(spaceRef, {
          elderName: input.elderName,
          displayName: input.displayName,
          language: input.language,
          timezone: input.timezone,
          createdAt,
          elderPinHash,
          elderMemberId: elderRef.id,
          primaryCaretakerId: memberRefs[0] && people[0].primary ? memberRefs[0].id : null,
          passcodeHashes: { caretaker: caretakerHash, family: familyHash },
          inviteCodeIndexIds: {
            caretaker: indexIds[1],
            family: indexIds[2],
          },
          inviteExpiresAt: expiresAt,
        });
        transaction.create(elderRef, {
          name: input.elderName,
          email: input.elderEmail,
          role: 'elder',
          displayName: input.displayName,
          active: true,
          sessionVersion: 0,
          createdAt,
        });
        people.forEach((person, index) => transaction.create(memberRefs[index], {
          name: person.name,
          email: person.email,
          ...(person.phone ? { phone: person.phone } : {}),
          ...(person.relation ? { relation: person.relation } : {}),
          role: person.role,
          active: true,
          sessionVersion: 0,
          createdAt,
        }));
        transaction.create(auditRef, {
          actor: elderRef.id,
          action: 'care_space.created',
          target: spaceRef.id,
          at: createdAt,
        });
        transaction.create(requestRef, { spaceId: spaceRef.id, payloadHash, createdAt });
        INDEX_ROLES.forEach((role, index) => {
          transaction.create(db.collection('inviteCodeIndex').doc(indexIds[index]), {
            spaceId: spaceRef.id,
            role,
            expiresAt: role === 'elder' ? null : expiresAt,
          });
        });
        return true;
      });

      if (available === 'already-created') return { alreadyCreated: true };
      if (available) {
        return {
          spaceId: spaceRef.id,
          memberId: elderRef.id,
          name: input.displayName,
          role: 'elder',
          elderName: input.elderName,
          displayName: input.displayName,
          sessionVersion: 0,
          elderCode: input.pin,
          inviteCodes,
        };
      }
    }

    const error = new Error('Could not create unique invite codes. Please try again.');
    error.status = 503;
    throw error;
  }

  /**
   * Joins an existing care space using its role-specific invitation code.
   * @param {{name:string, role:'caretaker'|'family', code:string}} input
   */
  async function joinCareSpace(input) {
    const db = getFirestore();
    const indexRef = db.collection('inviteCodeIndex').doc(inviteIndexId(sessionSecret, input.code));
    const result = await db.runTransaction(async (transaction) => {
      const indexSnapshot = await transaction.get(indexRef);
      if (!indexSnapshot.exists) return null;

      const index = indexSnapshot.data();
      const expiry = index.expiresAt == null
        ? null
        : index.expiresAt && typeof index.expiresAt.toMillis === 'function'
          ? index.expiresAt.toMillis()
          : new Date(index.expiresAt).getTime();
      if (expiry !== null && (!Number.isFinite(expiry) || expiry <= now())) return null;

      const spaceRef = db.collection('careSpaces').doc(index.spaceId);
      const spaceSnapshot = await transaction.get(spaceRef);
      if (!spaceSnapshot.exists) return null;
      const space = spaceSnapshot.data();
      const role = index.role;
      if (!INDEX_ROLES.includes(role)) return null;
      const expectedHash = role === 'elder'
        ? space.elderPinHash
        : space.passcodeHashes && space.passcodeHashes[role];
      if (!expectedHash || !(await bcrypt.compare(input.code, expectedHash))) {
        return null;
      }

      if (role === 'elder') {
        return {
          spaceId: spaceRef.id,
          memberId: space.elderMemberId,
          name: space.displayName || space.elderName,
          elderName: space.elderName,
          displayName: space.displayName || space.elderName,
          role,
        };
      }

      if (!input.email) {
        const error = new Error('Email is required for caretaker and family accounts.');
        error.status = 400;
        throw error;
      }

      const members = spaceRef.collection('members');
      const matches = await transaction.get(members.where('email', '==', input.email.toLowerCase()).limit(2));
      const existing = matches.docs[0];
      if (existing && existing.get('role') !== role) {
        const error = new Error('That email is already on this care-space roster with a different role. Ask the elder to update the roster.');
        error.status = 400;
        throw error;
      }
      const memberRef = existing ? existing.ref : members.doc();
      const memberData = {
        name: input.name,
        email: input.email.toLowerCase(),
        role,
        active: true,
        sessionVersion: (existing && existing.get('sessionVersion') || 0) + (existing && existing.get('active') === false ? 1 : 0),
        ...(existing && existing.get('relation') ? { relation: existing.get('relation') } : {}),
        createdAt: existing ? existing.get('createdAt') : new Date(now()),
      };
      if (existing) transaction.update(memberRef, memberData);
      else transaction.create(memberRef, memberData);
      if (role === 'caretaker' && !space.primaryCaretakerId) transaction.update(spaceRef, { primaryCaretakerId: memberRef.id });
      return { spaceId: spaceRef.id, memberId: memberRef.id, name: input.name, role, elderName: space.elderName, displayName: space.displayName || space.elderName, sessionVersion: memberData.sessionVersion };
    });

    if (!result) {
      const error = new Error('That code is invalid or has expired. Ask the care-space owner for a new code.');
      error.status = 401;
      throw error;
    }
    return result;
  }

  async function getMemberStatus(spaceId, memberId) {
    const snapshot = await getFirestore().collection('careSpaces').doc(spaceId).collection('members').doc(memberId).get();
    return snapshot.exists ? { active: snapshot.get('active') !== false, role: snapshot.get('role'), sessionVersion: snapshot.get('sessionVersion') || 0 } : { active: false };
  }

  async function rotateInviteCode(spaceId, role) {
    if (!INVITE_ROLES.includes(role)) {
      const error = new Error('Choose caretaker or family.');
      error.status = 400;
      throw error;
    }
    const db = getFirestore();
    const spaceRef = db.collection('careSpaces').doc(spaceId);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = generatePasscode();
      const indexId = inviteIndexId(sessionSecret, code);
      const newIndexRef = db.collection('inviteCodeIndex').doc(indexId);
      const rotated = await db.runTransaction(async (transaction) => {
        const [spaceSnapshot, collision, oldIndexes] = await Promise.all([
          transaction.get(spaceRef),
          transaction.get(newIndexRef),
          transaction.get(db.collection('inviteCodeIndex').where('spaceId', '==', spaceId).where('role', '==', role)),
        ]);
        if (!spaceSnapshot.exists) {
          const error = new Error('Care space was not found.');
          error.status = 404;
          throw error;
        }
        if (collision.exists) return null;
        const expiresAt = new Date(now() + INVITE_TTL_MS);
        const hash = await bcrypt.hash(code, BCRYPT_ROUNDS);
        oldIndexes.docs.forEach((snapshot) => transaction.delete(snapshot.ref));
        transaction.create(newIndexRef, { spaceId, role, expiresAt });
        transaction.update(spaceRef, {
          [`passcodeHashes.${role}`]: hash,
          [`inviteCodeIndexIds.${role}`]: indexId,
          inviteExpiresAt: expiresAt,
        });
        return { code, expiresAt };
      });
      if (rotated) return rotated;
    }
    const error = new Error('Could not generate a unique code. Please try again.');
    error.status = 503;
    throw error;
  }

  return { createCareSpace, joinCareSpace, rotateInviteCode, getMemberStatus };
}

module.exports = { createAuthService, inviteIndexId, INVITE_TTL_MS, INVITE_ROLES, INDEX_ROLES };
