import { defineConfig } from "@playwright/test";

// Admin UI smoke tests. Prereqs: `npm run dev` and
// `npx tsx scripts/admin-crud-tests.ts setup` (creates the test admin).
export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results/playwright",
  timeout: 90_000,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "test-results/admin-ui-results.json" }]],
  use: {
    baseURL: process.env.CRUD_BASE_URL || "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
