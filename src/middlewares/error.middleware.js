const logger = require('../utils/logger');

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must have 4 parameters for Express to treat it as an error handler
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message, errors = [] } = err;

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    statusCode = 409;
    const field = err.meta?.target?.join(', ') || 'field';
    message = `A record with this ${field} already exists`;
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
  }

  // Prisma foreign key constraint
  if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Related record does not exist';
  }

  // JWT errors (unhandled)
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Log server errors (not client errors)
  if (statusCode >= 500) {
    logger.error('Unhandled error', {
      message: err.message,
      stack:   err.stack,
      url:     req.originalUrl,
      method:  req.method,
      ip:      req.ip,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0  && { errors }),
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack }),
  });
};

// ─── 404 handler (must be registered AFTER all routes) ───────────────────────
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

module.exports = { errorHandler, notFound };
