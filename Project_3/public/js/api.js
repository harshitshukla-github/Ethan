/** Error raised for non-2xx responses; `details` holds per-field validation messages. */
export class ApiError extends Error {
  constructor(message, { status = 0, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Could not reach the server. Check your connection and try again.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(payload?.error?.message ?? `Request failed with status ${response.status}.`, {
      status: response.status,
      details: payload?.error?.details ?? null,
    });
  }
  return payload;
}

export function getConfig() {
  return request('/api/config');
}

export async function getLocations(categories = [], { signal } = {}) {
  const query = categories.length > 0 ? `?${new URLSearchParams({ category: categories.join(',') })}` : '';
  const { data } = await request(`/api/locations${query}`, { signal });
  return data;
}

export async function getLocation(id, { signal } = {}) {
  const { data } = await request(`/api/locations/${encodeURIComponent(id)}`, { signal });
  return data;
}

export function suggestLocation(suggestion) {
  return request('/api/locations/suggest', { method: 'POST', body: suggestion });
}
