import { test, expect, type Page } from "@playwright/test";

import { esperarFondeoVivo, rellenar } from "./worker-helpers";
import { cajaConJornadaAbierta, EQUIPO_SIN_JORNADA } from "./storage-state";

/*
 * La jornada se siembra con los mismos fondos que abría el fondeo que había
 * aquí. Los dos grupos que tratan de abrir o de la caja cerrada se salen de la
 * siembra; el cierre perfecto necesita otros fondos y tiene su propia.
 */
test.use({ storageState: cajaConJornadaAbierta({ CUP: 200_000, USD: 4_250, EUR: 1_185 }) });

async function openJornada(page: Page, funds: Record<string, string> = { CUP: "200000", USD: "4250", EUR: "1185" }) {
  await page.goto("/worker/caja/fondeo-inicial");
  await esperarFondeoVivo(page);
  for (const [currency, value] of Object.entries(funds))
    await rellenar(page.getByLabel(`Fondo inicial en ${currency}`), value);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Confirmar y abrir caja" }).click();
  await expect(page.getByRole("heading", { name: "Caja abierta correctamente" })).toBeVisible({ timeout: 5000 });
  await page.getByRole("link", { name: "Ir a Caja" }).click();
}

async function goToCierre(page: Page) {
  await page.goto("/worker/caja");
  await page.getByRole("link", { name: /Arqueo y cierre/ }).click();
  await expect(page.getByRole("heading", { name: "Arqueo y cierre de caja" })).toBeVisible();
}

async function fillCount(page: Page, currency: string, amount: string) {
  await page.getByLabel(`Efectivo contado en ${currency}`).fill(amount);
}

async function chooseReason(page: Page, currency: string, reason: string, observations?: string) {
  await page.locator(`#cierre-motivo-${currency}`).click();
  await page.getByRole("option", { name: reason, exact: true }).click();
  if (observations) await page.locator(`#cierre-observaciones-${currency}`).fill(observations);
}

test.describe("arqueo y cierre — availability", () => {
  /*
   * Necesita la caja CERRADA, así que se sale de la siembra del archivo. Y no
   * solo por afirmar lo contrario de lo que habría: el estado sembrado se
   * repone al hidratar, de modo que la pantalla bloqueada que pintó el
   * servidor se sustituye por la de trabajo a media prueba.
   */
  test.use({ storageState: EQUIPO_SIN_JORNADA });

  test("is unavailable without an open jornada and direct access is blocked", async ({ page }) => {
    await page.goto("/worker/caja");
    const tile = page.getByRole("button", { name: /Arqueo y cierre/ });
    await expect(tile).toBeDisabled();
    await expect(tile.getByText("Requiere jornada abierta")).toBeVisible();
    await expect(page.getByText("Transferir entre cajas")).toHaveCount(0);
    await page.goto("/worker/caja/arqueo-cierre");
    await expect(page.getByText("No hay una jornada abierta para cerrar.")).toBeVisible();
  });

  test("becomes available once a jornada is open", async ({ page }) => {
    await openJornada(page);
    await expect(page.getByRole("link", { name: /Arqueo y cierre/ })).toBeVisible();
  });
});

