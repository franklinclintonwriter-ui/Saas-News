import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

function requiredDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required. Use a MySQL/MariaDB URL such as mysql://user:password@host:3306/database.');
  }
  if (!/^mysql:\/\//i.test(databaseUrl)) {
    throw new Error('DATABASE_URL must use the mysql:// protocol for the production Prisma schema.');
  }
  return databaseUrl;
}

function databaseNameFromUrl(databaseUrl: string): string | undefined {
  try {
    const name = new URL(databaseUrl).pathname.replace(/^\/+/, '');
    return name ? decodeURIComponent(name) : undefined;
  } catch {
    return undefined;
  }
}

export function createPrismaClient(): PrismaClient {
  const databaseUrl = requiredDatabaseUrl();
  const adapter = new PrismaMariaDb(databaseUrl, {
    database: databaseNameFromUrl(databaseUrl),
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}
