const prisma = require('../config/prisma');
const logger = require('../utils/logger');

// Records every mutating request (POST, PATCH, PUT, DELETE) to the audit log
const audit = (entity) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async (body) => {
    // Only log successful mutations
    if (body?.success && req.user) {
      try {
        await prisma.auditLog.create({
          data: {
            action:    req.method,
            entity,
            entityId:  req.params.id || body?.data?.id || 'N/A',
            changes:   ['POST', 'PATCH', 'PUT'].includes(req.method)
              ? JSON.stringify(sanitize(req.body))
              : null,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            userId:    req.user.id,
          },
        });
      } catch (err) {
        logger.error('Failed to write audit log', { err: err.message });
      }
    }
    return originalJson(body);
  };

  next();
};

// Strip sensitive fields before logging
const sanitize = (obj) => {
  const { password, currentPassword, newPassword, token, ...safe } = obj;
  return safe;
};

module.exports = { audit };