test.describe("arqueo y cierre — form and review", () => {
  test("renders every enabled currency, including zero-balance GBP, with SVG flags and read-only expected balances", async ({ page }) => {
    await goToCierre(page);
    for (const currency of ["CUP", "USD", "EUR", "GBP"]) await expect(page.getByLabel(`Efectivo contado en ${currency}`)).toBeVisible();
    await expect(page.locator("svg[data-currency-flag]")).toHaveCount(4);
    await expect(page.getByText("0,00 GBP")).toBeVisible();
    await expect(page.getByText("¿Qué sigue?")).toHaveCount(0);
    await expect(page.getByText(/Para las monedas con diferencia/)).toHaveCount(0);
  });

  test("calculates states, offers only compatible reasons, and requires observations for Otro", async ({ page }) => {
    await goToCierre(page);
    await fillCount(page, "USD", "4240");
    await expect(page.getByText("Faltante", { exact: true })).toBeVisible();
    await page.getByText("Monedas con diferencia").scrollIntoViewIfNeeded();
    await page.locator("#cierre-motivo-USD").click();
    await expect(page.getByRole("option", { name: "Faltante detectado" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Sobrante detectado" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await chooseReason(page, "USD", "Otro");
    await expect(page.getByRole("button", { name: "Revisar cierre de caja" })).toBeDisabled();
    await page.locator("#cierre-observaciones-USD").fill("Conteo verificado.");
    await fillCount(page, "CUP", "200000");
    await fillCount(page, "EUR", "1185");
    await fillCount(page, "GBP", "0");
    await expect(page.getByText("Cuadrada", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Revisar cierre de caja" })).toBeEnabled();
  });

  test("review preserves every audit row and warns that confirmation closes the jornada", async ({ page }) => {
    await goToCierre(page);
    await fillCount(page, "CUP", "200000");
    await fillCount(page, "USD", "4240");
    await fillCount(page, "EUR", "1185");
    await fillCount(page, "GBP", "0");
    await chooseReason(page, "USD", "Faltante detectado", "Conteo repetido.");
    await page.getByRole("button", { name: "Revisar cierre de caja" }).click();
    await expect(page.getByRole("heading", { name: "Revisar cierre de caja" })).toBeVisible();
    await expect(page.getByText("Se registrará al confirmar")).toBeVisible();
    await expect(page.getByText("Al confirmar, la jornada quedará cerrada y no podrán registrarse nuevas operaciones ni movimientos en esta jornada.")).toBeVisible();
    await expect(page.getByText("Conteo repetido.").filter({ visible: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Volver" }).click();
    await expect(page.getByLabel("Efectivo contado en USD")).toHaveValue("4240");
  });
});

test.describe("arqueo y cierre — confirmation", () => {
  test("creates only required Ajuste de cierre movements, closes the jornada, and exposes the internal detail", async ({ page }) => {
    await goToCierre(page);
    await fillCount(page, "CUP", "200000");
    await fillCount(page, "USD", "4240");
    await fillCount(page, "EUR", "1185");
    await fillCount(page, "GBP", "0");
    await chooseReason(page, "USD", "Faltante detectado", "Conteo repetido.");
    await page.getByRole("button", { name: "Revisar cierre de caja" }).click();
    await page.getByRole("button", { name: "Confirmar cierre" }).click();
    await expect(page.getByRole("heading", { name: "Caja cerrada correctamente" })).toBeVisible({ timeout: 4000 });
    /* Antes eran `getByText("4").first()` y `getByText("1").last()`, que no
       afirmaban nada comprobable: cualquier elemento con ese texto los
       satisfacía, y `.last()` ataba la prueba al orden del documento. Cada
       cifra se lee ahora de su propia métrica. */
    await expect(
      page.getByText("Monedas arqueadas", { exact: true }).locator("xpath=following-sibling::p[1]"),
    ).toHaveText("4");
    await expect(
      page.getByText("Con diferencias", { exact: true }).locator("xpath=following-sibling::p[1]"),
    ).toHaveText("1");
    await page.getByRole("link", { name: "Ir a Caja" }).click();
    const movements = page.getByRole("table").nth(1);
    const row = movements.locator("tbody tr").filter({ hasText: "Ajuste de cierre" }).filter({ hasText: "USD" });
    await expect(row.getByText("Salida", { exact: true })).toBeVisible();
    await expect(row.getByText("−10,00", { exact: true })).toBeVisible();
    await row.getByRole("link", { name: "Ver detalle" }).click();
    await expect(page.getByText("Detalle del ajuste de cierre")).toBeVisible();
    await expect(page.getByText("Conteo repetido.").filter({ visible: true }).first()).toBeVisible();
  });

});

test.describe("arqueo y cierre — cierre perfecto", () => {
  /* Diez CUP y el resto en cero: un arqueo sin diferencia en ninguna moneda
     se cuenta más corto que con los fondos del resto del archivo. */
  test.use({ storageState: cajaConJornadaAbierta({ CUP: 10 }) });

  test("a perfectly balanced closing creates no movement and re-enables initial funding", async ({ page }) => {
    await goToCierre(page);
    await fillCount(page, "CUP", "10");
    await fillCount(page, "USD", "0");
    await fillCount(page, "EUR", "0");
    await fillCount(page, "GBP", "0");
    await page.getByRole("button", { name: "Revisar cierre de caja" }).click();
    await page.getByRole("button", { name: "Confirmar cierre" }).click();
    await expect(page.getByRole("heading", { name: "Caja cerrada correctamente" })).toBeVisible({ timeout: 4000 });
    await page.getByRole("link", { name: "Ir a Caja" }).click();
    await expect(page.getByRole("link", { name: /Registrar fondeo inicial/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ajustar efectivo/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Arqueo y cierre/ })).toBeDisabled();
    await expect(page.getByText("Ajuste de cierre")).toHaveCount(0);
  });
});
