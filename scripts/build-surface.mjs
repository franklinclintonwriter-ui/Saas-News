import { spawnSync } from 'node:child_process';

const surface = process.argv[2] || 'public';
if (!['public', 'admin', 'all'].includes(surface)) {
  console.error('Usage: node scripts/build-surface.mjs <public|admin|all>');
  process.exit(1);
}

const result = spawnSync('npx', ['vite', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    VITE_APP_SURFACE: surface,
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '/api',
  },
});

process.exit(result.status ?? 1);
