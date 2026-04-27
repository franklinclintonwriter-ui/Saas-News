import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const log =
  process.env.NODE_ENV === 'development' ? (['warn', 'error'] as const) : (['error'] as const);

function requiredDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required. Set it in your .env (e.g. postgresql://… or mysql://…).');
  }
  if (!/^(mysql|mariadb|postgres|postgresql):\/\//i.test(databaseUrl)) {
    throw new Error('DATABASE_URL must use postgresql://, postgres://, mysql://, or mariadb://.');
  }
  return databaseUrl;
}

function databaseNameFromUrl(databaseUrl: string): string | undefined {
  try {
    const name = new URL(databaseUrl).pathname.replace(/^\/+/, '');
    return name ? decodeURIComponent(name.split('?')[0] ?? '') : undefined;
  } catch {
    return undefined;
  }
}

export function createPrismaClient(): PrismaClient {
  const databaseUrl = requiredDatabaseUrl();

  if (/^postgres(ql)?:\/\//i.test(databaseUrl)) {
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    return new PrismaClient({ adapter, log: [...log] });
  }

  if (!/^mysql:\/\//i.test(databaseUrl)) {
    throw new Error('For MySQL/MariaDB, use a mysql:// URL with the MariaDB adapter.');
  }

  const adapter = new PrismaMariaDb(databaseUrl, {
    database: databaseNameFromUrl(databaseUrl),
  });

  return new PrismaClient({
    adapter,
    log: [...log],
  });
}
