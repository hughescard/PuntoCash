import { test, expect, type Page } from "@playwright/test";

import { MARTA, signInAsAdmin } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * La ficha de una caja: cómo está ahora mismo. Se llega desde Cajas (y desde
 * la ficha de la sede); dice si está abierta y quién la tiene, el efectivo que
 * hay dentro —cerrada, lo que quedó al cerrar—, los últimos movimientos, lo
 * pendiente y sus jornadas anteriores.
 */

const visible = (page: Page, nombre: string) => page.getByRole("main").getByRole("link", { name: nombre, exact: true }).locator("visible=true").first();

test.describe("Ficha de caja", () => {
  test("Cajas enseña el efectivo de cada caja y lleva a su ficha", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/cajas");
    const main = page.getByRole("main");
    await expect(main.getByRole("columnheader", { name: "Efectivo" }).first()).toBeVisible();
    await expect(main.getByText(/CUP · .*USD/).locator("visible=true").first()).toBeVisible();
    await expect(main.getByText("Al cerrar").locator("visible=true").first()).toBeVisible();

    await main.locator('a[href="/admin/cajas/sede-vedado%3Acaja-01"]').locator("visible=true").first().click();
    await page.waitForURL(/\/admin\/cajas\/[^/]+$/);

    await expect(page.getByRole("heading", { name: "Caja 01", level: 1 })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Ahora", exact: true })).toBeVisible();
    await expect(main.getByText("Lidia Gómez").first()).toBeVisible();
    await expect(main.getByRole("heading", { name: "Efectivo ahora" })).toBeVisible();
    await expect(main.getByRole("table", { name: "Billetes y monedas en CUP" })).toBeAttached();
    await expect(main.getByRole("list", { name: "Últimos movimientos" })).toBeVisible();
    await expect(main.getByRole("list", { name: "Jornadas anteriores" })).toBeVisible();
    await expect(main.getByRole("button", { name: "Retirar caja" })).toBeVisible();

    /* Desde la ficha se salta a la jornada en curso. */
    await main.getByRole("link", { name: "Ver la jornada" }).click();
    await page.waitForURL(/\/admin\/jornadas\/J-/);
  });

  test("una caja cerrada enseña lo que quedó dentro al cerrarla", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/sedes/sede-habana-vieja");
    await visible(page, "Caja 03").click();
    await page.waitForURL(/\/admin\/cajas\/[^/]+$/);
    const main = page.getByRole("main");
    await expect(main.getByText("Cerrada por")).toBeVisible();
    await expect(main.getByRole("heading", { name: "Efectivo al cerrar" })).toBeVisible();
    await expect(main.getByText("Sigue en la caja hasta la próxima apertura", { exact: false })).toBeVisible();
    await expect(main.getByRole("list", { name: "Últimos movimientos" })).toHaveCount(0);
  });

  test("una caja de otra empresa responde como inexistente", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    const r = await page.goto("/admin/cajas/no-existe");
    expect(r?.status()).toBe(404);
  });

  test("PuntoCash la consulta desde la ficha de la sede, sin retirar ni reactivar", async ({ page }) => {
    await signInAsSuperAdmin(page);
    await page.goto("/super-admin/sedes/sede-vedado");
    await visible(page, "Caja 01").click();
    await page.waitForURL(/\/super-admin\/sedes\/sede-vedado\/cajas\//);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Efectivo ahora" })).toBeVisible();
    await expect(main.getByRole("button", { name: /Retirar|Reactivar/ })).toHaveCount(0);
    await main.getByRole("link", { name: "Ver la jornada" }).click();
    await page.waitForURL(/\/super-admin\/jornadas\/J-/);
  });
});
