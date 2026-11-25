import path from "node:path";

import { test, expect } from "./worker-fixture";
import { continuarAConfirmar, firmarEnElPanel, hacerFotosDelCarne } from "./worker-helpers";
import { type Page } from "@playwright/test";


/*
 * La jornada se siembra con 1.000 CUP, que es lo que abría el fondeo que había
 * aquí. La prueba de la caja cerrada vive ahora en su propio grupo, con la
 * línea de salida sin jornada.
 */
test.use({ conCambio: true, fondos: { CUP: 1_000 } });

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
  test.use({ fondos: null });

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
    await continuarAConfirmar(page);
    await hacerFotosDelCarne(page);
    await page.getByRole("button", { name: "Confirmar entrega" }).click();
    await expect(page.getByRole("heading", { name: "Remesa completada" })).toBeVisible();
    await expect(page.getByText("María Pérez García").first()).toBeVisible();
    await page.getByRole("link", { name: "Ir a Operaciones" }).click();
    await expect(page.getByText("Remesa", { exact: true }).locator("visible=true").first()).toBeVisible();
  });

  test("the delivery cannot be confirmed without both photos of the carné and the signature", async ({ page }) => {
    await searchReadyRemittance(page);
    await continuarAConfirmar(page);
    await expect(page.getByRole("heading", { name: "Carné y firma del beneficiario" })).toBeVisible();
    await expect(page.getByRole("img", { name: /Código QR para hacer la foto del carné/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Confirmar entrega" })).toBeDisabled();

    /* Solo el anverso: sigue sin poder confirmarse. */
    const url = await page.getByRole("link", { name: /Abrir el enlace en este equipo/ }).getAttribute("href");
    const movil = await page.context().newPage();
    await movil.goto(url!);
    await expect(movil.getByText("María Pérez García", { exact: true })).toBeVisible();
    /* El móvil no enseña el documento del beneficiario. */
    await expect(movil.getByText("85010112345")).toHaveCount(0);
    await expect(movil.getByRole("button", { name: "Hacer foto del anverso" })).toBeEnabled();
    await movil.locator('input[data-cara="anverso"]').setInputFiles(path.join(__dirname, "fixtures", "promocion.jpg"));
    await expect(movil.getByRole("button", { name: "Repetir foto del anverso" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Anverso del carné del beneficiario" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Confirmar entrega" })).toBeDisabled();

    /* Con el reverso, las fotos están, pero falta la firma: tampoco. */
    await movil.locator('input[data-cara="reverso"]').setInputFiles(path.join(__dirname, "fixtures", "promocion.jpg"));
    await expect(page.getByRole("img", { name: "Reverso del carné del beneficiario" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Confirmar entrega" })).toBeDisabled();

    /* El beneficiario firma una frase con lo que recibe; un toque no basta. */
    await expect(movil.locator("[data-frase-de-firma]")).toHaveText("Recibo 500,00 CUP por la remesa RM-7X82-9KLM.");
    await expect(movil.getByRole("button", { name: "Guardar firma" })).toBeDisabled();
    await firmarEnElPanel(movil);
    await movil.getByRole("button", { name: "Guardar firma" }).click();
    await expect(movil.getByText("Listo: las fotos y la firma ya están en la caja")).toBeVisible();
    await expect(page.getByRole("img", { name: "Firma del beneficiario" })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("[data-frase-en-caja]")).toHaveText("Recibo 500,00 CUP por la remesa RM-7X82-9KLM.");
    await expect(page.getByRole("button", { name: "Confirmar entrega" })).toBeEnabled({ timeout: 15_000 });
    await page.getByRole("button", { name: "Confirmar entrega" }).click();
    await expect(page.getByRole("heading", { name: "Remesa completada" })).toBeVisible();

    /* Usado el enlace, el móvil ya no sube nada más. */
    await movil.reload();
    await expect(movil.getByRole("heading", { name: "Entrega ya confirmada" })).toBeVisible();
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
