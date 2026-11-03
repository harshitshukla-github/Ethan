/**
 * An error whose message is safe to show to API clients.
 * `details` maps field names to messages for validation failures.
 */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}
