import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    // tests/migration/** needs a live MySQL server and runs only in the
    // dedicated migration-safety CI job / `npm run test:migration`.
    exclude: ['tests/migration/**'],
    environment: 'node',
    passWithNoTests: false,
    coverage: {
      reporter: ['text', 'json-summary'],
    },
  },
});
