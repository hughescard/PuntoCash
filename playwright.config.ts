import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

/**
 * UI regression tests for the PuntoCash design system.
 *
 * Scope is deliberately narrow: these guard the accessibility contract of the
 * form foundation, not visual appearance. See `tests/README.md`.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",

  use: {
    baseURL: BASE_URL,
    // Desktop-first reference viewport (manual §10).
    viewport: { width: 1440, height: 900 },
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "npm run dev",
    url: `${BASE_URL}/design-system`,
    // Locally, attach to a dev server that is already running.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
