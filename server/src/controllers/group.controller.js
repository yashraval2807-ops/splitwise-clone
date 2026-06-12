// src/controllers/group.controller.js
// Group controller — CRUD for groups and member management.
//
// AUTHORIZATION RULES:
// - Any authenticated user can create a group (becomes ADMIN automatically)
// - Only group members can view the group
// - Only ADMIN can update/delete the group or add/remove members
// - A group must always have at least 1 ADMIN (cannot remove last admin)

const prisma = require("../utils/prisma");
const AppError = require("../utils/AppError");

// Reusable member select shape
const MEMBER_SELECT = {
  id: true,
  role: true,
  joinedAt: true,
  user: { select: { id: true, name: true, email: true, avatarUrl: true } },
};

// ── Helper: verify calling user is a member of a group ───────────────────

async function assertMember(groupId, userId) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) throw new AppError("You are not a member of this group.", 403);
  return membership;
}

// ── Helper: verify calling user is an ADMIN of a group ───────────────────

async function assertAdmin(groupId, userId) {
  const membership = await assertMember(groupId, userId);
  if (membership.role !== "ADMIN") {
    throw new AppError("Only group admins can perform this action.", 403);
  }
  return membership;
}

// ── POST /groups ──────────────────────────────────────────────────────────

async function createGroup(req, res, next) {
  try {
    const { name, description, type } = req.body;
    const userId = req.user.id;

    // Create group + add creator as ADMIN in a transaction
    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.group.create({
        data: { name, description, type, createdById: userId },
      });
      await tx.groupMember.create({
        data: { groupId: newGroup.id, userId, role: "ADMIN" },
      });
      return newGroup;
    });

    const fullGroup = await prisma.group.findUnique({
      where: { id: group.id },
      include: { members: { select: MEMBER_SELECT } },
    });

    res.status(201).json({ status: "success", data: { group: fullGroup } });
  } catch (err) {
    next(err);
  }
}

// ── GET /groups ───────────────────────────────────────────────────────────

async function getGroups(req, res, next) {
  try {
    const userId = req.user.id;

    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: { select: MEMBER_SELECT },
            _count: { select: { expenses: { where: { isDeleted: false } } } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const groups = memberships.map((m) => m.group);

    res.status(200).json({ status: "success", data: { groups } });
  } catch (err) {
    next(err);
  }
}

// ── GET /groups/:id ───────────────────────────────────────────────────────

async function getGroupById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await assertMember(id, userId);

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: { select: MEMBER_SELECT },
        expenses: {
          where: { isDeleted: false },
          orderBy: { date: "desc" },
          include: {
            paidBy: { select: { id: true, name: true, avatarUrl: true } },
            splits: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!group) return next(new AppError("Group not found.", 404));

    res.status(200).json({ status: "success", data: { group } });
  } catch (err) {
    next(err);
  }
}

// ── PUT /groups/:id ───────────────────────────────────────────────────────

async function updateGroup(req, res, next) {
  try {
    const { id } = req.params;
    await assertAdmin(id, req.user.id);

    const group = await prisma.group.update({
      where: { id },
      data: req.body,
      include: { members: { select: MEMBER_SELECT } },
    });

    res.status(200).json({ status: "success", data: { group } });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /groups/:id ────────────────────────────────────────────────────

async function deleteGroup(req, res, next) {
  try {
    const { id } = req.params;
    await assertAdmin(id, req.user.id);

    await prisma.group.delete({ where: { id } });

    res.status(200).json({ status: "success", data: null });
  } catch (err) {
    next(err);
  }
}

// ── POST /groups/:id/members ──────────────────────────────────────────────

async function addMember(req, res, next) {
  try {
    const { id: groupId } = req.params;
    const { email } = req.body;

    await assertAdmin(groupId, req.user.id);

    // Find user by email
    const userToAdd = await prisma.user.findUnique({ where: { email } });
    if (!userToAdd) {
      return next(new AppError(`No user found with email: ${email}`, 404));
    }

    // Check not already a member
    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: userToAdd.id } },
    });
    if (existing) {
      return next(new AppError("This user is already a member of the group.", 409));
    }

    const member = await prisma.groupMember.create({
      data: { groupId, userId: userToAdd.id, role: "MEMBER" },
      select: MEMBER_SELECT,
    });

    res.status(201).json({ status: "success", data: { member } });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /groups/:id/members/:userId ────────────────────────────────────

async function removeMember(req, res, next) {
  try {
    const { id: groupId, userId: targetUserId } = req.params;
    const requesterId = req.user.id;

    await assertAdmin(groupId, requesterId);

    // Cannot remove yourself if you're the only admin
    if (targetUserId === requesterId) {
      const adminCount = await prisma.groupMember.count({
        where: { groupId, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return next(
          new AppError(
            "Cannot remove the last admin. Assign another admin first.",
            400
          )
        );
      }
    }

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });

    res.status(200).json({ status: "success", data: null });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
};
