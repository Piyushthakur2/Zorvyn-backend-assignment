const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Prevent multiple instances in development (hot reload)
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
    : ['warn', 'error'],
});

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query} | Duration: ${e.duration}ms`);
  });
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
