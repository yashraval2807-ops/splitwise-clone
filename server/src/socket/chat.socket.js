// src/socket/chat.socket.js
// Socket.IO event handlers.
//
// AUTHENTICATION: On connection, client sends { auth: { token } }.
// We verify the JWT before allowing any events.
// If invalid, we disconnect immediately.
//
// ROOM STRATEGY:
// - expense:{expenseId} — for comment broadcasts
// - group:{groupId}     — for expense/settlement activity broadcasts
//
// WHY ROOMS: Prevents broadcasting to all connected clients.
// Only users who have the expense or group open receive events.

const { verifyToken } = require("../utils/jwt");
const prisma = require("../utils/prisma");

function initSocketHandlers(io) {
  // Middleware: authenticate socket connection via JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, avatarUrl: true },
      });

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user; // attach user to socket
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.user.name} (${socket.id})`);

    // ── Join expense room ──────────────────────────────────────────────────
    socket.on("join_expense", ({ expenseId }) => {
      if (!expenseId) return;
      socket.join(`expense:${expenseId}`);
      console.log(`[Socket] ${socket.user.name} joined expense:${expenseId}`);
    });

    socket.on("leave_expense", ({ expenseId }) => {
      if (!expenseId) return;
      socket.leave(`expense:${expenseId}`);
    });

    // ── Join group room ────────────────────────────────────────────────────
    socket.on("join_group", ({ groupId }) => {
      if (!groupId) return;
      socket.join(`group:${groupId}`);
      console.log(`[Socket] ${socket.user.name} joined group:${groupId}`);
    });

    socket.on("leave_group", ({ groupId }) => {
      if (!groupId) return;
      socket.leave(`group:${groupId}`);
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected: ${socket.user?.name} — ${reason}`);
    });

    // ── Error handling ─────────────────────────────────────────────────────
    socket.on("error", (err) => {
      console.error(`[Socket] Error for ${socket.user?.name}:`, err.message);
    });
  });
}

module.exports = { initSocketHandlers };
