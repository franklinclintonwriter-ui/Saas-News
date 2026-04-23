/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'api/src/**/*.{test,spec}.ts',
    ],
    exclude: ['node_modules', 'dist', 'e2e', '.wrangler'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/app/lib/**', 'api/src/**'],
      exclude: [
        'src/app/components/ui/**', // shadcn generated
        'src/app/lib/**/*.test.ts',
        'api/src/**/*.test.ts',
      ],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 35,
        statements: 40,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
