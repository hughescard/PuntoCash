import { expect, test, type Page } from "@playwright/test";

import { cajaConJornadaAbierta, EQUIPO_SIN_JORNADA } from "./storage-state";

/*
 * La jornada se siembra con 1.000 CUP, que es lo que abría el fondeo que había
 * aquí. La prueba de la caja cerrada vive ahora en su propio grupo, con la
 * línea de salida sin jornada.
 */
test.use({ storageState: cajaConJornadaAbierta({ CUP: 1_000 }) });

async function entrarARemesas(page: Page) {
  await page.goto("/worker/caja");
  await page.getByRole("link", { name: "Nueva operación" }).click();
  await page.getByRole("link", { name: /Remesas/ }).click();
}

async function searchReadyRemittance(page: Page) {
  await entrarARemesas(page);
  await page.getByLabel("Código de remesa").fill("RM-7X82-9KLM");
  await page.getByRole("button", { name: "Buscar remesa" }).click();
  await expect(page.getByRole("heading", { name: "Revisar remesa" })).toBeVisible();
}

test.describe("Remesas — caja cerrada", () => {
  test.use({ storageState: EQUIPO_SIN_JORNADA });

  test("is code-only and blocks a closed Caja", async ({ page }) => {
    await page.goto("/worker/nueva-operacion/remesas");
    await expect(page.getByRole("heading", { name: "Caja cerrada" })).toBeVisible();
    await expect(page.getByLabel("Código de remesa")).toHaveCount(0);
  });
});

test.describe("Remesas", () => {
  test("finds only the exact READY code and preserves beneficiary review data", async ({ page }) => {
    await searchReadyRemittance(page);
    await expect(page.getByText("María Pérez García").first()).toBeVisible();
    await expect(page.getByText("85010112345")).toBeVisible();
    await expect(page.getByText("500,00 CUP")).toBeVisible();
    await expect(page.getByText("Verificación de identidad")).toBeVisible();
    await expect(page.getByText("Buscar cliente")).toHaveCount(0);
  });

  test("rejects a reference-only match without leaking its data", async ({ page }) => {
    await entrarARemesas(page);
    await page.getByLabel("Código de remesa").fill("REF-REM-500");
    await page.getByRole("button", { name: "Buscar remesa" }).click();
    await expect(page.getByText("Remesa no encontrada")).toBeVisible();
    await expect(page.getByText("María Pérez García")).toHaveCount(0);
  });

  test("completes once, creates a Remesa operation and cash-out", async ({ page }) => {
    await searchReadyRemittance(page);
    await page.getByRole("button", { name: "Continuar a confirmar" }).click();
    await page.getByRole("button", { name: "Confirmar entrega" }).click();
    await expect(page.getByRole("heading", { name: "Remesa completada" })).toBeVisible();
    await expect(page.getByText("María Pérez García").first()).toBeVisible();
    await page.getByRole("link", { name: "Ir a Operaciones" }).click();
    await expect(page.getByText("Remesa", { exact: true }).first()).toBeVisible();
  });

  test("has no horizontal overflow at desktop widths", async ({ page }) => {
    for (const width of [1440, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/worker/nueva-operacion/remesas");
      // El shell de `/worker` solo existe tras la hidratación (ver `tests/README.md`):
      // medir antes mide una página vacía, y la aserción pasaría en falso.
      await page.getByRole("main").waitFor();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
});
