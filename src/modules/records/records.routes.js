const router = require('express').Router();
const ctrl   = require('./records.controller');
const { protect, isAdmin, isViewer } = require('../../middlewares/auth.middleware');
const { validate, schemas }          = require('../../middlewares/validate.middleware');
const { audit }                      = require('../../middlewares/audit.middleware');

router.use(protect);

/**
 * @route  GET  /api/records
 * @access Viewer, Analyst, Admin
 * @query  page, limit, type, category, minAmount, maxAmount,
 *         startDate, endDate, search, tags, sortBy, sortOrder
 */
router.get('/', isViewer, ctrl.getRecords);

/**
 * @route  GET  /api/records/:id
 * @access Viewer, Analyst, Admin
 */
router.get('/:id', isViewer, ctrl.getRecord);

/**
 * @route  POST /api/records
 * @access Admin only
 */
router.post('/', isAdmin, validate(schemas.createRecord), audit('RECORD'), ctrl.createRecord);

/**
 * @route  PATCH /api/records/:id
 * @access Admin only
 */
router.patch('/:id', isAdmin, validate(schemas.updateRecord), audit('RECORD'), ctrl.updateRecord);

/**
 * @route  DELETE /api/records/:id
 * @access Admin only (soft delete)
 */
router.delete('/:id', isAdmin, audit('RECORD'), ctrl.deleteRecord);

/**
 * @route  POST /api/records/:id/restore
 * @access Admin only
 */
router.post('/:id/restore', isAdmin, audit('RECORD'), ctrl.restoreRecord);

module.exports = router;
