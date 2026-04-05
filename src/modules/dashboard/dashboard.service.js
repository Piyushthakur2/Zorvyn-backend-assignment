const prisma = require('../../config/prisma');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sumByType = (records, type) =>
  records.filter((r) => r.type === type).reduce((acc, r) => acc + r.amount, 0);

const groupBy = (records, key) =>
  records.reduce((acc, r) => {
    const k = r[key];
    if (!acc[k]) acc[k] = { total: 0, count: 0 };
    acc[k].total += r.amount;
    acc[k].count += 1;
    return acc;
  }, {});

const getLast = (n, unit) => {
  const date = new Date();
  if (unit === 'days')   date.setDate(date.getDate() - n);
  if (unit === 'months') date.setMonth(date.getMonth() - n);
  return date;
};

const formatMonth = (date) =>
  new Date(date).toLocaleString('default', { month: 'short', year: 'numeric' });

const formatWeek = (date) => {
  const d   = new Date(date);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7)); // Monday
  return mon.toISOString().slice(0, 10);
};

// ─── Summary ─────────────────────────────────────────────────────────────────
const getSummary = async (query = {}) => {
  const { startDate, endDate } = query;

  const where = {
    isDeleted: false,
    ...(startDate || endDate
      ? {
          date: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate   && { lte: new Date(endDate)   }),
          },
        }
      : {}),
  };

  const records = await prisma.financialRecord.findMany({
    where,
    select: { amount: true, type: true, category: true, date: true },
  });

  const totalIncome   = sumByType(records, 'INCOME');
  const totalExpenses = sumByType(records, 'EXPENSE');
  const netBalance    = totalIncome - totalExpenses;
  const savingsRate   = totalIncome > 0
    ? +((netBalance / totalIncome) * 100).toFixed(2)
    : 0;

  const byCategory = groupBy(records, 'category');

  // Top 5 spending categories
  const topCategories = Object.entries(byCategory)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    totalIncome:    +totalIncome.toFixed(2),
    totalExpenses:  +totalExpenses.toFixed(2),
    netBalance:     +netBalance.toFixed(2),
    savingsRate,
    recordCount:    records.length,
    byCategory,
    topCategories,
  };
};

// ─── Monthly trend (last N months) ───────────────────────────────────────────
const getMonthlyTrend = async (months = 6) => {
  const since = getLast(months, 'months');

  const records = await prisma.financialRecord.findMany({
    where:  { isDeleted: false, date: { gte: since } },
    select: { amount: true, type: true, date: true },
    orderBy: { date: 'asc' },
  });

  const map = {};
  records.forEach((r) => {
    const key = formatMonth(r.date);
    if (!map[key]) map[key] = { month: key, income: 0, expenses: 0, net: 0 };
    if (r.type === 'INCOME')  map[key].income   += r.amount;
    if (r.type === 'EXPENSE') map[key].expenses += r.amount;
    map[key].net = map[key].income - map[key].expenses;
  });

  return Object.values(map).map((m) => ({
    month:    m.month,
    income:   +m.income.toFixed(2),
    expenses: +m.expenses.toFixed(2),
    net:      +m.net.toFixed(2),
  }));
};

// ─── Weekly trend (last N weeks) ─────────────────────────────────────────────
const getWeeklyTrend = async (weeks = 8) => {
  const since = getLast(weeks * 7, 'days');

  const records = await prisma.financialRecord.findMany({
    where:  { isDeleted: false, date: { gte: since } },
    select: { amount: true, type: true, date: true },
    orderBy: { date: 'asc' },
  });

  const map = {};
  records.forEach((r) => {
    const key = formatWeek(r.date);
    if (!map[key]) map[key] = { week: key, income: 0, expenses: 0, net: 0 };
    if (r.type === 'INCOME')  map[key].income   += r.amount;
    if (r.type === 'EXPENSE') map[key].expenses += r.amount;
    map[key].net = map[key].income - map[key].expenses;
  });

  return Object.values(map).map((m) => ({
    week:     m.week,
    income:   +m.income.toFixed(2),
    expenses: +m.expenses.toFixed(2),
    net:      +m.net.toFixed(2),
  }));
};

// ─── Category breakdown ───────────────────────────────────────────────────────
const getCategoryBreakdown = async (query = {}) => {
  const { type, startDate, endDate } = query;

  const where = {
    isDeleted: false,
    ...(type && { type: type.toUpperCase() }),
    ...(startDate || endDate
      ? { date: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate   && { lte: new Date(endDate)   }),
          }}
      : {}),
  };

  const records = await prisma.financialRecord.findMany({
    where,
    select: { amount: true, type: true, category: true },
  });

  const total = records.reduce((s, r) => s + r.amount, 0);

  const byCategory = groupBy(records, 'category');

  return Object.entries(byCategory)
    .map(([category, data]) => ({
      category,
      total:      +data.total.toFixed(2),
      count:      data.count,
      percentage: total > 0 ? +((data.total / total) * 100).toFixed(2) : 0,
    }))
    .sort((a, b) => b.total - a.total);
};

// ─── Recent activity ──────────────────────────────────────────────────────────
const getRecentActivity = async (limit = 10) => {
  const records = await prisma.financialRecord.findMany({
    where:   { isDeleted: false },
    select:  {
      id: true, amount: true, type: true, category: true, date: true, notes: true,
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take:    Number(limit),
  });

  return records;
};

// ─── Cash flow overview ───────────────────────────────────────────────────────
const getCashFlow = async () => {
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const lastMonthStart = new Date(thisMonthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  const lastMonthEnd = new Date(thisMonthStart);
  lastMonthEnd.setMilliseconds(-1);

  const [thisMonth, lastMonth] = await Promise.all([
    prisma.financialRecord.findMany({
      where:  { isDeleted: false, date: { gte: thisMonthStart } },
      select: { amount: true, type: true },
    }),
    prisma.financialRecord.findMany({
      where:  { isDeleted: false, date: { gte: lastMonthStart, lte: lastMonthEnd } },
      select: { amount: true, type: true },
    }),
  ]);

  const calc = (records) => ({
    income:   +sumByType(records, 'INCOME').toFixed(2),
    expenses: +sumByType(records, 'EXPENSE').toFixed(2),
    net:      +(sumByType(records, 'INCOME') - sumByType(records, 'EXPENSE')).toFixed(2),
  });

  const current  = calc(thisMonth);
  const previous = calc(lastMonth);

  const pctChange = (curr, prev) =>
    prev === 0 ? null : +((((curr - prev) / prev) * 100)).toFixed(2);

  return {
    currentMonth:  current,
    previousMonth: previous,
    changes: {
      income:   pctChange(current.income,   previous.income),
      expenses: pctChange(current.expenses, previous.expenses),
      net:      pctChange(current.net,      previous.net),
    },
  };
};

module.exports = {
  getSummary,
  getMonthlyTrend,
  getWeeklyTrend,
  getCategoryBreakdown,
  getRecentActivity,
  getCashFlow,
};
