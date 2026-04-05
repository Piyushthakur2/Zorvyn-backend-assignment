const { z } = require('zod');
const { ApiError } = require('../utils/api.utils');

// ─── Factory: validate req.body against a Zod schema ─────────────────────────
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw ApiError.badRequest('Validation failed', errors);
  }
  req.body = result.data; // replace with parsed (sanitized) data
  next();
};

// ─── Schemas ─────────────────────────────────────────────────────────────────

const schemas = {
  register: z.object({
    name:     z.string().min(2).max(100).trim(),
    email:    z.string().email().toLowerCase(),
    password: z.string().min(8).max(72)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain number'),
    role:     z.enum(['VIEWER', 'ANALYST', 'ADMIN']).optional(),
  }),

  login: z.object({
    email:    z.string().email().toLowerCase(),
    password: z.string().min(1),
  }),

  createRecord: z.object({
    amount:   z.number().positive('Amount must be positive'),
    type:     z.enum(['INCOME', 'EXPENSE']),
    category: z.string().min(1).max(100).trim(),
    date:     z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    notes:    z.string().max(500).trim().optional(),
    tags:     z.array(z.string().max(50)).max(10).optional(),
  }),

  updateRecord: z.object({
    amount:   z.number().positive().optional(),
    type:     z.enum(['INCOME', 'EXPENSE']).optional(),
    category: z.string().min(1).max(100).trim().optional(),
    date:     z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    notes:    z.string().max(500).trim().optional().nullable(),
    tags:     z.array(z.string().max(50)).max(10).optional(),
  }),

  updateUser: z.object({
    name:     z.string().min(2).max(100).trim().optional(),
    role:     z.enum(['VIEWER', 'ANALYST', 'ADMIN']).optional(),
    isActive: z.boolean().optional(),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1),
    newPassword:     z.string().min(8).max(72)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain number'),
  }),
};

module.exports = { validate, schemas };
