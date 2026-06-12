// src/middleware/auth.middleware.js
// JWT authentication middleware.
//
// HOW IT WORKS:
// 1. Reads Authorization header: "Bearer <token>"
// 2. Verifies the JWT signature and expiry
// 3. Looks up the user in DB to ensure they still exist (not deleted)
// 4. Attaches `req.user` for downstream controllers to use
//
// WHY DB LOOKUP: If a user is deleted after token issuance, the token would
// still be valid without the DB check. This prevents ghost sessions.

const { verifyToken } = require("../utils/jwt");
const AppError = require("../utils/AppError");
const prisma = require("../utils/prisma");

async function authenticate(req, res, next) {
  try {
    // 1. Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("Authentication required. Please log in.", 401));
    }

    const token = authHeader.split(" ")[1];

    // 2. Verify JWT
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(new AppError("Your session has expired. Please log in again.", 401));
      }
      return next(new AppError("Invalid token. Please log in again.", 401));
    }

    // 3. Check user still exists in DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    if (!user) {
      return next(new AppError("User no longer exists.", 401));
    }

    // 4. Attach to request
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate };
