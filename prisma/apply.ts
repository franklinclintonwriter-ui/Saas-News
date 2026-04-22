import path from 'node:path';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required before applying the Prisma schema.');
}

if (!/^mysql:\/\//i.test(databaseUrl)) {
  throw new Error('DATABASE_URL must use the mysql:// protocol for this project.');
}

const command = path.resolve(
  process.cwd(),
  'node_modules',
  'prisma',
  'build',
  'index.js',
);
const args = [command, 'db', 'push'];

if (process.env.PRISMA_ACCEPT_DATA_LOSS === 'true') {
  args.push('--accept-data-loss');
}

const result = spawnSync(process.execPath, args, {
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
