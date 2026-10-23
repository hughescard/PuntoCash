import { test, expect } from "@playwright/test";

import { MARTA, signInAsAdmin } from "./admin-helpers";

/**
 * `/admin/jornadas` — navegación y congruencia, y forzar el cierre.
 *
 * Fuerza el cierre de la Caja 01 de Obispo, que la siembra deja abierta desde
 * ayer precisamente para esto. Ninguna otra prueba lee esa jornada.
 */

test.describe("Jornadas", () => {
  test("la caja que nadie cerró se ve arriba, y se puede forzar su cierre", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/jornadas");
    const main = page.getByRole("main");

    /* Arriba, la abierta de un día anterior, con enlace a su jornada. */
    await expect(main.getByText("Una caja sigue abierta de un día anterior")).toBeVisible();
    await main.getByRole("link", { name: "Caja 01 de PuntoCash Obispo" }).click();
    await page.waitForURL(/\/admin\/jornadas\/J-habana-vieja-01-\d{8}$/);

    /* FR-AD-JOR-4: equipo, saldos y movimientos. */
    await expect(main.getByText("Mostrador 1 · Obispo · CAJ-0002-0001")).toBeVisible();
    await expect(main.getByRole("heading", { name: "Movimientos" })).toBeVisible();

    /* FR-AD-JOR-8 a 10: la advertencia, y sin motivo no se puede. */
    await main.getByRole("button", { name: "Forzar cierre" }).click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByText("Esta jornada se cerrará sin contar el efectivo.", { exact: false })).toBeVisible();
    const confirmar = dialogo.getByRole("button", { name: "Cerrar sin contar" });
    await expect(confirmar).toBeDisabled();
    await dialogo.getByLabel(/^Motivo/).fill("El trabajador se fue sin cerrar y no vuelve hasta mañana");
    await confirmar.click();

    /* FR-AD-JOR-14: se distingue, con su motivo y quién lo declaró. */
    await expect(main.getByText("Jornada cerrada", { exact: true })).toBeVisible();
    await expect(main.getByText(/^La cerró Marta Sánchez el/)).toBeVisible();
    await expect(main.getByRole("button", { name: "Forzar cierre" })).toHaveCount(0);

    /* FR-AD-JOR-20: nadie la ha contado, así que queda pendiente de conciliar. */
    await expect(main.getByText("Pendiente de conciliar.")).toBeVisible();

    await page.goto("/admin/jornadas");
    await expect(main.getByText("Una caja sigue abierta de un día anterior")).toHaveCount(0);
    await expect(main.getByText("Una caja con cierre forzado no se ha vuelto a contar")).toBeVisible();
  });

  test("se entra a una jornada pulsando la fila, y el trabajador lleva a su ficha", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/jornadas");
    const main = page.getByRole("main");

    /* La caja no es un enlace: una jornada no se reconoce por un solo dato. */
    const fila = main.locator("tr:visible", { has: page.getByRole("link", { name: /^Ver jornada de / }) }).first();
    await expect(fila.getByRole("link")).toHaveCount(2);
    /* Se abre pulsando la fila en cualquier parte que no sea otro enlace. */
    await fila.locator("td").nth(2).click();
    await page.waitForURL(/\/admin\/jornadas\/J-[\w-]+$/);

    await main.getByRole("link", { name: /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+ [A-ZÁÉÍÓÚ]/ }).first().click();
    await page.waitForURL(/\/admin\/trabajadores\/[\w-]+$/);
  });

  test("en el teléfono, la tarjeta entera abre la jornada", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/jornadas");
    const tarjeta = page.getByRole("main").locator("article:visible").first();
    /* Un toque en medio de la tarjeta, lejos del trabajador. */
    const caja = (await tarjeta.boundingBox())!;
    await page.mouse.click(caja.x + caja.width - 40, caja.y + caja.height - 30);
    await page.waitForURL(/\/admin\/jornadas\/J-[\w-]+$/);
  });

  test("un cierre forzado se concilia con el conteo de la apertura siguiente", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    /* La Caja 03 de Obispo tuvo un cierre forzado hace cuatro días. */
    const hace4 = new Date(Date.now() - 4 * 24 * 3600 * 1000);
    const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Havana" }).format(hace4).replaceAll("-", "");
    await page.goto(`/admin/jornadas/J-habana-vieja-03-${dia}`);
    const main = page.getByRole("main");

    await expect(main.getByText("Cierre forzado", { exact: true }).first()).toBeVisible();
    await expect(main.getByText(/faltante detectado de 2\.000,00 CUP/)).toBeVisible();

    /* FR-AD-JOR-18 y 19: la siguiente compara su conteo con ese cierre y lo dice. */
    await main.getByRole("link", { name: "jornada siguiente" }).click();
    await page.waitForURL(/\/admin\/jornadas\/J-habana-vieja-03-\d{8}$/);
    await expect(main.getByRole("heading", { name: "Apertura" })).toBeVisible();
    await expect(main.getByText(/Ese fue un cierre forzado/)).toBeVisible();
    await expect(main.getByText("Faltante −2.000,00 CUP")).toBeVisible();
  });
});
