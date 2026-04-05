const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { ApiError, catchAsync } = require('../utils/api.utils');

// ─── Protect: verify JWT and attach user to request ──────────────────────────
const protect = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('No token provided');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw ApiError.unauthorized('Token expired');
    throw ApiError.unauthorized('Invalid token');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (!user.isActive) throw ApiError.forbidden('Account is deactivated');

  req.user = user;
  next();
});

// ─── RequireRole: role-based access control ───────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized();
  if (!roles.includes(req.user.role)) {
    throw ApiError.forbidden(
      `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`
    );
  }
  next();
};

// ─── Role shortcuts for cleaner route definitions ────────────────────────────
const isAdmin   = requireRole('ADMIN');
const isAnalyst = requireRole('ADMIN', 'ANALYST');
const isViewer  = requireRole('ADMIN', 'ANALYST', 'VIEWER');

module.exports = { protect, requireRole, isAdmin, isAnalyst, isViewer };
