import { test, expect } from "./worker-fixture";
import { type Page } from "@playwright/test";

import { abrirPorPantalla, rellenarConteo } from "./worker-helpers";

/*
 * La jornada se siembra con los mismos fondos que abría el fondeo que había
 * aquí. Los dos grupos que tratan de abrir o de la caja cerrada se salen de la
 * siembra; el cierre perfecto necesita otros fondos y tiene su propia.
 */
test.use({ fondos: { CUP: 200_000, USD: 4_250, EUR: 1_185 } });

async function openJornada(page: Page, funds: Record<string, string> = { CUP: "200000", USD: "4250", EUR: "1185" }) {
  await abrirPorPantalla(page, funds);
}

async function goToCierre(page: Page) {
  await page.goto("/worker/caja");
  await page.getByRole("link", { name: /Arqueo y cierre/ }).click();
  await expect(page.getByRole("heading", { name: "Arqueo y cierre de caja" })).toBeVisible();
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
  test.use({ fondos: null });

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
    await page.getByRole("link", { name: "Ir a Caja" }).click();
    await expect(page.getByRole("link", { name: /Arqueo y cierre/ })).toBeVisible();
  });
});

const CUADRA = { CUP: "200000", USD: "4250", EUR: "1185", GBP: "0" };

/** Cuenta billete a billete, continúa y confirma: la caja queda cerrada en ese momento. */
async function cerrarContando(page: Page, counts: Record<string, string>, retoque?: (page: Page) => Promise<void>) {
  await goToCierre(page);
  await rellenarConteo(page, counts);
  if (retoque) await retoque(page);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirmar y cerrar caja" }).click();
}

