const authService = require('./auth.service');
const { catchAsync, ApiResponse } = require('../../utils/api.utils');

const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  ApiResponse.created(res, result, 'Account created successfully');
});

const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  ApiResponse.success(res, result, 'Login successful');
});

const refresh = catchAsync(async (req, res) => {
  const token = req.body.refreshToken || req.headers['x-refresh-token'];
  const result = await authService.refreshTokens(token);
  ApiResponse.success(res, result, 'Tokens refreshed');
});

const logout = catchAsync(async (req, res) => {
  const token = req.body.refreshToken || req.headers['x-refresh-token'];
  await authService.logout(token);
  ApiResponse.success(res, null, 'Logged out successfully');
});

const me = catchAsync(async (req, res) => {
  ApiResponse.success(res, req.user, 'Profile fetched');
});

const changePassword = catchAsync(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  ApiResponse.success(res, null, 'Password changed. Please log in again.');
});

module.exports = { register, login, refresh, logout, me, changePassword };
