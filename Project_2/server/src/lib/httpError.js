// Thrown from route handlers; the error middleware turns it into a JSON response.
export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
