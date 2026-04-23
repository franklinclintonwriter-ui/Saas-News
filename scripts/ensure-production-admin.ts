import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createPrismaClient } from '../api/src/prisma-client.js';

const prisma = createPrismaClient();

async function main() {
  const email = 'alamgir@phulpur.net';
  const password = 'Admin@123';
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: 'Alamgir',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    create: {
      name: 'Alamgir',
      email,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log(JSON.stringify({
    ok: true,
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
