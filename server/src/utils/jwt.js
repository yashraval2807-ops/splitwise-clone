// src/utils/jwt.js
// JWT sign and verify helpers.
//
// WHY SEPARATE UTILITY: Centralizes token logic. If we switch from HS256 to RS256
// or change expiry policy, only this file changes.

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

/**
 * Sign a JWT for a given user.
 * @param {{ id: string, email: string }} payload
 * @returns {string} signed JWT string
 */
function signToken(payload) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }
  return jwt.sign({ userId: payload.id, email: payload.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify a JWT and return decoded payload.
 * Throws JsonWebTokenError or TokenExpiredError if invalid.
 * @param {string} token
 * @returns {{ userId: string, email: string, iat: number, exp: number }}
 */
function verifyToken(token) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };
