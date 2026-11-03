import { HttpError } from '../utils/httpError.js';

// mysql2 / Node socket codes that mean "the database cannot be reached right now".
const DB_UNAVAILABLE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_SEQUENCE_TIMEOUT',
  'ER_ACCESS_DENIED_ERROR',
  'ER_DBACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
  'ER_CON_COUNT_ERROR',
  'ER_SERVER_SHUTDOWN',
  'POOL_CLOSED',
]);

// The server is reachable but the tables are missing or out of date.
const DB_SCHEMA_CODES = new Set(['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR', 'ER_BAD_TABLE_ERROR']);

/** Node reports multi-address connect failures as an AggregateError whose children carry the code. */
function errorCode(err) {
  return err?.code ?? err?.errors?.find?.((inner) => inner?.code)?.code;
}

export function isDatabaseUnavailable(err) {
  return DB_UNAVAILABLE_CODES.has(errorCode(err));
}

function sendError(res, status, message, details) {
  res.status(status).json({ error: details ? { message, details } : { message } });
}

export function apiNotFound(req, res) {
  sendError(res, 404, `No API route for ${req.method} ${req.originalUrl}.`);
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    return sendError(res, err.status, err.message, err.details);
  }

  // Errors raised by express.json() (malformed JSON, oversized body, bad charset).
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'Request body must be valid JSON.');
  }
  if (err.type === 'entity.too.large') {
    return sendError(res, 413, 'Request body is too large.');
  }
  if (err.expose && Number.isInteger(err.status) && err.status < 500) {
    return sendError(res, err.status, err.message);
  }

  const code = errorCode(err);
  if (isDatabaseUnavailable(err)) {
    console.error(`[db] ${req.method} ${req.originalUrl} failed: database unavailable (${code}).`);
    res.set('Retry-After', '30');
    return sendError(res, 503, 'The location database is temporarily unavailable. Please try again shortly.');
  }

  if (DB_SCHEMA_CODES.has(code)) {
    console.error(
      `[db] ${req.method} ${req.originalUrl} failed: ${err.message}. Has the schema been applied? Run "npm run db:setup".`,
    );
  } else {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }
  return sendError(res, 500, 'Something went wrong on our side. Please try again.');
}
