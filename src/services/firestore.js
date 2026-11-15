'use strict';

const { Firestore } = require('@google-cloud/firestore');

/**
 * Creates a lazy Firestore accessor so health checks and static pages can boot
 * even when the optional database integration is not configured.
 * @param {object} config
 * @returns {() => import('@google-cloud/firestore').Firestore}
 */
function createFirestoreAccessor(config) {
  let client;

  return function getFirestore() {
    if (client) return client;
    if (!config.projectId) {
      const error = new Error('Firestore is not configured: set GOOGLE_CLOUD_PROJECT.');
      error.status = 503;
      throw error;
    }

    client = new Firestore({
      projectId: config.projectId,
      ...(config.googleCredentials ? { credentials: config.googleCredentials } : {}),
    });
    return client;
  };
}

module.exports = { createFirestoreAccessor };
