import { HttpError } from './httpError.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
// Upper bound keeps a huge "password" from being used to tie up the hashing function.
const PASSWORD_MAX = 128;

export function checkName(value) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 2) return { error: 'Enter your name (at least 2 characters).' };
  if (name.length > 60) return { error: 'Name must be 60 characters or fewer.' };
  return { value: name };
}

export function checkEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!email) return { error: 'Enter your email address.' };
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return { error: 'Enter a valid email address.' };
  return { value: email };
}

export function checkNewPassword(value) {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN) {
    return { error: `Use at least ${PASSWORD_MIN} characters.` };
  }
  if (value.length > PASSWORD_MAX) return { error: `Use ${PASSWORD_MAX} characters or fewer.` };
  return { value };
}

// For passwords being checked against a stored hash: only presence and a sane length matter.
export function checkPassword(value) {
  if (typeof value !== 'string' || !value) return { error: 'Enter your password.' };
  if (value.length > PASSWORD_MAX) return { error: 'That password is too long.' };
  return { value };
}

// Runs each rule against the matching body field and throws one 400 listing every problem.
export function validate(body, rules) {
  const values = {};
  const fields = {};
  for (const [key, check] of Object.entries(rules)) {
    const result = check(body?.[key]);
    if (result.error) fields[key] = result.error;
    else values[key] = result.value;
  }
  if (Object.keys(fields).length > 0) {
    throw new HttpError(400, 'Please fix the highlighted fields.', fields);
  }
  return values;
}
