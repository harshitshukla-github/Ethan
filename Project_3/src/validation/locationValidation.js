import { CATEGORIES } from '../constants.js';
import { HttpError } from '../utils/httpError.js';

const MAX_UNSIGNED_INT = 4_294_967_295;

const TEXT_FIELDS = {
  name: { label: 'Name', max: 150, min: 2 },
  address: { label: 'Address', max: 255, min: 5 },
  description: { label: 'Description', max: 2000 },
  website: { label: 'Website', max: 255 },
  phone: { label: 'Phone', max: 40 },
  hours: { label: 'Opening hours', max: 255 },
};

const PHONE_PATTERN = /^[0-9+().\-\s]{5,40}$/;

/*
• Accepts `?category=compost`, `?category=compost,electronics` or repeated `?category=` params.
• Returns a de-duplicated array; an empty array means "all categories".
*/
export function parseCategoryFilter(raw) {
  if (raw === undefined) return [];

  const values = (Array.isArray(raw) ? raw : [raw])
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const unknown = values.filter((value) => !CATEGORIES.includes(value));
  if (unknown.length > 0) {
    throw new HttpError(400, `Unknown category: ${unknown.join(', ')}.`, {
      category: `Must be one of: ${CATEGORIES.join(', ')}.`,
    });
  }
  return [...new Set(values)];
}

export function parseLocationId(raw) {
  const id = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isSafeInteger(id) || id < 1 || id > MAX_UNSIGNED_INT) {
    throw new HttpError(400, 'Location id must be a positive integer.');
  }
  return id;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/*
• Validates and normalises a POST /api/locations/suggest body.
• Unknown fields (including any client-sent is_verified) are dropped.
• Throws HttpError(400) with per-field details when anything is invalid.
*/
export function validateSuggestion(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }

  const errors = {};

  const readText = (field, { required = false } = {}) => {
    const { label, max, min = 0 } = TEXT_FIELDS[field];
    const raw = body[field];
    if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
      if (required) errors[field] = `${label} is required.`;
      return null;
    }
    if (typeof raw !== 'string') {
      errors[field] = `${label} must be text.`;
      return null;
    }
    const value = raw.trim();
    if (value.length < min) {
      errors[field] = `${label} must be at least ${min} characters.`;
      return null;
    }
    if (value.length > max) {
      errors[field] = `${label} must be at most ${max} characters.`;
      return null;
    }
    return value;
  };

  const readCoordinate = (field, label, limit) => {
    const raw = body[field];
    const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors[field] = `${label} is required and must be a number.`;
      return null;
    }
    if (value < -limit || value > limit) {
      errors[field] = `${label} must be between -${limit} and ${limit}.`;
      return null;
    }
    // DECIMAL(9,6) in the schema stores 6 decimal places (~0.1 m).
    return Math.round(value * 1e6) / 1e6;
  };

  const suggestion = {
    name: readText('name', { required: true }),
    category: null,
    address: readText('address', { required: true }),
    latitude: readCoordinate('latitude', 'Latitude', 90),
    longitude: readCoordinate('longitude', 'Longitude', 180),
    description: readText('description'),
    website: readText('website'),
    phone: readText('phone'),
    hours: readText('hours'),
  };

  if (CATEGORIES.includes(body.category)) {
    suggestion.category = body.category;
  } else {
    errors.category = `Category must be one of: ${CATEGORIES.join(', ')}.`;
  }

  if (suggestion.website && !isHttpUrl(suggestion.website)) {
    errors.website = 'Website must be a full http:// or https:// URL.';
  }
  if (suggestion.phone && !PHONE_PATTERN.test(suggestion.phone)) {
    errors.phone = 'Phone may only contain digits, spaces and + ( ) - . characters.';
  }

  if (Object.keys(errors).length > 0) {
    throw new HttpError(400, 'Some fields need attention.', errors);
  }
  return suggestion;
}
