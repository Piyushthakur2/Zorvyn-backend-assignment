// ─── records.controller.js ───────────────────────────────────────────────────
const recordsService = require('./records.service');
const { catchAsync, ApiResponse } = require('../../utils/api.utils');

const getRecords = catchAsync(async (req, res) => {
  const result = await recordsService.getRecords(req.query);
  ApiResponse.paginated(res, result.records, result.pagination);
});

const getRecord = catchAsync(async (req, res) => {
  const record = await recordsService.getRecordById(req.params.id);
  ApiResponse.success(res, record);
});

const createRecord = catchAsync(async (req, res) => {
  const record = await recordsService.createRecord(req.body, req.user.id);
  ApiResponse.created(res, record, 'Financial record created');
});

const updateRecord = catchAsync(async (req, res) => {
  const record = await recordsService.updateRecord(req.params.id, req.body);
  ApiResponse.success(res, record, 'Record updated');
});

const deleteRecord = catchAsync(async (req, res) => {
  await recordsService.deleteRecord(req.params.id);
  ApiResponse.success(res, null, 'Record deleted (soft)');
});

const restoreRecord = catchAsync(async (req, res) => {
  const record = await recordsService.restoreRecord(req.params.id);
  ApiResponse.success(res, record, 'Record restored');
});

module.exports = { getRecords, getRecord, createRecord, updateRecord, deleteRecord, restoreRecord };
