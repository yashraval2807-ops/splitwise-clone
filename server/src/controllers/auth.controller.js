// src/controllers/auth.controller.js
// Auth controller — handles register, login, and getMe.
//
// ARCHITECTURE NOTE: Controllers are intentionally thin. They:
//   1. Read validated input from req.body (already validated by Zod middleware)
//   2. Call Prisma directly (no separate service needed for simple CRUD auth)
//   3. Format and send the response
//
// Business logic lives in services. Auth is simple enough that
// the controller handles it, but the pattern is consistent.

const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");
const { signToken } = require("../utils/jwt");
const AppError = require("../utils/AppError");

// Columns we're safe to return to the client (never return passwordHash)
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  createdAt: true,
};

// ── POST /auth/register ────────────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Check email not already taken (Prisma will throw P2002 but we want
    // a friendlier message here)
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return next(new AppError("An account with this email already exists.", 409));
    }

    // Hash password — bcrypt cost factor 12 is a good balance of security/speed
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: USER_SELECT,
    });

    const token = signToken({ id: user.id, email: user.email });

    res.status(201).json({
      status: "success",
      data: { user, token },
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /auth/login ───────────────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Find user — must include passwordHash for comparison
    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...USER_SELECT, passwordHash: true },
    });

    // SECURITY: Use a generic message. Never confirm whether email exists.
    if (!user) {
      return next(new AppError("Invalid email or password.", 401));
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return next(new AppError("Invalid email or password.", 401));
    }

    const token = signToken({ id: user.id, email: user.email });

    // Strip passwordHash before sending
    const { passwordHash: _, ...safeUser } = user;

    res.status(200).json({
      status: "success",
      data: { user: safeUser, token },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /auth/me ───────────────────────────────────────────────────────────

async function getMe(req, res, next) {
  try {
    // req.user is already attached by auth middleware
    res.status(200).json({
      status: "success",
      data: { user: req.user },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getMe };
