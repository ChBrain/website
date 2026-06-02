import { defineConfig } from "vitest/config";

// Live smoke checks - they hit the deployed origin, so they are kept OUT of
// the default hermetic suite (vitest.config.ts, which only globs tests/**) and
// run on demand via `npm run smoke`. Issue #149.
export default defineConfig({
  test: {
    globals: true,
    include: ["smoke/**/*.smoke.ts"],
    testTimeout: 30_000,
  },
});
