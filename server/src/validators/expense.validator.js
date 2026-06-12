// src/validators/expense.validator.js

const { z } = require("zod");

const splitItemBase = z.object({
  userId: z.string({ required_error: "userId is required in each split" }),
});

const createExpenseSchema = z
  .object({
    title: z
      .string({ required_error: "Title is required" })
      .min(1, "Title cannot be empty")
      .max(255)
      .trim(),
    amount: z
      .number({ required_error: "Amount is required" })
      .positive("Amount must be positive")
      .max(9999999.99, "Amount too large"),
    currency: z.string().max(3).default("INR"),
    paidById: z.string({ required_error: "paidById is required" }),
    splitType: z.enum(["EQUAL", "UNEQUAL", "PERCENTAGE", "SHARES"]),
    date: z.string().optional(), // ISO date string
    notes: z.string().max(1000).optional(),
    splits: z
      .array(
        splitItemBase.extend({
          amount: z.number().positive().optional(),
          percentage: z.number().positive().max(100).optional(),
          shares: z.number().int().positive().optional(),
        })
      )
      .min(1, "At least one split participant is required"),
  })
  .strip();

const updateExpenseSchema = createExpenseSchema.partial().omit({ splitType: true }).extend({
  splitType: z.enum(["EQUAL", "UNEQUAL", "PERCENTAGE", "SHARES"]).optional(),
});

module.exports = { createExpenseSchema, updateExpenseSchema };
