import { test, expect, type Page } from "@playwright/test";

import { MARTA, signInAsAdmin } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Las alertas de caja vistas por la administración: en Inicio, en la ficha de
 * la caja con sus cifras, y las reglas de cada sede en su ficha, donde el
 * administrador las define.
 */
/**
 * La primera caja con alertas activas según la sección Alertas. Los datos de
 * ejemplo se generan según la hora del día, así que no se fija cuál es.
 */
async function primeraCajaConAlertas(page: Page): Promise<{ href: string; registerId: string; nombre: string }> {
  await page.goto("/admin/alertas");
  const enlace = page.getByRole("main").getByRole("list", { name: "Alertas activas" }).getByRole("link").first();
  await expect(enlace, "los datos de ejemplo deberían tener alguna caja con alertas").toBeVisible();
  const href = (await enlace.getAttribute("href"))!;
  const nombre = (await enlace.getAttribute("aria-label"))!.replace(/^Ver la caja /, "");
  return { href, registerId: decodeURIComponent(href.replace("/admin/cajas/", "")), nombre };
}

test.describe("Alertas de caja · Admin", () => {
  test("Inicio las trae por caja y lleva a la ficha, donde se ven con cifras", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    const caja = await primeraCajaConAlertas(page);
    await page.goto("/admin/inicio");
    const entrada = page.getByRole("main").getByText(new RegExp(`^${caja.nombre}( tiene \\d+ alertas|: )`));
    await expect(entrada).toHaveCount(1);
    /* La moneda sigue en mayúsculas aunque el título empiece en minúscula. */
    await expect(page.getByRole("main").getByText(/: (efectivo|quedan) .* [a-z]{3}$/)).toHaveCount(0);

    await page.goto(caja.href);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Alertas", exact: true })).toBeVisible();
    const activas = main.getByRole("list", { name: "Alertas activas" });
    await expect(activas).toContainText(/Hay .*, el (mínimo|máximo) es/);
    await expect(activas).toContainText("Activa");
  });

  test("una caja sin alertas lo dice", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/cajas/sede-habana-vieja%3Acaja-03");
    await expect(page.getByRole("main").getByText("Sin jornada abierta no hay alertas")).toBeVisible();
  });

  test("las alertas se definen en la sección Alertas y la ficha de la sede las consulta", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    /* La ficha de la sede las enseña, pero no se definen ahí. */
    await page.goto("/admin/sedes/sede-habana-vieja");
    const ficha = page.getByRole("main");
    await expect(ficha.getByRole("heading", { name: "Alertas de caja" })).toBeVisible();
    await expect(ficha.getByRole("list", { name: "Alertas definidas" })).toContainText("USD");
    await expect(ficha.getByRole("link", { name: "Configurar alertas" })).toHaveCount(0);

    await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Alertas" }).click();
    await page.waitForURL(/\/admin\/alertas$/);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Reglas por sede" })).toBeVisible();
    await expect(main.getByRole("list", { name: "Reglas de PuntoCash Obispo" })).toContainText("USD");
    await main.getByRole("link", { name: "Definir las alertas de PuntoCash Obispo" }).click();
    await expect(page.getByRole("heading", { name: "Alertas de caja", level: 1 })).toBeVisible();

    const minimoAntes = await page.getByLabel("Efectivo mínimo").first().inputValue();
    const maximoAntes = await page.getByLabel("Efectivo máximo").first().inputValue();

    /* Un mínimo por encima del máximo no se guarda. */
    await page.getByLabel("Efectivo mínimo").first().fill("900");
    await page.getByLabel("Efectivo máximo").first().fill("100");
    await page.getByRole("button", { name: "Guardar alertas" }).click();
    await expect(page.getByText("el mínimo no puede ser mayor que el máximo")).toBeVisible();

    await page.getByLabel("Efectivo mínimo").first().fill("650");
    await page.getByLabel("Efectivo máximo").first().fill("5000");
    await page.getByRole("button", { name: "Guardar alertas" }).click();
    await page.waitForURL(/\/admin\/alertas\?guardado=1/);
    await expect(page.getByText("Alertas guardadas")).toBeVisible();
    await expect(page.getByRole("list", { name: "Reglas de PuntoCash Obispo" })).toContainText("Mínimo 650,00");

    /* Se deja como estaba para el resto de pruebas. */
    await page.goto("/admin/alertas/sede-habana-vieja");
    await page.getByLabel("Efectivo mínimo").first().fill(minimoAntes);
    await page.getByLabel("Efectivo máximo").first().fill(maximoAntes);
    await page.getByRole("button", { name: "Guardar alertas" }).click();
    await page.waitForURL(/guardado=1/);
  });

  test("Alertas enseña las activas con cifras y lleva a la caja", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/alertas");
    const activas = page.getByRole("main").getByRole("list", { name: "Alertas activas" });
    await expect(activas).toContainText(/Hay .*, el (mínimo|máximo) es/);
    await activas.getByRole("link").first().click();
    await page.waitForURL(/\/admin\/cajas\//);
  });

  test("Super Admin consulta las alertas de una caja, sin poder cambiarlas", async ({ page, browser }) => {
    const admin = await browser.newPage();
    await signInAsAdmin(admin, MARTA);
    const caja = await primeraCajaConAlertas(admin);
    await admin.close();
    await signInAsSuperAdmin(page);
    const sede = caja.registerId.split(":")[0];
    await page.goto(`/super-admin/sedes/${sede}/cajas/${encodeURIComponent(caja.registerId)}`);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Alertas", exact: true })).toBeVisible();
    await expect(main.getByRole("list", { name: "Alertas activas" })).toContainText(/Hay .*, el (mínimo|máximo) es/);
    await expect(main.getByRole("link", { name: /Configurar|Definir/ })).toHaveCount(0);
  });

  for (const ancho of [390, 768, 1280]) {
    test(`las pantallas de alertas no desbordan a ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await signInAsAdmin(page, MARTA);
      for (const ruta of ["/admin/alertas", "/admin/alertas/sede-habana-vieja", "/admin/sedes/sede-habana-vieja", "/admin/cajas/sede-vedado%3Acaja-01", "/admin/inicio"]) {
        await page.goto(ruta);
        await expect(page.getByRole("main")).toBeVisible();
        const desborda = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(desborda, `${ruta} desborda a ${ancho}px`).toBe(false);
      }
    });
  }
});
