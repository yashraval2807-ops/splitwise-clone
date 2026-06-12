// src/routes/auth.routes.js
// Auth routes — public (no JWT required) except /me.

const { Router } = require("express");
const { register, login, getMe } = require("../controllers/auth.controller");
const { validate } = require("../middleware/validate.middleware");
const { authenticate } = require("../middleware/auth.middleware");
const { registerSchema, loginSchema } = require("../validators/auth.validator");

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", authenticate, getMe);

module.exports = router;
