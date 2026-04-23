import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createPrismaClient } from '../api/src/prisma-client.js';

dotenv.config();

const prisma = createPrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME ?? 'Administrator';

  if (!adminEmail || !adminPassword) {
    console.log('Seed skipped. Set ADMIN_EMAIL and ADMIN_PASSWORD to bootstrap the first admin user.');
    return;
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    create: {
      name: adminName,
      email: adminEmail,
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });

  await prisma.siteSetting.upsert({
    where: { id: 'site' },
    update: {},
    create: {
      id: 'site',
    },
  });

  console.log(`Production seed complete. Admin login: ${adminEmail}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
