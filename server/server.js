require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const { errorHandler } = require("./src/middleware/error.middleware");
const { initSocketHandlers } = require("./src/socket/chat.socket");
const { authenticate } = require("./src/middleware/auth.middleware");
const { getGroupBalances, getSimplified } = require("./src/controllers/balance.controller");
const { getGroupSettlements } = require("./src/controllers/settlement.controller");

// ── Route imports ─────────────────────────────────────────────────────────────
const authRoutes       = require("./src/routes/auth.routes");
const groupRoutes      = require("./src/routes/group.routes");
const expenseRoutes    = require("./src/routes/expense.routes");
const balanceRoutes    = require("./src/routes/balance.routes");
const settlementRoutes = require("./src/routes/settlement.routes");
const commentRoutes    = require("./src/routes/comment.routes");

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
const API = "/api/v1";

// Auth
app.use(`${API}/auth`, authRoutes);

// Overall balances (must come BEFORE /groups to avoid conflict)
app.use(`${API}/balances`, balanceRoutes);

// Settlements (top-level)
app.use(`${API}/settlements`, settlementRoutes);

// Comments
app.use(`${API}/expenses/:expenseId/comments`, commentRoutes);

// Groups
app.use(`${API}/groups`, groupRoutes);

// Group sub-resources — expenses nested under groups
app.use(`${API}/groups/:groupId/expenses`, expenseRoutes);

// Group balances
app.get(`${API}/groups/:groupId/balances/simplified`, authenticate, getSimplified);
app.get(`${API}/groups/:groupId/balances`, authenticate, getGroupBalances);

// Group settlements
app.get(`${API}/groups/:groupId/settlements`, authenticate, getGroupSettlements);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: "error", message: `Route ${req.originalUrl} not found` });
});

// ── Error handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler);

// ── HTTP + Socket.IO ──────────────────────────────────────────────────────────
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"], credentials: true },
});

app.set("io", io);
initSocketHandlers(io);

// ── Listen ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO attached`);
  console.log(`🌍 CORS origin: ${CLIENT_URL}`);
  console.log(`💊 Health: http://localhost:${PORT}/health\n`);
});

module.exports = { app, httpServer };
