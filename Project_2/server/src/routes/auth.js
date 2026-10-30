import { Router } from 'express';
import { db } from '../db.js';
import { HttpError } from '../lib/httpError.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { endOtherSessions, endSession, startSession } from '../lib/sessions.js';
import { checkEmail, checkName, checkNewPassword, checkPassword, validate } from '../lib/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { accountLimiter, loginLimiter, signupLimiter } from '../middleware/rateLimits.js';

const router = Router();

const publicColumns = 'id, name, email, created_at AS createdAt';
const selectUserById = db.prepare(`SELECT ${publicColumns} FROM users WHERE id = ?`);
const selectCredentials = db.prepare('SELECT id, password_hash AS passwordHash FROM users WHERE email = ?');
const selectPasswordHash = db.prepare('SELECT password_hash AS passwordHash FROM users WHERE id = ?');
const insertUser = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
const updateName = db.prepare('UPDATE users SET name = ? WHERE id = ?');
const updatePassword = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');

const emailTaken = () =>
  new HttpError(409, 'An account with this email already exists.', {
    email: 'This email is already registered. Try signing in instead.',
  });

// Checked when the email is unknown, so a sign-in attempt takes the same time either way
// and response timing does not reveal which addresses have accounts.
const decoyHash = hashPassword('decoy-password-for-unknown-accounts');

async function requireCurrentPassword(userId, password, field) {
  const { passwordHash } = selectPasswordHash.get(userId);
  if (!(await verifyPassword(password, passwordHash))) {
    throw new HttpError(400, 'That password is not correct.', { [field]: 'Incorrect password.' });
  }
}

router.post('/register', signupLimiter, async (req, res) => {
  const { name, email, password } = validate(req.body, {
    name: checkName,
    email: checkEmail,
    password: checkNewPassword,
  });

  if (selectCredentials.get(email)) throw emailTaken();

  const passwordHash = await hashPassword(password);
  let userId;
  try {
    userId = insertUser.run(name, email, passwordHash).lastInsertRowid;
  } catch (err) {
    // Two sign-ups for the same address can race past the check above.
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') throw emailTaken();
    throw err;
  }

  startSession(req, res, userId);
  res.status(201).json({ user: selectUserById.get(userId) });
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = validate(req.body, { email: checkEmail, password: checkPassword });

  const account = selectCredentials.get(email);
  const passwordMatches = await verifyPassword(password, account?.passwordHash ?? (await decoyHash));
  if (!account || !passwordMatches) {
    throw new HttpError(401, 'Incorrect email or password.');
  }

  startSession(req, res, account.id);
  res.json({ user: selectUserById.get(account.id) });
});

router.post('/logout', (req, res) => {
  endSession(req, res);
  res.status(204).end();
});

// Always 200: `user` is null for visitors, which lets the client check its session without an error.
router.get('/me', (req, res) => {
  res.json({ user: req.user });
});

router.patch('/me', requireAuth, (req, res) => {
  const { name } = validate(req.body, { name: checkName });
  updateName.run(name, req.user.id);
  res.json({ user: selectUserById.get(req.user.id) });
});

router.post('/password', requireAuth, accountLimiter, async (req, res) => {
  const { currentPassword, newPassword } = validate(req.body, {
    currentPassword: checkPassword,
    newPassword: checkNewPassword,
  });

  await requireCurrentPassword(req.user.id, currentPassword, 'currentPassword');
  updatePassword.run(await hashPassword(newPassword), req.user.id);
  endOtherSessions(req, req.user.id);
  res.status(204).end();
});

router.delete('/me', requireAuth, accountLimiter, async (req, res) => {
  const { password } = validate(req.body, { password: checkPassword });

  await requireCurrentPassword(req.user.id, password, 'password');
  // Sessions and favorites go with the user through ON DELETE CASCADE.
  deleteUser.run(req.user.id);
  endSession(req, res);
  res.status(204).end();
});

export default router;
