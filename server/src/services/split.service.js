// src/services/split.service.js
// Split calculation engine.
//
// This is the most critical business logic in the app.
// Each function takes the total amount and the splits input array,
// and returns an array of { userId, amount, percentage?, shares? }
// with EXACT Decimal values summing to totalAmount.
//
// WHY PURE FUNCTIONS: No DB calls, no side effects.
// Easily unit testable. Just math in, math out.
//
// FLOATING POINT ISSUE: We use regular JS numbers here but round
// to 2 decimal places. Prisma stores as Decimal(10,2).
// For a production app with high financial stakes, use decimal.js.
// For this MVP, toFixed(2) + rounding the remainder to last person is sufficient.

const AppError = require("../utils/AppError");

/**
 * Round a number to 2 decimal places.
 */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * EQUAL SPLIT
 * Divides totalAmount equally. Remainder (due to rounding) goes to last person.
 *
 * @param {number} totalAmount
 * @param {Array<{ userId: string }>} splits - just needs userId
 * @returns {Array<{ userId, amount }>}
 */
function calculateEqualSplit(totalAmount, splits) {
  if (!splits || splits.length === 0) {
    throw new AppError("At least one participant is required.", 400);
  }

  const perPerson = round2(totalAmount / splits.length);
  let distributed = 0;

  return splits.map((s, index) => {
    // Last person gets the remainder to handle rounding
    const isLast = index === splits.length - 1;
    const amount = isLast ? round2(totalAmount - distributed) : perPerson;
    distributed += perPerson;
    return { userId: s.userId, amount };
  });
}

/**
 * UNEQUAL SPLIT
 * Each participant has an explicit amount. Validates sum equals total.
 *
 * @param {number} totalAmount
 * @param {Array<{ userId: string, amount: number }>} splits
 */
function calculateUnequalSplit(totalAmount, splits) {
  if (!splits || splits.length === 0) {
    throw new AppError("At least one participant is required.", 400);
  }

  for (const s of splits) {
    if (s.amount == null || s.amount < 0) {
      throw new AppError(
        `Invalid amount for user ${s.userId}. Must be >= 0.`,
        400
      );
    }
  }

  const sum = round2(splits.reduce((acc, s) => acc + Number(s.amount), 0));
  if (Math.abs(sum - totalAmount) > 0.01) {
    throw new AppError(
      `Split amounts sum to ${sum} but expense total is ${totalAmount}. They must match.`,
      400
    );
  }

  return splits.map((s) => ({ userId: s.userId, amount: round2(Number(s.amount)) }));
}

/**
 * PERCENTAGE SPLIT
 * Each participant's share defined by a percentage. Must sum to 100.
 *
 * @param {number} totalAmount
 * @param {Array<{ userId: string, percentage: number }>} splits
 */
function calculatePercentageSplit(totalAmount, splits) {
  if (!splits || splits.length === 0) {
    throw new AppError("At least one participant is required.", 400);
  }

  for (const s of splits) {
    if (s.percentage == null || s.percentage <= 0 || s.percentage > 100) {
      throw new AppError(
        `Invalid percentage for user ${s.userId}. Must be between 0.01 and 100.`,
        400
      );
    }
  }

  const totalPercentage = round2(
    splits.reduce((acc, s) => acc + Number(s.percentage), 0)
  );
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new AppError(
      `Percentages sum to ${totalPercentage}%. They must sum to exactly 100%.`,
      400
    );
  }

  let distributed = 0;
  return splits.map((s, index) => {
    const isLast = index === splits.length - 1;
    const amount = isLast
      ? round2(totalAmount - distributed)
      : round2((Number(s.percentage) / 100) * totalAmount);
    distributed += round2((Number(s.percentage) / 100) * totalAmount);
    return {
      userId: s.userId,
      amount,
      percentage: round2(Number(s.percentage)),
    };
  });
}

/**
 * SHARES SPLIT
 * Each participant assigned a number of shares (positive integers).
 * Amount proportional to share count.
 *
 * @param {number} totalAmount
 * @param {Array<{ userId: string, shares: number }>} splits
 */
function calculateSharesSplit(totalAmount, splits) {
  if (!splits || splits.length === 0) {
    throw new AppError("At least one participant is required.", 400);
  }

  for (const s of splits) {
    if (!s.shares || s.shares <= 0 || !Number.isInteger(Number(s.shares))) {
      throw new AppError(
        `Invalid shares for user ${s.userId}. Must be a positive integer.`,
        400
      );
    }
  }

  const totalShares = splits.reduce((acc, s) => acc + Number(s.shares), 0);

  let distributed = 0;
  return splits.map((s, index) => {
    const isLast = index === splits.length - 1;
    const amount = isLast
      ? round2(totalAmount - distributed)
      : round2((Number(s.shares) / totalShares) * totalAmount);
    distributed += round2((Number(s.shares) / totalShares) * totalAmount);
    return {
      userId: s.userId,
      amount,
      shares: Number(s.shares),
    };
  });
}

/**
 * MAIN ENTRY POINT
 * Dispatch to the correct calculator based on splitType.
 *
 * @param {string} splitType - "EQUAL" | "UNEQUAL" | "PERCENTAGE" | "SHARES"
 * @param {number} totalAmount
 * @param {Array} splits
 */
function calculateSplits(splitType, totalAmount, splits) {
  switch (splitType) {
    case "EQUAL":
      return calculateEqualSplit(totalAmount, splits);
    case "UNEQUAL":
      return calculateUnequalSplit(totalAmount, splits);
    case "PERCENTAGE":
      return calculatePercentageSplit(totalAmount, splits);
    case "SHARES":
      return calculateSharesSplit(totalAmount, splits);
    default:
      throw new AppError(`Unknown split type: ${splitType}`, 400);
  }
}

module.exports = { calculateSplits };
