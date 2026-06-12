// src/routes/comment.routes.js

const { Router } = require("express");
const { getComments, createComment, deleteComment } = require("../controllers/comment.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get("/", getComments);
router.post("/", createComment);
router.delete("/:commentId", deleteComment);

module.exports = router;
