import { test, expect } from "@playwright/test";

import { MARTA, signInAsAdmin } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Las alertas de caja vistas por la administración: en Inicio, en la ficha de
 * la caja con sus cifras, y las reglas de cada sede en su ficha, donde el
 * administrador las define.
 */
test.describe("Alertas de caja · Admin", () => {
  test("Inicio las trae por caja y lleva a la ficha, donde se ven con cifras", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/inicio");
    const atencion = page.getByRole("main");
    await expect(atencion.getByText("Caja 02 de PuntoCash Vedado tiene 3 alertas")).toBeVisible();
    await expect(atencion.getByText(/Efectivo bajo en USD/).first()).toBeVisible();

    await page.goto("/admin/cajas/sede-vedado%3Acaja-02");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Alertas", exact: true })).toBeVisible();
    const activas = main.getByRole("list", { name: "Alertas activas" });
    await expect(activas).toContainText("Efectivo bajo en USD");
    await expect(activas).toContainText("el mínimo es 400,00");
    await expect(activas).toContainText("Activa");
  });

  test("una caja sin alertas lo dice", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/cajas/sede-habana-vieja%3Acaja-03");
    await expect(page.getByRole("main").getByText("Sin jornada abierta no hay alertas")).toBeVisible();
  });

  test("el administrador define las alertas de su sede y la ficha las enseña", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/sedes/sede-habana-vieja");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Alertas de caja" })).toBeVisible();
    await expect(main.getByRole("list", { name: "Alertas definidas" })).toContainText("USD");

    await main.getByRole("link", { name: "Configurar alertas" }).click();
    await expect(page.getByRole("heading", { name: "Alertas de caja", level: 1 })).toBeVisible();

    /* Un mínimo por encima del máximo no se guarda. */
    await page.getByLabel("Efectivo mínimo").first().fill("900");
    await page.getByLabel("Efectivo máximo").first().fill("100");
    await page.getByRole("button", { name: "Guardar alertas" }).click();
    await expect(page.getByText("el mínimo no puede ser mayor que el máximo")).toBeVisible();

    await page.getByLabel("Efectivo mínimo").first().fill("650");
    await page.getByLabel("Efectivo máximo").first().fill("5000");
    await page.getByRole("button", { name: "Guardar alertas" }).click();
    await page.waitForURL(/\/admin\/sedes\/sede-habana-vieja\?alertas=1/);
    await expect(page.getByText("Alertas guardadas")).toBeVisible();
    await expect(page.getByRole("list", { name: "Alertas definidas" })).toContainText("Mínimo 650,00");

    /* Se deja como estaba para el resto de pruebas. */
    await page.goto("/admin/sedes/sede-habana-vieja/alertas");
    await page.getByLabel("Efectivo mínimo").first().fill("600");
    await page.getByRole("button", { name: "Guardar alertas" }).click();
    await page.waitForURL(/alertas=1/);
  });

  test("Super Admin consulta las alertas de una caja, sin poder cambiarlas", async ({ page }) => {
    await signInAsSuperAdmin(page);
    await page.goto("/super-admin/sedes/sede-vedado/cajas/sede-vedado%3Acaja-02");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Alertas", exact: true })).toBeVisible();
    await expect(main.getByRole("list", { name: "Alertas activas" })).toContainText("Efectivo bajo en USD");
    await expect(main.getByRole("link", { name: "Configurar alertas" })).toHaveCount(0);
  });

  for (const ancho of [390, 768, 1280]) {
    test(`las pantallas de alertas no desbordan a ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await signInAsAdmin(page, MARTA);
      for (const ruta of ["/admin/sedes/sede-habana-vieja/alertas", "/admin/sedes/sede-habana-vieja", "/admin/cajas/sede-vedado%3Acaja-02", "/admin/inicio"]) {
        await page.goto(ruta);
        await expect(page.getByRole("main")).toBeVisible();
        const desborda = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(desborda, `${ruta} desborda a ${ancho}px`).toBe(false);
      }
    });
  }
});
