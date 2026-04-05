// ─── users.controller.js ─────────────────────────────────────────────────────
const usersService = require('./users.service');
const { catchAsync, ApiResponse } = require('../../utils/api.utils');

const getUsers = catchAsync(async (req, res) => {
  const result = await usersService.getUsers(req.query);
  ApiResponse.paginated(res, result.users, result.pagination);
});

const getUser = catchAsync(async (req, res) => {
  const user = await usersService.getUserById(req.params.id);
  ApiResponse.success(res, user);
});

const updateUser = catchAsync(async (req, res) => {
  const user = await usersService.updateUser(req.params.id, req.body, req.user.id);
  ApiResponse.success(res, user, 'User updated');
});

const deactivateUser = catchAsync(async (req, res) => {
  const user = await usersService.deactivateUser(req.params.id, req.user.id);
  ApiResponse.success(res, user, 'User deactivated');
});

const getUserActivity = catchAsync(async (req, res) => {
  const activity = await usersService.getUserActivity(req.params.id);
  ApiResponse.success(res, activity);
});

module.exports = { getUsers, getUser, updateUser, deactivateUser, getUserActivity };
