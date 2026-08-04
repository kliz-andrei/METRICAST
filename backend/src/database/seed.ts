import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './client.js';
import { sourceKey } from './pos-validation.js';

const categories = ['Appetizer', 'Dessert', 'Entree', 'Soup'];
const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@underthebalete.com';
const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeThisBeforeProduction!';

try {
  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { email },
      update: { firstName: 'Under the', lastName: 'Balete', role: 'ADMINISTRATOR', isActive: true, deletedAt: null },
      create: { email, firstName: 'Under the', lastName: 'Balete', passwordHash: await bcrypt.hash(password, 12), role: 'ADMINISTRATOR' }
    });
    await tx.category.createMany({ data: categories.map((name) => ({ name, sourceKey: sourceKey(name) })), skipDuplicates: true });
    await tx.auditLog.create({ data: { action: 'DATABASE_SEEDED', entityType: 'Database', metadata: { categories } } });
  });
  console.info(`Seed completed. Administrator: ${email}`);
} finally {
  await prisma.$disconnect();
}