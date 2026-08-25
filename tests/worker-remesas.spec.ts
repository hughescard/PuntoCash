import { expect, test, type Page } from "@playwright/test";

async function openJornada(page: Page) {
  await page.goto("/worker/caja/fondeo-inicial");
  await page.getByLabel("Fondo inicial en CUP").fill("1000");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Confirmar y abrir caja" }).click();
  await page.getByRole("link", { name: "Ir a Caja" }).click();
}

async function searchReadyRemittance(page: Page) {
  await page.getByRole("link", { name: "Nueva operación" }).click();
  await page.getByRole("link", { name: /Remesas/ }).click();
  await page.getByLabel("Código de remesa").fill("RM-7X82-9KLM");
  await page.getByRole("button", { name: "Buscar remesa" }).click();
  await expect(page.getByRole("heading", { name: "Revisar remesa" })).toBeVisible();
}

test.describe("Remesas", () => {
  test("is code-only and blocks a closed Caja", async ({ page }) => {
    await page.goto("/worker/nueva-operacion/remesas");
    await expect(page.getByRole("heading", { name: "Caja cerrada" })).toBeVisible();
    await expect(page.getByLabel("Código de remesa")).toHaveCount(0);
  });

  test("finds only the exact READY code and preserves beneficiary review data", async ({ page }) => {
    await openJornada(page);
    await searchReadyRemittance(page);
    await expect(page.getByText("María Pérez García").first()).toBeVisible();
    await expect(page.getByText("85010112345")).toBeVisible();
    await expect(page.getByText("500,00 CUP")).toBeVisible();
    await expect(page.getByText("Verificación de identidad")).toBeVisible();
    await expect(page.getByText("Buscar cliente")).toHaveCount(0);
  });

  test("rejects a reference-only match without leaking its data", async ({ page }) => {
    await openJornada(page);
    await page.getByRole("link", { name: "Nueva operación" }).click();
    await page.getByRole("link", { name: /Remesas/ }).click();
    await page.getByLabel("Código de remesa").fill("REF-REM-500");
    await page.getByRole("button", { name: "Buscar remesa" }).click();
    await expect(page.getByText("Remesa no encontrada")).toBeVisible();
    await expect(page.getByText("María Pérez García")).toHaveCount(0);
  });

  test("completes once, creates a Remesa operation and cash-out", async ({ page }) => {
    await openJornada(page);
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
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
});
