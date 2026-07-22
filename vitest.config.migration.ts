import { defineConfig } from 'vitest/config';

// Migration integration tests require a reachable MySQL-compatible server
// (AI_DATABASE_URL). They run in the dedicated CI job and locally via
// `npm run test:migration`; the default `npm test` run stays DB-free.
export default defineConfig({
  test: {
    include: ['tests/migration/**/*.spec.ts'],
    environment: 'node',
    passWithNoTests: false,
    testTimeout: 240_000,
    hookTimeout: 240_000,
    // Serial: all suites share the same scratch MySQL instance.
    fileParallelism: false,
    // The generated Prisma client imports a wasm query-compiler module by
    // extension; Vite's SSR transform misclassifies it, so run it natively.
    server: {
      deps: {
        external: [/@prisma\/client\/runtime\/.*/],
      },
    },
  },
  resolve: {
    alias: [
      {
        // NodeNext-style ".js" specifiers pointing at generated TypeScript
        // sources; Vite cannot apply its TS extension remapping on its own.
        find: /^(.*generated\/ai-prisma\/.*)\.js$/,
        replacement: '$1.ts',
      },
    ],
  },
});
