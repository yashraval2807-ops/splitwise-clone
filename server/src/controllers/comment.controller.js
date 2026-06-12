// src/controllers/comment.controller.js

const prisma = require("../utils/prisma");
const AppError = require("../utils/AppError");

// GET /expenses/:expenseId/comments
async function getComments(req, res, next) {
  try {
    const { expenseId } = req.params;

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, isDeleted: false },
      select: { id: true, groupId: true },
    });
    if (!expense) return next(new AppError("Expense not found.", 404));

    // Verify caller is group member
    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: expense.groupId, userId: req.user.id },
      },
    });
    if (!member) return next(new AppError("Access denied.", 403));

    const comments = await prisma.comment.findMany({
      where: { expenseId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    res.status(200).json({ status: "success", data: { comments } });
  } catch (err) {
    next(err);
  }
}

// POST /expenses/:expenseId/comments
async function createComment(req, res, next) {
  try {
    const { expenseId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return next(new AppError("Comment content cannot be empty.", 400));
    }

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, isDeleted: false },
      select: { id: true, groupId: true },
    });
    if (!expense) return next(new AppError("Expense not found.", 404));

    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: expense.groupId, userId: req.user.id },
      },
    });
    if (!member) return next(new AppError("Access denied.", 403));

    const comment = await prisma.comment.create({
      data: { expenseId, userId: req.user.id, content: content.trim() },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Emit socket event — accessed via req.app.get('io')
    const io = req.app.get("io");
    if (io) {
      io.to(`expense:${expenseId}`).emit("new_comment", comment);
    }

    res.status(201).json({ status: "success", data: { comment } });
  } catch (err) {
    next(err);
  }
}

// DELETE /expenses/:expenseId/comments/:commentId
async function deleteComment(req, res, next) {
  try {
    const { expenseId, commentId } = req.params;
    const userId = req.user.id;

    const comment = await prisma.comment.findFirst({
      where: { id: commentId, expenseId },
    });
    if (!comment) return next(new AppError("Comment not found.", 404));
    if (comment.userId !== userId) {
      return next(new AppError("You can only delete your own comments.", 403));
    }

    await prisma.comment.delete({ where: { id: commentId } });
    res.status(200).json({ status: "success", data: null });
  } catch (err) {
    next(err);
  }
}

module.exports = { getComments, createComment, deleteComment };
