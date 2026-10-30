// Mirrors the server's rules (server/src/lib/validate.js) so most mistakes are caught before a
// request is sent. The server remains the authority and may still return field errors.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN_LENGTH = 8;

export function nameError(name) {
  const length = name.trim().length;
  if (length < 2) return 'Enter your name (at least 2 characters).';
  if (length > 60) return 'Name must be 60 characters or fewer.';
  return null;
}

export function emailError(email) {
  if (!email.trim()) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.';
  return null;
}

export function newPasswordError(password) {
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (password.length > 128) return 'Use 128 characters or fewer.';
  return null;
}

// Drops the entries that passed, leaving only fields with a message.
export function collectErrors(checks) {
  return Object.fromEntries(Object.entries(checks).filter(([, message]) => message));
}
