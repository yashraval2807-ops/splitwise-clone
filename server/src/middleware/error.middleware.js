// src/middleware/error.middleware.js
// Global Express error handler — MUST have 4 parameters (err, req, res, next).
//
// ERROR HANDLING STRATEGY:
// - Operational errors (AppError instances): safe to send message to client
// - Prisma errors: map to meaningful HTTP responses
// - Unknown errors: log and return generic 500 (never leak internals)
//
// This is registered LAST in server.js after all routes.

const AppError = require("../utils/AppError");

function errorHandler(err, req, res, next) {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";

  // ── Prisma Errors ──────────────────────────────────────────────────────────

  // Unique constraint violation (e.g., duplicate email)
  if (err.code === "P2002") {
    statusCode = 409;
    const field = err.meta?.target?.[0] || "field";
    message = `A record with this ${field} already exists.`;
  }

  // Record not found
  if (err.code === "P2025") {
    statusCode = 404;
    message = "Record not found.";
  }

  // Foreign key constraint failed
  if (err.code === "P2003") {
    statusCode = 400;
    message = "Related record does not exist.";
  }

  // ── Zod Validation Errors ──────────────────────────────────────────────────
  if (err.name === "ZodError") {
    statusCode = 422;
    message = "Validation failed";
    return res.status(statusCode).json({
      status: "error",
      message,
      errors: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // ── Non-operational (programming) errors ──────────────────────────────────
  if (!err.isOperational && statusCode === 500) {
    console.error("UNEXPECTED ERROR:", err);
    message = "An unexpected error occurred. Please try again later.";
  }

  // ── Log all errors in development ─────────────────────────────────────────
  if (process.env.NODE_ENV === "development") {
    console.error(`[${statusCode}] ${message}`, err.stack);
  }

  res.status(statusCode).json({
    status: "error",
    message,
  });
}

module.exports = { errorHandler };
