const router = require('express').Router();
const ctrl   = require('./dashboard.controller');
const { protect, isAnalyst, isViewer } = require('../../middlewares/auth.middleware');

router.use(protect);

/**
 * @route  GET /api/dashboard/summary
 * @access Viewer, Analyst, Admin
 * @query  startDate, endDate
 */
router.get('/summary', isViewer, ctrl.getSummary);

/**
 * @route  GET /api/dashboard/cash-flow
 * @access Viewer, Analyst, Admin
 */
router.get('/cash-flow', isViewer, ctrl.getCashFlow);

/**
 * @route  GET /api/dashboard/recent-activity
 * @access Viewer, Analyst, Admin
 * @query  limit (default 10)
 */
router.get('/recent-activity', isViewer, ctrl.getRecentActivity);

/**
 * @route  GET /api/dashboard/trends/monthly
 * @access Analyst, Admin
 * @query  months (default 6)
 */
router.get('/trends/monthly', isAnalyst, ctrl.getMonthlyTrend);

/**
 * @route  GET /api/dashboard/trends/weekly
 * @access Analyst, Admin
 * @query  weeks (default 8)
 */
router.get('/trends/weekly', isAnalyst, ctrl.getWeeklyTrend);

/**
 * @route  GET /api/dashboard/categories
 * @access Analyst, Admin
 * @query  type (INCOME|EXPENSE), startDate, endDate
 */
router.get('/categories', isAnalyst, ctrl.getCategoryBreakdown);

module.exports = router;