test.describe("arqueo y cierre — a ciegas, billete a billete", () => {
  test("se cuenta por denominación sin ver el saldo esperado ni la diferencia", async ({ page }) => {
    await goToCierre(page);
    for (const currency of ["CUP", "USD", "EUR", "GBP"]) await expect(page.getByRole("region", { name: `Conteo de ${currency}` })).toBeVisible();
    await expect(page.getByLabel("Billetes de 100 USD")).toBeVisible();
    await expect(page.getByLabel("Monedas de 0,25 USD")).toBeVisible();
    await expect(page.getByText("200.000,00")).toHaveCount(0);
    await expect(page.getByText("4.250,00")).toHaveCount(0);
    await expect(page.getByText("Saldo esperado")).toHaveCount(0);
    await expect(page.getByText("Diferencia")).toHaveCount(0);
    /* Lo que suma el propio conteo, sí. */
    await page.getByLabel("Billetes de 100 USD").fill("3");
    await expect(page.getByTestId("total-USD")).toHaveText("300,00 USD");
  });

  test("una fila que no es un número entero no deja seguir", async ({ page }) => {
    await goToCierre(page);
    await page.getByLabel("Billetes de 100 USD").fill("1,5");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Escribe cuántas unidades hay, en números enteros.")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("al continuar avisa de que no se podrá cambiar; «Seguir contando» no cierra nada", async ({ page }) => {
    await goToCierre(page);
    await rellenarConteo(page, { ...CUADRA, USD: "4240" });
    await page.getByRole("button", { name: "Continuar" }).click();
    const aviso = page.getByRole("dialog");
    await expect(aviso.getByRole("heading", { name: "Los valores introducidos no podrán ser cambiados" })).toBeVisible();
    await expect(aviso.getByText("4.240,00 USD")).toBeVisible();
    await aviso.getByRole("button", { name: "Seguir contando" }).click();
    await expect(page.getByLabel("Billetes de 20 USD")).toHaveValue("2");
    await page.goto("/worker/caja");
    await expect(page.getByRole("link", { name: /Arqueo y cierre/ })).toBeVisible();
  });

  test("confirmar cierra la caja; los motivos se piden en una ventana de la que no se sale", async ({ page }) => {
    await cerrarContando(page, { ...CUADRA, USD: "4240" });
    const ventana = page.getByRole("dialog");
    await expect(ventana.getByRole("heading", { name: "Caja cerrada · explica las diferencias" })).toBeVisible();
    await expect(ventana.getByText("−10,00 USD")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(ventana).toBeVisible();
    await expect(ventana.getByRole("button", { name: "Cerrar", exact: true })).toHaveCount(0);

    await page.locator("#cierre-motivo-USD").click();
    await expect(page.getByRole("option", { name: "Faltante detectado" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Retiro de fondos" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Sobrante detectado" })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Reposición de fondos" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await ventana.getByRole("button", { name: "Guardar motivos y terminar" }).click();
    await expect(page.getByRole("heading", { name: "Caja cerrada correctamente" })).toHaveCount(0);
  });

  test("si se abandona la ventana, la caja ya está cerrada", async ({ page }) => {
    await cerrarContando(page, { ...CUADRA, USD: "4240" });
    await expect(page.getByRole("heading", { name: "Caja cerrada · explica las diferencias" })).toBeVisible();
    await page.goto("/worker/caja");
    await expect(page.getByRole("link", { name: /Abrir jornada/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Arqueo y cierre/ })).toBeDisabled();
  });

  test("si el total cuadra pero los billetes no, se pide la causa de la composición", async ({ page }) => {
    /* El billete de 50 USD de la apertura ya no está: hay dos de 20 y uno de 10. */
    await cerrarContando(page, CUADRA, async (p) => {
      await p.getByLabel("Billetes de 50 USD").fill("");
      await p.getByLabel("Billetes de 20 USD").fill("2");
      await p.getByLabel("Billetes de 10 USD").fill("1");
    });
    const ventana = page.getByRole("dialog");
    await expect(ventana.getByText("Billetes distintos (−1 de 50 · +2 de 20 · +1 de 10)")).toBeVisible();
    await page.locator("#cierre-motivo-USD").click();
    await expect(page.getByRole("option", { name: "Faltante detectado" })).toHaveCount(0);
    await page.getByRole("option", { name: "Hice un cambio de billetes sin registrarlo" }).click();
    await ventana.getByRole("button", { name: "Guardar motivos y terminar" }).click();
    await expect(page.getByRole("heading", { name: "Caja cerrada correctamente" })).toBeVisible({ timeout: 4000 });
  });

  test("un retiro de fondos al cerrar pide el supervisor", async ({ page }) => {
    await cerrarContando(page, { ...CUADRA, USD: "4240" });
    await chooseReason(page, "USD", "Retiro de fondos");
    const ventana = page.getByRole("dialog");
    await ventana.getByRole("button", { name: "Guardar motivos y terminar" }).click();
    await expect(page.getByRole("heading", { name: "Caja cerrada correctamente" })).toHaveCount(0);
    await page.locator("#cierre-supervisor-USD").click();
    await page.getByRole("option").first().click();
    await ventana.getByRole("button", { name: "Guardar motivos y terminar" }).click();
    await expect(page.getByRole("heading", { name: "Caja cerrada correctamente" })).toBeVisible({ timeout: 4000 });
  });
});

test.describe("arqueo y cierre — confirmation", () => {
  test("creates only required Ajuste de cierre movements, closes the jornada, and exposes the internal detail", async ({ page }) => {
    await cerrarContando(page, { ...CUADRA, USD: "4240" });
    await chooseReason(page, "USD", "Faltante detectado", "Conteo repetido.");
    await page.getByRole("button", { name: "Guardar motivos y terminar" }).click();
    await expect(page.getByRole("heading", { name: "Caja cerrada correctamente" })).toBeVisible({ timeout: 4000 });
    await expect(
      page.getByText("Monedas arqueadas", { exact: true }).locator("xpath=following-sibling::p[1]"),
    ).toHaveText("4");
    await expect(
      page.getByText("Con diferencias", { exact: true }).locator("xpath=following-sibling::p[1]"),
    ).toHaveText("1");
    await page.getByRole("link", { name: "Ir a Caja" }).click();
    const movements = page.getByRole("table").first();
    const row = movements.locator("tbody tr").filter({ hasText: "Ajuste de cierre" }).filter({ hasText: "USD" });
    await expect(row.getByText("Salida", { exact: true })).toBeVisible();
    await expect(row.getByText("−10,00", { exact: true })).toBeVisible();
    await row.getByRole("link", { name: /^Ver (la operación|el movimiento)/ }).click();
    await expect(page.getByText("Detalle del ajuste de cierre")).toBeVisible();
    await expect(page.getByText("Conteo repetido.").filter({ visible: true }).first()).toBeVisible();
  });
});

test.describe("arqueo y cierre — cierre perfecto", () => {
  test.use({ fondos: { CUP: 10 } });

  test("a perfectly balanced closing closes straight away and creates no movement", async ({ page }) => {
    await cerrarContando(page, { CUP: "10", USD: "0", EUR: "0", GBP: "0" });
    await expect(page.getByRole("heading", { name: "Caja cerrada correctamente" })).toBeVisible({ timeout: 4000 });
    await page.getByRole("link", { name: "Ir a Caja" }).click();
    await expect(page.getByRole("link", { name: /Abrir jornada/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Arqueo y cierre/ })).toBeDisabled();
    await expect(page.getByText("Ajuste de cierre")).toHaveCount(0);
  });
});
