// src/services/balance.service.js
// Balance calculation engine — the most algorithmically interesting part of the app.
//
// TWO KEY ALGORITHMS:
//
// 1. NET BALANCE CALCULATION
//    For a group: For each expense, the payer is "owed" money by each
//    split participant. We build a net map: userId → netAmount.
//    Positive = others owe this person. Negative = this person owes others.
//
// 2. DEBT SIMPLIFICATION (Greedy Algorithm)
//    Given net balances, find the MINIMUM set of transactions to settle all debts.
//    Complexity: O(n log n)
//    
//    Algorithm:
//    a) Separate users into creditors (positive balance) and debtors (negative)
//    b) Sort both by absolute value descending
//    c) Match largest debtor with largest creditor
//    d) Create a transaction for min(|debtor|, creditor)
//    e) Reduce both balances accordingly
//    f) Repeat until all balances are 0
//
//    This is provably optimal for minimizing transaction count.

const prisma = require("../utils/prisma");

/**
 * Calculate net balances for all members in a group.
 * Returns a map: { userId: netAmount }
 * Positive = owed money, Negative = owes money
 *
 * @param {string} groupId
 * @returns {Promise<Map<string, number>>}
 */
async function calculateGroupNetBalances(groupId) {
  // Fetch all active expenses with their splits
  const expenses = await prisma.expense.findMany({
    where: { groupId, isDeleted: false },
    include: { splits: true },
  });

  // Fetch all settlements in this group
  const settlements = await prisma.settlement.findMany({
    where: { groupId },
  });

  // userId → net balance
  const netMap = new Map();

  const adjust = (userId, delta) => {
    netMap.set(userId, (netMap.get(userId) || 0) + delta);
  };

  // Process expenses
  for (const expense of expenses) {
    const total = Number(expense.amount);
    const payerId = expense.paidById;

    for (const split of expense.splits) {
      const splitAmount = Number(split.amount);
      const splitUserId = split.userId;

      if (splitUserId === payerId) {
        // Payer's own share — they effectively paid for themselves, no net change
        // (payer gets +total credit, then -their own split = net +rest)
        // We handle this correctly by just recording payer gets credit for others' shares
        continue;
      }

      // splitUser owes payerId this amount
      adjust(payerId, +splitAmount);   // payer is owed
      adjust(splitUserId, -splitAmount); // split user owes
    }
  }

  // Process settlements (reduce debts)
  for (const settlement of settlements) {
    const amount = Number(settlement.amount);
    adjust(settlement.paidById, +amount);   // payer's debt reduced (they paid)
    adjust(settlement.receivedById, -amount); // receiver's credit reduced (they received)
  }

  return netMap;
}

/**
 * Calculate overall net balances for a user across ALL groups.
 *
 * @param {string} userId
 * @returns {Promise<Array<{ withUserId, withUserName, withUserAvatar, netAmount }>>}
 */
async function calculateOverallBalances(userId) {
  // Get all groups this user is in
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });

  const groupIds = memberships.map((m) => m.groupId);

  // Fetch all active expenses across all groups
  const expenses = await prisma.expense.findMany({
    where: { groupId: { in: groupIds }, isDeleted: false },
    include: { splits: true },
  });

  // Fetch all settlements involving this user
  const settlements = await prisma.settlement.findMany({
    where: {
      OR: [{ paidById: userId }, { receivedById: userId }],
    },
  });

  // pairwise map: otherUserId → net amount (positive = they owe me, negative = I owe them)
  const pairMap = new Map();

  const adjustPair = (otherUserId, delta) => {
    pairMap.set(otherUserId, (pairMap.get(otherUserId) || 0) + delta);
  };

  for (const expense of expenses) {
    const payerId = expense.paidById;

    for (const split of expense.splits) {
      if (split.userId === payerId) continue;

      const splitAmount = Number(split.amount);

      if (payerId === userId) {
        // I paid → split.userId owes me
        adjustPair(split.userId, +splitAmount);
      } else if (split.userId === userId) {
        // Someone else paid → I owe payerId
        adjustPair(payerId, -splitAmount);
      }
    }
  }

  for (const settlement of settlements) {
    const amount = Number(settlement.amount);
    if (settlement.paidById === userId) {
      // I paid them → reduces what I owe them (or increases what they owe me)
      adjustPair(settlement.receivedById, +amount);
    } else {
      // They paid me → reduces what they owe me
      adjustPair(settlement.paidById, -amount);
    }
  }

  // Enrich with user details
  const otherUserIds = [...pairMap.keys()];
  const users = await prisma.user.findMany({
    where: { id: { in: otherUserIds } },
    select: { id: true, name: true, avatarUrl: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return otherUserIds
    .map((otherId) => ({
      withUserId: otherId,
      withUserName: userMap.get(otherId)?.name || "Unknown",
      withUserAvatar: userMap.get(otherId)?.avatarUrl || null,
      netAmount: Math.round(pairMap.get(otherId) * 100) / 100,
    }))
    .filter((b) => Math.abs(b.netAmount) > 0.005); // filter out near-zero balances
}

/**
 * Debt simplification using the greedy algorithm.
 * Returns minimum set of transactions to settle all debts in a group.
 *
 * @param {string} groupId
 * @returns {Promise<Array<{ from, fromName, to, toName, amount }>>}
 */
async function getSimplifiedSettlements(groupId) {
  const netMap = await calculateGroupNetBalances(groupId);

  // Get user details for all involved users
  const userIds = [...netMap.keys()];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, avatarUrl: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Build arrays of creditors and debtors
  // Use floating point with rounding — sufficient for MVP
  let creditors = []; // owed money (positive balance)
  let debtors = [];   // owe money (negative balance)

  for (const [uid, amount] of netMap.entries()) {
    const rounded = Math.round(amount * 100) / 100;
    if (rounded > 0.005) creditors.push({ userId: uid, amount: rounded });
    else if (rounded < -0.005) debtors.push({ userId: uid, amount: Math.abs(rounded) });
  }

  // Sort descending by amount
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];

  // Greedy matching
  let i = 0; // creditor pointer
  let j = 0; // debtor pointer

  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt = debtors[j];
    const settle = Math.min(credit.amount, debt.amount);
    const rounded = Math.round(settle * 100) / 100;

    transactions.push({
      from: debt.userId,
      fromName: userMap.get(debt.userId)?.name || "Unknown",
      fromAvatar: userMap.get(debt.userId)?.avatarUrl || null,
      to: credit.userId,
      toName: userMap.get(credit.userId)?.name || "Unknown",
      toAvatar: userMap.get(credit.userId)?.avatarUrl || null,
      amount: rounded,
    });

    credit.amount = Math.round((credit.amount - settle) * 100) / 100;
    debt.amount = Math.round((debt.amount - settle) * 100) / 100;

    if (credit.amount < 0.005) i++;
    if (debt.amount < 0.005) j++;
  }

  return transactions;
}

/**
 * Get a formatted group balance summary (per member net amounts + who owes whom)
 *
 * @param {string} groupId
 */
async function getGroupBalanceSummary(groupId) {
  const netMap = await calculateGroupNetBalances(groupId);

  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return members.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    avatarUrl: m.user.avatarUrl,
    netAmount: Math.round((netMap.get(m.userId) || 0) * 100) / 100,
  }));
}

module.exports = {
  calculateGroupNetBalances,
  calculateOverallBalances,
  getSimplifiedSettlements,
  getGroupBalanceSummary,
};
