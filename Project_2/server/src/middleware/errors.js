import { HttpError } from '../lib/httpError.js';

export function apiNotFound(req, res) {
  res.status(404).json({ error: { message: `No API route for ${req.method} ${req.originalUrl}` } });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { message: err.message, fields: err.fields } });
  }

  // Errors raised by express.json(): malformed or oversized request bodies.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'The request body must be valid JSON.' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'The request body is too large.' } });
  }

  console.error(err);
  res.status(500).json({ error: { message: 'Something went wrong on our side. Please try again.' } });
}
