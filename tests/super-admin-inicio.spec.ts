import { expect, test } from "@playwright/test";

import { ADMIN_PASSWORD, sinDesbordamientoHorizontal, submitCredentials } from "./admin-helpers";
import { RAUL, signInAsSuperAdmin, submitSuperAdminCredentials } from "./super-admin-helpers";

/**
 * Consola de PuntoCash, tramo 1: acceso, shell e Inicio.
 */

test.describe("acceso", () => {
  test("una cuenta desactivada no entra y se le dice lo mismo que a una contraseña equivocada", async ({ page }) => {
    await page.goto("/super-admin/login");
    await submitSuperAdminCredentials(page, RAUL, ADMIN_PASSWORD);
    await expect(page.getByRole("alert").filter({ hasText: "Credenciales incorrectas" })).toBeVisible();
    await expect(page).toHaveURL(/\/super-admin\/login$/);
  });

  test("sin sesión, la consola devuelve al acceso", async ({ page }) => {
    await page.goto("/super-admin/inicio");
    await expect(page).toHaveURL(/\/super-admin\/login$/);
  });

  test("una sesión de administrador de sede no abre la consola de PuntoCash", async ({ page }) => {
    await page.goto("/admin/login");
    await submitCredentials(page, "marta@malecon-sf.cu", ADMIN_PASSWORD);
    await page.waitForURL(/\/admin\/verificacion$/);
    await page.getByLabel("Código de verificación").fill("123456");
    await page.waitForURL(/\/admin\/inicio$/);

    await page.goto("/super-admin/inicio");
    await expect(page).toHaveURL(/\/super-admin\/login$/);
  });
});

test.describe("shell", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsSuperAdmin(page);
  });

  test("la cabecera lleva el distintivo de la consola y la persona, sin selector de sede", async ({ page }) => {
    const cabecera = page.getByRole("banner");
    await expect(cabecera.getByText("Super administración")).toBeVisible();
    await expect(cabecera.getByText("Elena Marrero Fonseca")).toBeVisible();
    await expect(cabecera.getByRole("combobox")).toHaveCount(0);
  });

  test("la barra lateral separa lo que se decide de lo que se consulta", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    for (const grupo of ["Red", "Límites", "Consulta"]) await expect(nav.getByText(grupo, { exact: true })).toBeVisible();
    /* Un número, no «1»: otras suites revocan sedes de prueba en el mismo servidor. */
    await expect(nav.getByRole("link", { name: /Sedes/ })).toContainText(/\d/);
  });

  test("una dirección inexistente responde dentro del shell", async ({ page }) => {
    await page.goto("/super-admin/no-existe");
    await expect(page.getByRole("heading", { name: "No encontramos lo que buscabas" })).toBeVisible();
  });

  test("cerrar sesión devuelve al acceso", async ({ page }) => {
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/super-admin\/login$/);
    await page.goto("/super-admin/inicio");
    await expect(page).toHaveURL(/\/super-admin\/login$/);
  });
});

test.describe("inicio", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsSuperAdmin(page);
  });

  test("señala solo lo que PuntoCash puede resolver", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByText("PuntoCash Santiago no tiene operador")).toBeVisible();
    await expect(main.getByRole("link", { name: "Asignar un operador" })).toHaveAttribute("href", "/super-admin/sedes/sede-santiago");
    await expect(main.getByText("Cienfuegos Cambio S.R.L. no tiene ninguna sede")).toBeVisible();
    await expect(main.getByText("2 sedes tienen el CAD en su lista y no pueden cotizarlo")).toBeVisible();
  });

  test("no muestra la gestión interna de cada operador", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Lo que resuelve cada operador" })).toHaveCount(0);
    await expect(main.getByText(/días asignada y no tiene ninguna caja/)).toHaveCount(0);
    await expect(main.getByText(/sin equipo vinculado/)).toHaveCount(0);
  });

  test("la tabla registra la actividad de cada sede: operaciones de hoy y la última operación", async ({ page }) => {
    const tabla = page.getByRole("table");
    await expect(tabla.getByRole("columnheader", { name: /Operaciones hoy/ })).toBeVisible();
    await expect(tabla.getByRole("columnheader", { name: /Última operación/ })).toBeVisible();
    await expect(tabla.getByRole("columnheader", { name: /Cajas abiertas|Asuntos/ })).toHaveCount(0);
    const santiago = tabla.getByRole("row").filter({ hasText: "PuntoCash Santiago" });
    await expect(santiago.getByText("Sin operaciones")).toBeVisible();
  });

  test("la tabla filtra por operador y la sede sin operador se distingue", async ({ page }) => {
    /* Sin contar el total: otras suites crean sedes en el mismo servidor. */
    const tabla = page.getByRole("table");
    await page.getByLabel("Operador").selectOption({ label: "Sedes sin operador" });
    await expect(tabla.getByRole("row").filter({ hasText: "PuntoCash Santiago" })).toBeVisible();
    await expect(tabla.getByRole("row").filter({ hasText: "PuntoCash Vedado" })).toHaveCount(0);
    await expect(tabla.getByText("Sin operador").first()).toBeVisible();
    await expect(page).toHaveURL(/operador=sin-operador/);
  });

  test("una sede cuyo operador está suspendido no se presenta como activa", async ({ page }) => {
    await page.getByLabel("Operador").selectOption({ label: "Oriente Divisas" });
    await expect(page.getByRole("table").getByText("Operador suspendido")).toHaveCount(2);
  });
});

for (const ancho of [1024, 768]) {
  test.describe(`en una tableta de ${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: 1024 } });

    test("Inicio no desborda y la red se lee en tarjetas, no en una tabla recortada", async ({ page }) => {
      await signInAsSuperAdmin(page);
      await sinDesbordamientoHorizontal(page, "Inicio");
      await expect(page.getByRole("table")).toBeHidden();
      await expect(page.getByLabel("Ordenar por")).toBeVisible();
    });
  });
}

test.describe("en un teléfono", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Inicio no desborda y la navegación baja a la barra inferior", async ({ page }) => {
    await signInAsSuperAdmin(page);
    await sinDesbordamientoHorizontal(page, "Inicio");
    await expect(page.getByRole("navigation", { name: "Navegación rápida" }).getByRole("link", { name: /Sedes/ })).toBeVisible();
  });
});
