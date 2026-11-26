import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Integration suites share one MySQL database; run files sequentially.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
