// src/controllers/balance.controller.js

const {
  getGroupBalanceSummary,
  calculateOverallBalances,
  getSimplifiedSettlements,
} = require("../services/balance.service");
const AppError = require("../utils/AppError");
const prisma = require("../utils/prisma");

async function assertGroupMember(groupId, userId) {
  const m = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!m) throw new AppError("You are not a member of this group.", 403);
}

// GET /groups/:groupId/balances
async function getGroupBalances(req, res, next) {
  try {
    const { groupId } = req.params;
    await assertGroupMember(groupId, req.user.id);
    const balances = await getGroupBalanceSummary(groupId);
    res.status(200).json({ status: "success", data: { balances } });
  } catch (err) {
    next(err);
  }
}

// GET /balances — overall across all groups
async function getOverallBalances(req, res, next) {
  try {
    const balances = await calculateOverallBalances(req.user.id);
    res.status(200).json({ status: "success", data: { balances } });
  } catch (err) {
    next(err);
  }
}

// GET /groups/:groupId/balances/simplified
async function getSimplified(req, res, next) {
  try {
    const { groupId } = req.params;
    await assertGroupMember(groupId, req.user.id);
    const transactions = await getSimplifiedSettlements(groupId);
    res.status(200).json({ status: "success", data: { transactions } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getGroupBalances, getOverallBalances, getSimplified };
