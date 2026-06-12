// src/utils/AppError.js
// Custom error class.
//
// WHY CUSTOM ERROR CLASS: Allows us to attach an HTTP status code and an
// "isOperational" flag to errors. Operational errors (bad input, not found,
// unauthorized) are safe to send to the client. Programming errors (bugs)
// should return a generic 500 message. The global error handler checks
// isOperational to decide what to expose.

class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (400, 401, 403, 404, etc.)
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes our errors from unexpected bugs

    // Preserve correct stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
