// src/utils/prisma.js
// Prisma Client singleton.
//
// WHY SINGLETON: In development, Next.js (and nodemon) hot-reloads modules.
// Without this pattern, every reload creates a new PrismaClient instance,
// eventually exhausting DB connections. The global trick prevents that.
//
// In production, module cache handles it naturally — only one instance exists.

const { PrismaClient } = require("@prisma/client");

const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
