// ─── dashboard.controller.js ──────────────────────────────────────────────────
const dashService = require('./dashboard.service');
const { catchAsync, ApiResponse } = require('../../utils/api.utils');

const getSummary = catchAsync(async (req, res) => {
  const data = await dashService.getSummary(req.query);
  ApiResponse.success(res, data, 'Dashboard summary');
});

const getMonthlyTrend = catchAsync(async (req, res) => {
  const months = parseInt(req.query.months) || 6;
  const data   = await dashService.getMonthlyTrend(months);
  ApiResponse.success(res, data, `Monthly trend (last ${months} months)`);
});

const getWeeklyTrend = catchAsync(async (req, res) => {
  const weeks = parseInt(req.query.weeks) || 8;
  const data  = await dashService.getWeeklyTrend(weeks);
  ApiResponse.success(res, data, `Weekly trend (last ${weeks} weeks)`);
});

const getCategoryBreakdown = catchAsync(async (req, res) => {
  const data = await dashService.getCategoryBreakdown(req.query);
  ApiResponse.success(res, data, 'Category breakdown');
});

const getRecentActivity = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const data  = await dashService.getRecentActivity(limit);
  ApiResponse.success(res, data, 'Recent activity');
});

const getCashFlow = catchAsync(async (req, res) => {
  const data = await dashService.getCashFlow();
  ApiResponse.success(res, data, 'Cash flow overview');
});

module.exports = {
  getSummary, getMonthlyTrend, getWeeklyTrend,
  getCategoryBreakdown, getRecentActivity, getCashFlow,
};
