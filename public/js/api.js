/* API client. The front end currently reads demo data from store.js; these
   helpers already speak the wire format so M2-M6 only swap the call sites. */

/**
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function api(path, options = {}) {
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
  return body;
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
