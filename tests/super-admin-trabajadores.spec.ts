import { expect, test } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Trabajadores de la red — solo lectura.
 *
 * Sonia Perdomo (Camagüey, Oriente Divisas) sirve de caso bloqueado: su
 * operador está suspendido en la siembra. Juan Pérez (Vedado) sirve de caso
 * normal, con jornadas. Ninguna prueba escribe.
 */

test.beforeEach(async ({ page }) => {
  await signInAsSuperAdmin(page);
  await page.goto("/super-admin/trabajadores");
});

test("cada trabajador trae su sede y su operador, y se enlazan", async ({ page }) => {
  const tabla = page.getByRole("table");
  const fila = tabla.getByRole("row").filter({ hasText: "Juan Pérez" });
  await expect(fila).toHaveCount(1);
  await expect(fila.getByRole("link", { name: "PuntoCash Vedado" })).toBeVisible();
  await expect(fila.getByRole("link", { name: "Malecón Servicios Financieros S.R.L." })).toBeVisible();
  /* El correo va enmascarado, igual que en la consola del mercante. */
  await expect(fila.getByText(/^j.+@puntocash\.com$/)).toBeVisible();
});

test("el bloqueo que puso PuntoCash se distingue de una baja de su administrador", async ({ page }) => {
  const tabla = page.getByRole("table");
  await expect(tabla.getByRole("row").filter({ hasText: "Sonia Perdomo" }).getByText("Operador suspendido")).toBeVisible();

  await page.getByLabel("Estado").selectOption("desactivado");
  await expect(tabla.getByRole("row").filter({ hasText: "Sonia Perdomo" })).toHaveCount(0);

  await page.getByLabel("Estado").selectOption("activo");
  await expect(tabla.getByRole("row").filter({ hasText: "Sonia Perdomo" })).toHaveCount(0);
  await expect(tabla.getByRole("row").filter({ hasText: "Juan Pérez" })).toHaveCount(1);
});

test("la ficha explica por qué no puede entrar y dice quién lo resuelve", async ({ page }) => {
  await page.getByRole("link", { name: "Sonia Perdomo" }).first().click();
  await page.waitForURL(/\/super-admin\/trabajadores\/.+/);

  await expect(page.getByText("No puede entrar · Operador suspendido")).toBeVisible();
  await expect(page.getByText(/la suspensión alcanza a los trabajadores de todas sus sedes/)).toBeVisible();
  await expect(page.getByText(/el recurso de PuntoCash es suspender su sede o a su operador/)).toBeVisible();
});

test("la ficha no ofrece editar, desactivar ni asistir el acceso", async ({ page }) => {
  await page.getByRole("link", { name: "Juan Pérez" }).first().click();
  await page.waitForURL(/\/super-admin\/trabajadores\/.+/);

  const main = page.getByRole("main");
  for (const nombre of [/Editar/i, /Desactivar/i, /Reactivar/i, /Regenerar/i, /asistencia/i]) {
    await expect(main.getByRole("button", { name: nombre })).toHaveCount(0);
    await expect(main.getByRole("link", { name: nombre })).toHaveCount(0);
  }
});

test("la ficha lleva a su sede, a su operador y a sus jornadas", async ({ page }) => {
  await page.getByRole("link", { name: "Juan Pérez" }).first().click();
  await page.waitForURL(/\/super-admin\/trabajadores\/.+/);

  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "PuntoCash Vedado" }).first()).toBeVisible();
  await expect(main.getByRole("link", { name: "Malecón Servicios Financieros S.R.L." })).toBeVisible();
  await expect(main.getByText(/Ha operado en/)).toBeVisible();
  await expect(main.getByRole("heading", { name: "Sedes en las que ha trabajado" })).toBeVisible();
});

for (const width of [1024, 768, 390]) {
  test(`a ${width}px el listado y la ficha no desbordan`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const ruta of ["/super-admin/trabajadores", "/super-admin/trabajadores/trb-1"]) {
      await page.goto(ruta);
      await expect(page.getByRole("main")).toBeVisible();
      await sinDesbordamientoHorizontal(page, ruta);
    }
  });
}
