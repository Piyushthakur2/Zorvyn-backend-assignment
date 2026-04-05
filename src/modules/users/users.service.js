const prisma = require('../../config/prisma');
const { ApiError } = require('../../utils/api.utils');

const USER_SELECT = {
  id: true, name: true, email: true,
  role: true, isActive: true, createdAt: true, updatedAt: true,
};

// ─── List users with pagination ───────────────────────────────────────────────
const getUsers = async ({ page = 1, limit = 10, role, isActive, search }) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(role     !== undefined && { role }),
    ...(isActive !== undefined && { isActive: isActive === 'true' }),
    ...(search && {
      OR: [
        { name:  { contains: search } },
        { email: { contains: search } },
      ],
    }),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: USER_SELECT, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      total,
      page:       Number(page),
      limit:      Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── Get single user ──────────────────────────────────────────────────────────
const getUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

// ─── Update user (admin only) ─────────────────────────────────────────────────
const updateUser = async (id, data, requesterId) => {
  await getUserById(id); // ensure exists

  // Prevent admin from demoting themselves
  if (id === requesterId && data.role && data.role !== 'ADMIN') {
    throw ApiError.badRequest('Admins cannot change their own role');
  }

  return prisma.user.update({
    where:  { id },
    data,
    select: USER_SELECT,
  });
};

// ─── Deactivate user ──────────────────────────────────────────────────────────
const deactivateUser = async (id, requesterId) => {
  if (id === requesterId) throw ApiError.badRequest('Cannot deactivate your own account');
  await getUserById(id);
  return prisma.user.update({ where: { id }, data: { isActive: false }, select: USER_SELECT });
};

// ─── Get user activity (last N records created) ───────────────────────────────
const getUserActivity = async (userId) => {
  await getUserById(userId);
  return prisma.financialRecord.findMany({
    where:   { userId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take:    10,
    select:  { id: true, amount: true, type: true, category: true, date: true, createdAt: true },
  });
};

module.exports = { getUsers, getUserById, updateUser, deactivateUser, getUserActivity };
