import { expect, test } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Aprobaciones de PuntoCash (FR-SA-APR): las diferencias que quedaron
 * pendientes al traspasar Miramar no las ve ni Atlántico ni Caribe, y las
 * resuelve PuntoCash. La prueba resuelve una (la siembra deja varias).
 */

test.beforeEach(async ({ page }) => {
  await signInAsSuperAdmin(page);
});

test("Inicio y el menú avisan, y PuntoCash resuelve una con motivo", async ({ page }) => {
  await expect(page.getByRole("main").getByText(/no tienen? quien las? resuelva/)).toBeVisible();
  await page.goto("/super-admin/aprobaciones");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Pendientes" })).toBeVisible();
  const enlace = main.getByRole("link", { name: /^Ver la diferencia de / }).first();
  await expect(enlace).toBeVisible();
  await page.goto((await enlace.getAttribute("href"))!);

  await expect(page.getByRole("main").getByText(/Se registró cuando la sede era de Atlántico Casas de Cambio/)).toBeVisible();
  await page.getByRole("button", { name: "Aprobar" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText(/PuntoCash asume esta diferencia/)).toBeVisible();
  await dialogo.getByLabel(/^Tu motivo/).fill("Revisado con Atlántico antes del traspaso");
  await dialogo.getByRole("button", { name: "Aprobar" }).click();
  await expect(page.getByText("Diferencia aprobada")).toBeVisible();
  await expect(page.getByRole("main").getByText(/· PuntoCash$/)).toBeVisible();
});

test("una diferencia que su mercante sí ve no se abre aquí", async ({ page }) => {
  const r = await page.goto("/super-admin/aprobaciones/SOL-no-existe");
  expect(r?.status()).toBe(404);
});

for (const width of [1280, 768, 390]) {
  test(`a ${width}px la lista no desborda`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/super-admin/aprobaciones");
    await sinDesbordamientoHorizontal(page, "Aprobaciones");
  });
}
