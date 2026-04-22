import { createPrismaClient } from './prisma-client.js';

export const prisma = createPrismaClient();

export async function closePrisma(): Promise<void> {
  await prisma.$disconnect();
}
