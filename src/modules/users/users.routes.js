const router = require('express').Router();
const ctrl   = require('./users.controller');
const { protect, isAdmin } = require('../../middlewares/auth.middleware');
const { validate, schemas } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');

// All user routes require authentication
router.use(protect);

/**
 * @route  GET  /api/users
 * @access Admin
 * @query  page, limit, role, isActive, search
 */
router.get('/', isAdmin, ctrl.getUsers);

/**
 * @route  GET  /api/users/:id
 * @access Admin OR self
 */
router.get('/:id', (req, res, next) => {
  // Allow users to fetch their own profile
  if (req.user.id === req.params.id || req.user.role === 'ADMIN') return next();
  const { ApiError } = require('../../utils/api.utils');
  throw ApiError.forbidden();
}, ctrl.getUser);

/**
 * @route  PATCH /api/users/:id
 * @access Admin
 */
router.patch('/:id', isAdmin, validate(schemas.updateUser), audit('USER'), ctrl.updateUser);

/**
 * @route  DELETE /api/users/:id
 * @access Admin (soft deactivate)
 */
router.delete('/:id', isAdmin, audit('USER'), ctrl.deactivateUser);

/**
 * @route  GET /api/users/:id/activity
 * @access Admin
 */
router.get('/:id/activity', isAdmin, ctrl.getUserActivity);

module.exports = router;
