const prisma = require('../../config/prisma');
const { ApiError } = require('../../utils/api.utils');

const RECORD_SELECT = {
  id: true, amount: true, type: true, category: true,
  date: true, notes: true, tags: true,
  createdAt: true, updatedAt: true,
  createdBy: { select: { id: true, name: true, email: true } },
};

// ─── Build dynamic Prisma where clause from query params ──────────────────────
const buildFilters = (query) => {
  const {
    type, category, minAmount, maxAmount,
    startDate, endDate, search, tags,
  } = query;

  const where = { isDeleted: false };

  if (type)     where.type     = type.toUpperCase();
  if (category) where.category = { contains: category };

  if (minAmount || maxAmount) {
    where.amount = {};
    if (minAmount) where.amount.gte = parseFloat(minAmount);
    if (maxAmount) where.amount.lte = parseFloat(maxAmount);
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate)   where.date.lte = new Date(endDate);
  }

  if (search) {
    where.OR = [
      { category: { contains: search } },
      { notes:    { contains: search } },
    ];
  }

  if (tags) {
    // Tags stored as JSON string; use contains for simple filtering
    where.tags = { contains: tags };
  }

  return where;
};

// ─── Get all records (paginated + filtered) ───────────────────────────────────
const getRecords = async (query) => {
  const {
    page = 1, limit = 10,
    sortBy = 'date', sortOrder = 'desc',
  } = query;

  const skip  = (page - 1) * Number(limit);
  const where = buildFilters(query);

  const validSortFields = ['date', 'amount', 'createdAt', 'category'];
  const orderField = validSortFields.includes(sortBy) ? sortBy : 'date';

  const [records, total] = await prisma.$transaction([
    prisma.financialRecord.findMany({
      where,
      select:  RECORD_SELECT,
      skip,
      take:    Number(limit),
      orderBy: { [orderField]: sortOrder === 'asc' ? 'asc' : 'desc' },
    }),
    prisma.financialRecord.count({ where }),
  ]);

  // Deserialize tags from JSON string
  const serialized = records.map(deserializeTags);

  return {
    records: serialized,
    pagination: {
      total,
      page:       Number(page),
      limit:      Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// ─── Get single record ────────────────────────────────────────────────────────
const getRecordById = async (id) => {
  const record = await prisma.financialRecord.findFirst({
    where:  { id, isDeleted: false },
    select: RECORD_SELECT,
  });
  if (!record) throw ApiError.notFound('Financial record not found');
  return deserializeTags(record);
};

// ─── Create record ────────────────────────────────────────────────────────────
const createRecord = async (data, userId) => {
  const record = await prisma.financialRecord.create({
    data: {
      ...data,
      date:   new Date(data.date),
      tags:   data.tags ? JSON.stringify(data.tags) : null,
      userId,
    },
    select: RECORD_SELECT,
  });
  return deserializeTags(record);
};

// ─── Update record ────────────────────────────────────────────────────────────
const updateRecord = async (id, data) => {
  await getRecordById(id); // ensure exists and not deleted

  const record = await prisma.financialRecord.update({
    where: { id },
    data: {
      ...data,
      ...(data.date && { date: new Date(data.date) }),
      ...(data.tags !== undefined && { tags: data.tags ? JSON.stringify(data.tags) : null }),
    },
    select: RECORD_SELECT,
  });
  return deserializeTags(record);
};

// ─── Soft delete ──────────────────────────────────────────────────────────────
const deleteRecord = async (id) => {
  await getRecordById(id);
  await prisma.financialRecord.update({
    where: { id },
    data:  { isDeleted: true, deletedAt: new Date() },
  });
};

// ─── Restore soft-deleted record ──────────────────────────────────────────────
const restoreRecord = async (id) => {
  const record = await prisma.financialRecord.findFirst({ where: { id } });
  if (!record)           throw ApiError.notFound('Record not found');
  if (!record.isDeleted) throw ApiError.badRequest('Record is not deleted');

  return prisma.financialRecord.update({
    where: { id },
    data:  { isDeleted: false, deletedAt: null },
    select: RECORD_SELECT,
  });
};

// ─── Helper: parse tags from JSON string ──────────────────────────────────────
const deserializeTags = (record) => ({
  ...record,
  tags: record.tags ? JSON.parse(record.tags) : [],
});

module.exports = { getRecords, getRecordById, createRecord, updateRecord, deleteRecord, restoreRecord };
