// src/controllers/settlement.controller.js

const prisma = require("../utils/prisma");
const AppError = require("../utils/AppError");
const { z } = require("zod");

const createSettlementSchema = z.object({
  groupId: z.string().optional(),
  receivedById: z.string({ required_error: "receivedById is required" }),
  amount: z
    .number({ required_error: "amount is required" })
    .positive("Amount must be positive"),
  notes: z.string().max(500).optional(),
  settledAt: z.string().optional(),
});

// POST /settlements
async function createSettlement(req, res, next) {
  try {
    const parsed = createSettlementSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(parsed.error);
    }
    const { groupId, receivedById, amount, notes, settledAt } = parsed.data;
    const paidById = req.user.id;

    if (paidById === receivedById) {
      return next(new AppError("Cannot settle with yourself.", 400));
    }

    // If groupId provided, verify both users are members
    if (groupId) {
      const [payerMember, receiverMember] = await Promise.all([
        prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId: paidById } },
        }),
        prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId: receivedById } },
        }),
      ]);
      if (!payerMember || !receiverMember) {
        return next(
          new AppError("Both users must be members of the specified group.", 400)
        );
      }
    }

    const settlement = await prisma.settlement.create({
      data: {
        groupId: groupId || null,
        paidById,
        receivedById,
        amount,
        notes,
        settledAt: settledAt ? new Date(settledAt) : new Date(),
      },
      include: {
        paidBy: { select: { id: true, name: true, avatarUrl: true } },
        receivedBy: { select: { id: true, name: true, avatarUrl: true } },
        group: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ status: "success", data: { settlement } });
  } catch (err) {
    next(err);
  }
}

// GET /settlements — user's settlements
async function getSettlements(req, res, next) {
  try {
    const userId = req.user.id;
    const settlements = await prisma.settlement.findMany({
      where: { OR: [{ paidById: userId }, { receivedById: userId }] },
      orderBy: { settledAt: "desc" },
      include: {
        paidBy: { select: { id: true, name: true, avatarUrl: true } },
        receivedBy: { select: { id: true, name: true, avatarUrl: true } },
        group: { select: { id: true, name: true } },
      },
    });
    res.status(200).json({ status: "success", data: { settlements } });
  } catch (err) {
    next(err);
  }
}

// GET /groups/:groupId/settlements
async function getGroupSettlements(req, res, next) {
  try {
    const { groupId } = req.params;
    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      orderBy: { settledAt: "desc" },
      include: {
        paidBy: { select: { id: true, name: true, avatarUrl: true } },
        receivedBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    res.status(200).json({ status: "success", data: { settlements } });
  } catch (err) {
    next(err);
  }
}

module.exports = { createSettlement, getSettlements, getGroupSettlements };
