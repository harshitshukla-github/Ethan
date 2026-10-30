// Thin wrapper around fetch for the JSON API. Requests are same-origin, so the browser
// attaches the HttpOnly session cookie by itself; no token ever passes through JavaScript.

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // Per-field validation messages from the server, e.g. { email: '...' }.
    this.fields = fields ?? {};
  }
}

let onUnauthorized = null;

// Lets the auth context react when a session expires or is revoked mid-visit.
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function request(method, path, { body, signal } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) onUnauthorized?.();
    throw new ApiError(
      payload?.error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      payload?.error?.fields,
    );
  }
  return payload;
}

export const api = {
  get: (path, options) => request('GET', path, options),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  delete: (path, body) => request('DELETE', path, { body }),
};
