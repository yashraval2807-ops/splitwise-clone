// server.js
// Express + Socket.IO entry point.
//
// STARTUP ORDER:
// 1. Load env vars
// 2. Create Express app
// 3. Register middleware (cors, json parser)
// 4. Mount routes
// 5. Register error handler (MUST be last)
// 6. Create HTTP server from Express
// 7. Attach Socket.IO to HTTP server
// 8. Listen

require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const { errorHandler } = require("./src/middleware/error.middleware");
const { initSocketHandlers } = require("./src/socket/chat.socket");
const { getGroupBalances, getSimplified } = require("./src/controllers/balance.controller");
const { getGroupSettlements } = require("./src/controllers/settlement.controller");
const { authenticate } = require("./src/middleware/auth.middleware");

// ── Routes ──────────────────────────────────────────────────────────────────
const authRoutes = require("./src/routes/auth.routes");
const groupRoutes = require("./src/routes/group.routes");
const expenseRoutes = require("./src/routes/expense.routes");
const balanceRoutes = require("./src/routes/balance.routes");
const settlementRoutes = require("./src/routes/settlement.routes");
const commentRoutes = require("./src/routes/comment.routes");

// ── App Setup ────────────────────────────────────────────────────────────────
const app = express();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
const API = "/api/v1/auth/register";

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/groups`, groupRoutes);
app.use(`${API}/groups/:groupId/expenses`, expenseRoutes);
app.use(`${API}/groups/:groupId/balances`, authenticate, (req, res, next) => {
  // Inline routing for group balance sub-routes
  if (req.path === "/simplified") {
    req.params.groupId = req.params.groupId;
    return getSimplified(req, res, next);
  }
  return getGroupBalances(req, res, next);
});
app.use(`${API}/groups/:groupId/settlements`, authenticate, (req, res, next) => {
  return getGroupSettlements(req, res, next);
});
app.use(`${API}/balances`, balanceRoutes);
app.use(`${API}/settlements`, settlementRoutes);
app.use(`${API}/expenses/:expenseId/comments`, commentRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: "error", message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler (MUST be last) ──────────────────────────────────────
app.use(errorHandler);

// ── HTTP + Socket.IO Server ───────────────────────────────────────────────────
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io accessible to controllers via app.get('io')
app.set("io", io);

// Initialize socket event handlers
initSocketHandlers(io);

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO attached`);
  console.log(`🌍 Allowing CORS from: ${CLIENT_URL}`);
  console.log(`💊 Health check: http://localhost:${PORT}/health\n`);
});

module.exports = { app, httpServer };
