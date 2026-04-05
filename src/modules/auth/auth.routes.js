const router = require('express').Router();
const ctrl   = require('./auth.controller');
const { protect }  = require('../../middlewares/auth.middleware');
const { validate, schemas } = require('../../middlewares/validate.middleware');

/**
 * @route  POST /api/auth/register
 * @access Public
 * @desc   Register a new user (role defaults to VIEWER; ADMIN can override)
 */
router.post('/register', validate(schemas.register), ctrl.register);

/**
 * @route  POST /api/auth/login
 * @access Public
 */
router.post('/login', validate(schemas.login), ctrl.login);

/**
 * @route  POST /api/auth/refresh
 * @access Public (requires valid refresh token in body or header)
 */
router.post('/refresh', ctrl.refresh);

/**
 * @route  POST /api/auth/logout
 * @access Protected
 */
router.post('/logout', protect, ctrl.logout);

/**
 * @route  GET /api/auth/me
 * @access Protected
 */
router.get('/me', protect, ctrl.me);

/**
 * @route  PATCH /api/auth/change-password
 * @access Protected
 */
router.patch('/change-password', protect, validate(schemas.changePassword), ctrl.changePassword);

module.exports = router;
