import { test, expect } from "@playwright/test";

import { MARTA, signInAsAdmin } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";
import { formatoDeDenominacion } from "@/features/caja/billetes";

const CAPTURAS = process.env.CAPTURAS;

/**
 * Las denominaciones en pantalla: el catálogo que mantiene PuntoCash en
 * Monedas y tasas, y el inventario por denominación de cada caja que ven el
 * administrador de sedes y PuntoCash.
 *
 * Toca el CHF: añade y deja retirado un billete que no circula (un valor
 * distinto en cada pasada, para poder repetirla contra el mismo servidor),
 * sin cambiar lo que leen las demás pruebas.
 */

test.describe("Denominaciones", () => {
  test("PuntoCash ve las de cada moneda, añade una, la retira con motivo y la reincorpora", async ({ page }) => {
    const valor = 5001 + (Date.now() % 997);
    const v = formatoDeDenominacion(valor);
    await signInAsSuperAdmin(page);
    await page.goto("/super-admin/monedas-y-tasas");
    const main = page.getByRole("main");
    await main.getByRole("link", { name: "Denominaciones" }).click();
    await page.waitForURL(/vista=denominaciones/);

    const billetesUsd = main.getByRole("list", { name: "Billetes del USD" });
    await expect(billetesUsd.getByRole("button", { name: "Retirar el billete de 100 USD" })).toBeVisible();
    await expect(main.getByRole("list", { name: "Monedas del USD" }).getByRole("button", { name: "Retirar la moneda de 0,25 USD" })).toBeVisible();
    if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/sa-denominaciones.png`, fullPage: true });

    /* Añadir: valores inválidos y repetidos, rechazados con su motivo. */
    await main.getByRole("button", { name: "Añadir una denominación al CHF" }).click();
    let dialogo = page.getByRole("dialog");
    await dialogo.getByLabel(/^Valor/).fill("20");
    await dialogo.getByRole("button", { name: "Añadir la denominación" }).click();
    await expect(dialogo.getByText("Esa denominación ya está en el catálogo.")).toBeVisible();
    await dialogo.getByLabel(/^Valor/).fill(String(valor));
    if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/sa-anadir.png` });
    await dialogo.getByRole("button", { name: "Añadir la denominación" }).click();
    await expect(main.getByText(`Billete de ${v} CHF en el catálogo`, { exact: false })).toBeVisible();
    const billetesChf = main.getByRole("list", { name: "Billetes del CHF" });
    await expect(billetesChf.getByRole("button", { name: `Retirar el billete de ${v} CHF` })).toBeVisible();

    /* Retirar: pide motivo, dice qué queda en las cajas. */
    await billetesChf.getByRole("button", { name: `Retirar el billete de ${v} CHF` }).click();
    dialogo = page.getByRole("dialog");
    await expect(dialogo.getByText("Ninguna caja abierta tiene unidades")).toBeVisible();
    await dialogo.getByRole("button", { name: "Retirar la denominación" }).click();
    await expect(dialogo.getByText("Escribe el motivo: al menos 10 caracteres.")).toBeVisible();
    await dialogo.getByLabel(/^Motivo/).fill("Añadido por error, no circula");
    await dialogo.getByRole("button", { name: "Retirar la denominación" }).click();
    await expect(main.getByText(`Billete de ${v} CHF fuera del catálogo`, { exact: false })).toBeVisible();
    await expect(billetesChf.getByRole("button", { name: `Reincorporar el billete de ${v} CHF (retirada)` })).toBeVisible();

    /* Una que sí está en cajas lo dice antes de retirarla. */
    await billetesUsd.getByRole("button", { name: "Retirar el billete de 100 USD" }).click();
    dialogo = page.getByRole("dialog");
    await expect(dialogo.getByText(/^Quedan \d+ unidades en \d+ cajas? abiertas?$/)).toBeVisible();
    if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/sa-retirar.png` });
    await dialogo.getByRole("button", { name: "Cancelar" }).click();

    /* Reincorporar, y luego dejarla retirada como estaba. */
    await billetesChf.getByRole("button", { name: `Reincorporar el billete de ${v} CHF (retirada)` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reincorporar la denominación" }).click();
    await expect(main.getByText(`Billete de ${v} CHF vuelve a aceptarse`, { exact: false })).toBeVisible();
    await billetesChf.getByRole("button", { name: `Retirar el billete de ${v} CHF` }).click();
    await page.getByRole("dialog").getByLabel(/^Motivo/).fill("Añadido por error, no circula");
    await page.getByRole("dialog").getByRole("button", { name: "Retirar la denominación" }).click();
    await expect(billetesChf.getByRole("button", { name: `Reincorporar el billete de ${v} CHF (retirada)` })).toBeVisible();

    /* Todo queda en la auditoría. */
    await page.goto(`/super-admin/auditoria?texto=${encodeURIComponent(`${v} CHF`)}`);
    for (const etiqueta of ["Denominación añadida", "Denominación retirada", "Denominación reincorporada"]) {
      await expect(page.locator("main :visible", { hasText: etiqueta }).first()).toBeVisible();
    }
  });

  test("el administrador ve los billetes y monedas de cada caja, en la jornada y en la sede", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/jornadas");
    const main = page.getByRole("main");
    await main.getByRole("row").filter({ hasText: "Abierta" }).filter({ hasText: "Vedado" }).first().click();
    await page.waitForURL(/\/admin\/jornadas\/J-/);

    await expect(main.getByRole("heading", { name: "Billetes y monedas" })).toBeVisible();
    const inventario = main.getByRole("list", { name: "Billetes y monedas por moneda" });
    await inventario.getByText("USD", { exact: true }).click();
    const usd = main.getByRole("table", { name: "Billetes y monedas en USD" });
    await expect(usd).toBeVisible();
    await expect(usd.getByRole("columnheader", { name: "Denominación" })).toBeVisible();
    await expect(usd.getByRole("cell", { name: "20", exact: true })).toBeVisible();
    if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/ad-jornada.png`, fullPage: true });

    /* El detalle de un movimiento dice con qué billetes se movió. */
    await main.getByRole("link", { name: "Fondeo inicial" }).first().click();
    await page.waitForURL(/\/movimientos\//);
    await expect(main.getByRole("list", { name: "Billetes y monedas del movimiento" })).toBeVisible();
    if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/ad-movimiento.png`, fullPage: true });
  });
});
