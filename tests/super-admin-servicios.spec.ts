import { expect, test, type Page } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Servicios en Super administración.
 *
 * Los cambios se hacen sobre PuntoCash Santiago —sin operador, y que ninguna
 * prueba de Admin ni de Worker usa— y se deshacen al terminar.
 */

const celda = (page: Page, servicio: string) =>
  page.getByRole("button", { name: new RegExp(`^${servicio} en PuntoCash Santiago:`) });

async function deshabilitar(page: Page, servicio: string): Promise<void> {
  await celda(page, servicio).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel(/^Motivo\*?$/).fill("Prueba automática de servicios");
  await dialogo.getByRole("button", { name: "Deshabilitar" }).click();
  await expect(page.getByText(`${servicio} deshabilitado en PuntoCash Santiago.`)).toBeVisible();
}

async function habilitar(page: Page, servicio: string): Promise<void> {
  await celda(page, servicio).click();
  await page.getByRole("dialog").getByRole("button", { name: "Habilitar" }).click();
  await expect(page.getByText(`${servicio} habilitado en PuntoCash Santiago.`)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await signInAsSuperAdmin(page);
  await page.goto("/super-admin/servicios");
});

test("la matriz tiene los tres servicios disponibles y nombra los que llegarán", async ({ page }) => {
  const tabla = page.getByRole("table");
  for (const s of ["Cambio de moneda", "Remesas", "Giros"]) {
    await expect(tabla.getByRole("columnheader", { name: new RegExp(s) })).toBeVisible();
  }
  await expect(page.getByText("Llegarán más adelante:")).toBeVisible();
});

test("filtra por las sedes sin operador", async ({ page }) => {
  await page.getByLabel("Operador").selectOption({ label: "Sin operador asignado" });
  const filas = page.getByRole("table").getByRole("row");
  await expect(filas.filter({ hasText: "PuntoCash Santiago" })).toBeVisible();
  await expect(filas.filter({ hasText: "PuntoCash Vedado" })).toHaveCount(0);
  await expect(page).toHaveURL(/operador=sin-operador/);
});

test("quitar pide motivo, y el último servicio de una sede activa no se quita", async ({ page }) => {
  await celda(page, "Giros").click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("button", { name: "Deshabilitar" }).click();
  await expect(dialogo.getByText(/Escribe el motivo/)).toBeVisible();
  await dialogo.getByRole("button", { name: "Cancelar" }).click();

  await deshabilitar(page, "Giros");
  await deshabilitar(page, "Remesas");
  await celda(page, "Cambio de moneda").click();
  await expect(page.getByRole("dialog").getByText("Es el único servicio de esta sede")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Entendido" }).click();

  await habilitar(page, "Remesas");
  await habilitar(page, "Giros");
});

for (const ancho of [1024, 768, 390]) {
  test.describe(`a ${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: 900 } });
    test("la matriz no desborda", async ({ page }) => {
      await sinDesbordamientoHorizontal(page, "Servicios");
    });
  });
}
