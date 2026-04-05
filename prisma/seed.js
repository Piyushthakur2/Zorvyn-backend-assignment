require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const CATEGORIES = {
  INCOME:  ['Salary', 'Freelance', 'Investments', 'Bonus', 'Rental Income', 'Side Project'],
  EXPENSE: ['Rent', 'Groceries', 'Utilities', 'Transport', 'Healthcare', 'Entertainment', 'Software', 'Marketing', 'Office'],
};

const randomBetween = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const randomItem    = (arr) => arr[Math.floor(Math.random() * arr.length)];
const daysAgo       = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Clean up ──────────────────────────────────────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // ─── Users ─────────────────────────────────────────────────────────────────
  const hash = (pw) => bcrypt.hash(pw, 12);

  const [admin, analyst, viewer] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Admin User', email: 'admin@finance.dev',
        password: await hash('Admin@123'), role: 'ADMIN',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Alice Analyst', email: 'analyst@finance.dev',
        password: await hash('Analyst@123'), role: 'ANALYST',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Victor Viewer', email: 'viewer@finance.dev',
        password: await hash('Viewer@123'), role: 'VIEWER',
      },
    }),
  ]);

  console.log(`✅ Created users: admin, analyst, viewer`);

  // ─── Financial Records (6 months of data) ─────────────────────────────────
  const records = [];

  for (let i = 180; i >= 0; i--) {
    // 1-2 income records per week
    if (i % 7 === 0) {
      records.push({
        amount:   randomBetween(3000, 8000),
        type:     'INCOME',
        category: 'Salary',
        date:     daysAgo(i),
        notes:    'Monthly salary credit',
        tags:     JSON.stringify(['salary', 'recurring']),
        userId:   admin.id,
      });
    }

    if (i % 14 === 0) {
      records.push({
        amount:   randomBetween(200, 2000),
        type:     'INCOME',
        category: randomItem(['Freelance', 'Investments', 'Side Project']),
        date:     daysAgo(i),
        notes:    'Additional income',
        tags:     JSON.stringify(['extra']),
        userId:   admin.id,
      });
    }

    // 2-4 expense records per day (randomly)
    const expenseCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < expenseCount; j++) {
      const cat = randomItem(CATEGORIES.EXPENSE);
      records.push({
        amount:   randomBetween(10, 800),
        type:     'EXPENSE',
        category: cat,
        date:     daysAgo(i),
        notes:    `${cat} payment`,
        tags:     JSON.stringify([cat.toLowerCase()]),
        userId:   admin.id,
      });
    }
  }

  // Batch insert
  await prisma.financialRecord.createMany({ data: records });
  console.log(`✅ Created ${records.length} financial records`);

  // ─── Audit logs ────────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { action: 'POST',   entity: 'USER',   entityId: analyst.id, userId: admin.id, changes: '{"role":"ANALYST"}' },
      { action: 'POST',   entity: 'USER',   entityId: viewer.id,  userId: admin.id, changes: '{"role":"VIEWER"}' },
      { action: 'POST',   entity: 'RECORD', entityId: 'seed',     userId: admin.id, changes: '{"notes":"bulk seed"}' },
    ],
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Seed complete! Test credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ADMIN    → admin@finance.dev   / Admin@123');
  console.log('  ANALYST  → analyst@finance.dev / Analyst@123');
  console.log('  VIEWER   → viewer@finance.dev  / Viewer@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
