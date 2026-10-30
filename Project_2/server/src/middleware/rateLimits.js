import { rateLimit } from 'express-rate-limit';

const MINUTE = 60 * 1000;

const limiter = ({ message, ...options }) =>
  rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: { message } }),
    ...options,
  });

// Only failed attempts count, so signing in normally never locks anyone out.
export const loginLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
});

export const signupLimiter = limiter({
  windowMs: 60 * MINUTE,
  limit: 10,
  message: 'Too many accounts created from this network. Please try again later.',
});

// Password checks are deliberately slow; this keeps them from being used to exhaust the server.
export const accountLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  message: 'Too many attempts. Please wait a few minutes and try again.',
});

// Protects the free third-party APIs that the launch and gallery endpoints proxy.
export const upstreamLimiter = limiter({
  windowMs: MINUTE,
  limit: 60,
  message: 'You are searching very quickly. Please slow down for a moment.',
});
