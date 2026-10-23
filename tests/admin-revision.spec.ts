import { test, expect } from "@playwright/test";

import { ADMIN_PASSWORD, ANA, MARTA, signInAsAdmin, submitCredentials } from "./admin-helpers";

/**
 * Lo que fijó la revisión completa de `/admin` (20/10/2026): comportamientos
 * transversales que no pertenecen a una sola sección.
 */

test.describe("revisión de /admin", () => {
  test("al cambiar de sede se conservan el periodo y los filtros generales, no la caja ni el trabajador", async ({
    page,
  }) => {
    /* FR-AD-SCOPE-5. */
    await signInAsAdmin(page, MARTA);
    const hoy = new Date().toISOString().slice(0, 10);
    await page.goto(`/admin/jornadas?desde=${hoy}&hasta=${hoy}&estado=cerrada&caja=sede-vedado:caja-01&trabajador=x`);
    await expect(page.getByRole("main")).toBeVisible();

    await page.locator("#admin-scope").selectOption("sede-habana-vieja");
    await page.waitForURL((url) => url.searchParams.has("estado") && !url.searchParams.has("caja"));
    const url = new URL(page.url());
    expect(url.pathname).toBe("/admin/jornadas");
    expect(url.searchParams.get("desde")).toBe(hoy);
    expect(url.searchParams.get("estado")).toBe("cerrada");
    expect(url.searchParams.has("trabajador")).toBe(false);
  });

  test("una dirección que no existe dentro de la consola responde 404 con el shell", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    const respuesta = await page.goto("/admin/esto-no-existe");
    expect(respuesta?.status()).toBe(404);
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
  });

  test("el código de verificación se puede pegar con espacios", async ({ page }) => {
    await page.goto("/admin/login");
    await submitCredentials(page, MARTA, ADMIN_PASSWORD);
    await page.waitForURL(/\/admin\/verificacion$/);
    await page.getByLabel("Código de verificación").fill("123 456");
    await page.waitForURL(/\/admin\/inicio$/);
  });

  test("Inicio avisa de una sede con Cambio y sin tasas, y con una sede elegida muestra sus cajas", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    const main = page.getByRole("main");
    await expect(main.getByText("PuntoCash Cerro ofrece Cambio de moneda y no tiene ninguna tasa")).toBeVisible();
    await expect(main.getByRole("link", { name: "Fijar las tasas" })).toHaveAttribute("href", "/admin/tasas/sede-cerro");

    /* FR-AD-HOME-7. */
    await page.locator("#admin-scope").selectOption("sede-vedado");
    await expect(main.getByRole("heading", { name: "Cajas y equipos de PuntoCash Vedado" })).toBeVisible();
  });

  test("una fecha imposible en Reportes no rompe la pantalla", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    const respuesta = await page.goto("/admin/reportes?desde=2026-02-31&hasta=2026-13-01");
    expect(respuesta?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Reportes" })).toBeVisible();
  });

  test("el aviso de Usuarios se cierra y no vuelve", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/usuarios");
    const aviso = page.getByText("Esta pantalla es solo tuya");
    await expect(aviso).toBeVisible();
    await page.getByRole("button", { name: "Cerrar este aviso" }).click();
    await expect(aviso).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Usuarios" }).first()).toBeVisible();
    await expect(aviso).toHaveCount(0);
  });
});

test.describe("los casos de atención de Bahía", () => {
  test("una sede suspendida se ve como tal, y su trabajador no puede entrar", async ({ page }) => {
    await signInAsAdmin(page, ANA);
    await page.goto("/admin/sedes/sede-trinidad");
    await expect(page.getByText("PuntoCash suspendió esta sede")).toBeVisible();
    await page.goto("/admin/trabajadores");
    await page.getByRole("link", { name: "Raúl León" }).first().click();
    await expect(page.getByRole("main").getByText(/PuntoCash Trinidad está suspendida/)).toBeVisible();
  });

  test("una sede con solo cajas retiradas y sin monedas lo avisa", async ({ page }) => {
    await signInAsAdmin(page, ANA);
    const main = page.getByRole("main");
    await expect(main.getByText("PuntoCash Pinar del Río no tiene ninguna caja activa")).toBeVisible();
    await page.goto("/admin/cajas");
    await expect(main.getByText("Esta sede no tiene ninguna caja activa")).toBeVisible();
  });

  test("una tasa sin rango de PuntoCash se marca con su razón", async ({ page }) => {
    await signInAsAdmin(page, ANA);
    await page.goto("/admin/tasas");
    await expect(page.getByRole("main").getByRole("cell", { name: "Sin rango de PuntoCash" })).toBeVisible();
  });
});
