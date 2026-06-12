// src/validators/group.validator.js

const { z } = require("zod");

const createGroupSchema = z.object({
  name: z
    .string({ required_error: "Group name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .trim(),
  description: z.string().max(500).trim().optional(),
  type: z.enum(["HOME", "TRIP", "COUPLE", "OTHER"]).default("OTHER"),
});

const updateGroupSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  type: z.enum(["HOME", "TRIP", "COUPLE", "OTHER"]).optional(),
});

const addMemberSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Must be a valid email")
    .toLowerCase()
    .trim(),
});

module.exports = { createGroupSchema, updateGroupSchema, addMemberSchema };
