// src/routes/expense.routes.js
// Note: mounted at /groups/:groupId/expenses in server.js
// Express mergeParams: true allows access to :groupId from parent router.

const { Router } = require("express");
const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} = require("../controllers/expense.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { createExpenseSchema, updateExpenseSchema } = require("../validators/expense.validator");

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post("/", validate(createExpenseSchema), createExpense);
router.get("/", getExpenses);
router.get("/:id", getExpenseById);
router.put("/:id", validate(updateExpenseSchema), updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;
