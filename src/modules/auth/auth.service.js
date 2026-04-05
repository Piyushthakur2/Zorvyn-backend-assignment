const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const prisma  = require('../../config/prisma');
const { ApiError } = require('../../utils/api.utils');

// ─── Token helpers ────────────────────────────────────────────────────────────

const signAccessToken = (userId, role) =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });

const signRefreshToken = () => crypto.randomBytes(64).toString('hex');

const saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
};

const issueTokens = async (user) => {
  const accessToken  = signAccessToken(user.id, user.role);
  const refreshToken = await saveRefreshToken(user.id, signRefreshToken());
  return { accessToken, refreshToken };
};

// ─── Service methods ──────────────────────────────────────────────────────────

const register = async ({ name, email, password, role }) => {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw ApiError.conflict('Email already registered');

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role || 'VIEWER' },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const tokens = await issueTokens(user);
  return { user, ...tokens };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Constant-time comparison to prevent timing attacks
  const passwordMatch = user
    ? await bcrypt.compare(password, user.password)
    : await bcrypt.compare(password, '$2a$12$dummyhashfortimingnormalisation');

  if (!user || !passwordMatch) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('Account is deactivated');

  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  const tokens   = await issueTokens(safeUser);
  return { user: safeUser, ...tokens };
};

const refreshTokens = async (token) => {
  if (!token) throw ApiError.unauthorized('Refresh token required');

  const stored = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } },
  });

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { token } });
    throw ApiError.unauthorized('Refresh token expired or invalid');
  }

  if (!stored.user.isActive) throw ApiError.forbidden('Account is deactivated');

  // Rotate refresh token (invalidate old, issue new)
  await prisma.refreshToken.delete({ where: { token } });
  const tokens = await issueTokens(stored.user);
  return { user: stored.user, ...tokens };
};

const logout = async (token) => {
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => null);
  }
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  // Invalidate all refresh tokens on password change
  await prisma.refreshToken.deleteMany({ where: { userId } });
};

module.exports = { register, login, refreshTokens, logout, changePassword };
