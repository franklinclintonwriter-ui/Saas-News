import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createPrismaClient } from '../api/src/prisma-client.js';

const prisma = createPrismaClient();

async function main() {
  const email = 'alamgir@phulpur.net';
  const password = 'Admin@123';
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.log(JSON.stringify({ ok: false, exists: false }, null, 2));
    return;
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);

  console.log(JSON.stringify({
    ok: true,
    exists: true,
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    passwordValid,
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
