// src/routes/settlement.routes.js

const { Router } = require("express");
const {
  createSettlement,
  getSettlements,
} = require("../controllers/settlement.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

router.post("/", createSettlement);
router.get("/", getSettlements);

module.exports = router;
