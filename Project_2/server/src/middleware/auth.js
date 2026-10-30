import { HttpError } from '../lib/httpError.js';
import { getSessionUser } from '../lib/sessions.js';

// Attaches the signed-in user (or null) to every API request.
export function loadUser(req, res, next) {
  req.user = getSessionUser(req);
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) throw new HttpError(401, 'Please sign in to continue.');
  next();
}
