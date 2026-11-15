'use strict';

const { createHmac, randomInt } = require('node:crypto');
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
    const elderRef = spaceRef.collection('members').doc();
    const createdAt = new Date(now());
    const expiresAt = new Date(createdAt.getTime() + INVITE_TTL_MS);
    const inviteCodes = {};
    let indexIds;

    // Ensure both active invite codes are unique in the global lookup collection.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      inviteCodes.caretaker = generatePasscode();
      inviteCodes.family = generatePasscode();
      if (inviteCodes.caretaker === inviteCodes.family || input.pin === inviteCodes.caretaker || input.pin === inviteCodes.family) continue;
      indexIds = INDEX_ROLES.map((role) => inviteIndexId(sessionSecret, role === 'elder' ? input.pin : inviteCodes[role]));
      const available = await db.runTransaction(async (transaction) => {
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
          elderEmail: input.elderEmail,
          timezone: input.timezone,
          createdAt,
          elderPinHash,
          elderMemberId: elderRef.id,
          passcodeHashes: { caretaker: caretakerHash, family: familyHash },
          inviteExpiresAt: expiresAt,
        });
        transaction.create(elderRef, {
          name: input.elderName,
          email: input.elderEmail,
          role: 'elder',
          createdAt,
        });
        INDEX_ROLES.forEach((role, index) => {
          transaction.create(db.collection('inviteCodeIndex').doc(indexIds[index]), {
            spaceId: spaceRef.id,
            role,
            expiresAt: role === 'elder' ? null : expiresAt,
          });
        });
        return true;
      });

      if (available) {
        return {
          spaceId: spaceRef.id,
          memberId: elderRef.id,
          name: input.elderName,
          role: 'elder',
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
      const expectedHash = input.role === 'elder'
        ? space.elderPinHash
        : space.passcodeHashes && space.passcodeHashes[input.role];
      if (!expectedHash || index.role !== input.role || !(await bcrypt.compare(input.code, expectedHash))) {
        return null;
      }

      if (input.role === 'elder') {
        return {
          spaceId: spaceRef.id,
          memberId: space.elderMemberId,
          name: space.elderName,
          role: 'elder',
        };
      }

      // Use a correctly scoped member collection ref after the index identifies the space.
      const scopedMemberRef = spaceRef.collection('members').doc();
      transaction.create(scopedMemberRef, {
        name: input.name,
        ...(input.email ? { email: input.email } : {}),
        role: input.role,
        createdAt: new Date(now()),
      });
      if (input.role === 'caretaker' && !space.primaryCaretakerId) {
        transaction.update(spaceRef, { primaryCaretakerId: scopedMemberRef.id });
      }
      return { spaceId: spaceRef.id, memberId: scopedMemberRef.id, name: input.name, role: input.role };
    });

    if (!result) {
      const error = new Error('That code is invalid or has expired. Ask the care-space owner for a new code.');
      error.status = 401;
      throw error;
    }
    return result;
  }

  return { createCareSpace, joinCareSpace };
}

module.exports = { createAuthService, inviteIndexId, INVITE_TTL_MS, INVITE_ROLES, INDEX_ROLES };
