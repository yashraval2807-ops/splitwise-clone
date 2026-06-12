// src/routes/balance.routes.js

const { Router } = require("express");
const { getOverallBalances } = require("../controllers/balance.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

// GET /balances — overall across all groups
router.get("/", getOverallBalances);

module.exports = router;
