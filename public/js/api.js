/* Same-origin API client with a persistent, accessible recovery message. */

/**
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function api(path, options = {}) {
  try {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });

    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    const body = isJson ? await response.json() : { error: await response.text() };

    if (!response.ok) {
      const error = new Error(body.error || `Request failed with ${response.status}`);
      error.status = response.status;
      throw error;
    }

    clearRequestError();
    return body;
  } catch (error) {
    const message = error && Number.isInteger(error.status) && error.message
      ? error.message
      : 'We could not reach SentiDose. Check your connection and try again.';
    showRequestError(message);
    throw error;
  }
}

const API = {
  /** @param {string} path @param {object} data */
  post: (path, data) => api(path, { method: 'POST', body: JSON.stringify(data) }),
  /** @param {string} path */
  get: (path) => api(path, { method: 'GET' }),
  /** @param {string} path @param {object} data */
  patch: (path, data) => api(path, { method: 'PATCH', body: JSON.stringify(data) }),
  /** @param {string} path */
  del: (path) => api(path, { method: 'DELETE' }),
};
