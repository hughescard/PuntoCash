import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

/**
 * UI regression tests for the PuntoCash design system.
 *
 * Scope is deliberately narrow: these guard the accessibility contract of the
 * form foundation, not visual appearance. See `tests/README.md`.
 */

/**
 * Every `/worker` route now runs on a computer that is linked to one caja of
 * one sede (Worker FRD §2.1): `RegisterDeviceGate` shows the pairing screen —
 * not the sign-in, not the shell — until that link exists, and the link lives
 * in the device's own `localStorage`.
 *
 * A browser context starts empty, so without this every Worker test would see
 * the pairing screen instead of the app. Seeding the device session here is
 * the honest baseline: in production a caja is a machine an admin already
 * linked, and no test is about the moment before that.
 *
 * Points at **Caja 03 of PuntoCash Vedado** because that is the only caja with
 * simulated operational data (balances, jornada, movements) — the same one the
 * demo's admin simulator lets you choose (FR-DEV-9).
 *
 * A future test that needs the pairing screen itself opts out per file with
 * `test.use({ storageState: undefined })`.
 */
const LINKED_CAJA_DEVICE = {
  status: "linked",
  deviceId: "CAJ-0000-0001",
  branchId: "sede-vedado",
  registerId: "sede-vedado:caja-03",
  linkedAt: "2026-09-01T08:00:00.000Z",
  linkMethod: "codigo",
};

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

    storageState: {
      /*
       * El vínculo vive en dos sitios que deben contar lo mismo: `localStorage`,
       * que es la fuente de verdad a la que el terminal reacciona, y la cookie
       * espejo, que es lo que el layout de servidor lee para decidir qué
       * renderizar (FR-DEV-1.1). Sembrar solo uno deja al servidor y al cliente
       * en desacuerdo, y la suite entraría en un refresco por navegación.
       */
      cookies: [
        {
          name: "pc_caja_device",
          value: encodeURIComponent(
            JSON.stringify({
              deviceId: LINKED_CAJA_DEVICE.deviceId,
              branchId: LINKED_CAJA_DEVICE.branchId,
              registerId: LINKED_CAJA_DEVICE.registerId,
            }),
          ),
          domain: "localhost",
          path: "/",
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: "Lax" as const,
        },
      ],
      origins: [
        {
          origin: BASE_URL,
          localStorage: [
            { name: "puntocash.caja.device", value: JSON.stringify(LINKED_CAJA_DEVICE) },
          ],
        },
      ],
    },
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
