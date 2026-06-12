// src/routes/group.routes.js

const { Router } = require("express");
const {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
} = require("../controllers/group.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema,
} = require("../validators/group.validator");

const router = Router();

// All group routes require authentication
router.use(authenticate);

router.post("/", validate(createGroupSchema), createGroup);
router.get("/", getGroups);
router.get("/:id", getGroupById);
router.put("/:id", validate(updateGroupSchema), updateGroup);
router.delete("/:id", deleteGroup);

// Member management
router.post("/:id/members", validate(addMemberSchema), addMember);
router.delete("/:id/members/:userId", removeMember);

module.exports = router;
