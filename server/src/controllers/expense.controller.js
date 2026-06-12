// src/controllers/expense.controller.js
// Expense controller.
//
// KEY DESIGN: Expense creation uses a DB transaction to ensure:
//   1. Expense record is created
//   2. All split records are created
//   3. If any step fails, everything rolls back → no orphaned data
//
// SOFT DELETE: Deletion sets isDeleted=true. Queries always filter isDeleted=false.
// This preserves audit history and allows "undo" in future.

const prisma = require("../utils/prisma");
const AppError = require("../utils/AppError");
const { calculateSplits } = require("../services/split.service");

const EXPENSE_INCLUDE = {
  paidBy: { select: { id: true, name: true, avatarUrl: true } },
  splits: {
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
  comments: {
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  },
};

// ── Helper: assert caller is a member of the group ────────────────────────

async function assertGroupMember(groupId, userId) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) throw new AppError("You are not a member of this group.", 403);
  return membership;
}

// ── POST /groups/:groupId/expenses ────────────────────────────────────────

async function createExpense(req, res, next) {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const { title, amount, currency, paidById, splitType, date, notes, splits } =
      req.body;

    // Verify caller is a group member
    await assertGroupMember(groupId, userId);

    // Verify paidBy user is a group member
    const payerMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: paidById } },
    });
    if (!payerMembership) {
      return next(new AppError("The payer must be a member of the group.", 400));
    }

    // Verify all split participants are group members
    const memberIds = (
      await prisma.groupMember.findMany({
        where: { groupId },
        select: { userId: true },
      })
    ).map((m) => m.userId);

    for (const split of splits) {
      if (!memberIds.includes(split.userId)) {
        return next(
          new AppError(
            `User ${split.userId} is not a member of this group.`,
            400
          )
        );
      }
    }

    // Calculate split amounts using the split service
    const calculatedSplits = calculateSplits(splitType, Number(amount), splits);

    // Persist in a transaction
    const expense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          groupId,
          title,
          amount,
          currency: currency || "INR",
          paidById,
          splitType,
          date: date ? new Date(date) : new Date(),
          notes,
        },
      });

      await tx.expenseSplit.createMany({
        data: calculatedSplits.map((s) => ({
          expenseId: newExpense.id,
          userId: s.userId,
          amount: s.amount,
          percentage: s.percentage ?? null,
          shares: s.shares ?? null,
        })),
      });

      return newExpense;
    });

    const fullExpense = await prisma.expense.findUnique({
      where: { id: expense.id },
      include: EXPENSE_INCLUDE,
    });

    res.status(201).json({ status: "success", data: { expense: fullExpense } });
  } catch (err) {
    next(err);
  }
}

// ── GET /groups/:groupId/expenses ─────────────────────────────────────────

async function getExpenses(req, res, next) {
  try {
    const { groupId } = req.params;
    await assertGroupMember(groupId, req.user.id);

    const expenses = await prisma.expense.findMany({
      where: { groupId, isDeleted: false },
      orderBy: { date: "desc" },
      include: {
        paidBy: { select: { id: true, name: true, avatarUrl: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        _count: { select: { comments: true } },
      },
    });

    res.status(200).json({ status: "success", data: { expenses } });
  } catch (err) {
    next(err);
  }
}

// ── GET /groups/:groupId/expenses/:id ─────────────────────────────────────

async function getExpenseById(req, res, next) {
  try {
    const { groupId, id } = req.params;
    await assertGroupMember(groupId, req.user.id);

    const expense = await prisma.expense.findFirst({
      where: { id, groupId, isDeleted: false },
      include: EXPENSE_INCLUDE,
    });

    if (!expense) return next(new AppError("Expense not found.", 404));

    res.status(200).json({ status: "success", data: { expense } });
  } catch (err) {
    next(err);
  }
}

// ── PUT /groups/:groupId/expenses/:id ─────────────────────────────────────

async function updateExpense(req, res, next) {
  try {
    const { groupId, id } = req.params;
    const userId = req.user.id;

    await assertGroupMember(groupId, userId);

    const existing = await prisma.expense.findFirst({
      where: { id, groupId, isDeleted: false },
    });
    if (!existing) return next(new AppError("Expense not found.", 404));

    const { title, amount, currency, paidById, splitType, date, notes, splits } =
      req.body;

    // Re-calculate splits if amount or splitType or splits changed
    const newAmount = amount != null ? Number(amount) : Number(existing.amount);
    const newSplitType = splitType || existing.splitType;

    let calculatedSplits = null;
    if (splits) {
      calculatedSplits = calculateSplits(newSplitType, newAmount, splits);
    }

    const expense = await prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(amount != null && { amount }),
          ...(currency && { currency }),
          ...(paidById && { paidById }),
          ...(splitType && { splitType }),
          ...(date && { date: new Date(date) }),
          ...(notes !== undefined && { notes }),
        },
      });

      if (calculatedSplits) {
        // Delete old splits and recreate
        await tx.expenseSplit.deleteMany({ where: { expenseId: id } });
        await tx.expenseSplit.createMany({
          data: calculatedSplits.map((s) => ({
            expenseId: id,
            userId: s.userId,
            amount: s.amount,
            percentage: s.percentage ?? null,
            shares: s.shares ?? null,
          })),
        });
      }

      return updated;
    });

    const fullExpense = await prisma.expense.findUnique({
      where: { id: expense.id },
      include: EXPENSE_INCLUDE,
    });

    res.status(200).json({ status: "success", data: { expense: fullExpense } });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /groups/:groupId/expenses/:id (soft delete) ────────────────────

async function deleteExpense(req, res, next) {
  try {
    const { groupId, id } = req.params;
    const userId = req.user.id;

    await assertGroupMember(groupId, userId);

    const existing = await prisma.expense.findFirst({
      where: { id, groupId, isDeleted: false },
    });
    if (!existing) return next(new AppError("Expense not found.", 404));

    // Only paidBy user or group admin can delete
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    const canDelete =
      existing.paidById === userId || membership?.role === "ADMIN";

    if (!canDelete) {
      return next(
        new AppError("Only the payer or a group admin can delete this expense.", 403)
      );
    }

    await prisma.expense.update({
      where: { id },
      data: { isDeleted: true },
    });

    res.status(200).json({ status: "success", data: null });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};
