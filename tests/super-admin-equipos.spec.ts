import { expect, test } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Cajas y equipos de la red — solo lectura.
 *
 * No escribe nada: todas las comprobaciones son de navegación y congruencia.
 * Las cuentas se comprueban con filtros, no con números absolutos, porque el
 * inventario depende de las siembras de otras suites.
 */

test.beforeEach(async ({ page }) => {
  await signInAsSuperAdmin(page);
  await page.goto("/super-admin/equipos");
});

test("la pestaña de cajas dice de qué sede y de qué operador es cada una", async ({ page }) => {
  const tabla = page.getByRole("table");
  for (const columna of ["Caja", "Operador", "Estado", "Equipo", "Jornada", "Última actividad"]) {
    await expect(tabla.getByRole("columnheader", { name: columna, exact: true })).toBeVisible();
  }
  /* Una caja montada de verdad: la 03 del Vedado tiene equipo y jornadas. */
  const fila = tabla.getByRole("row").filter({ hasText: "CAJ-0001-0003" });
  await expect(fila).toHaveCount(1);
  await expect(fila.getByRole("link", { name: "PuntoCash Vedado" })).toBeVisible();
  await expect(fila.getByRole("link", { name: "Malecón Servicios Financieros S.R.L." })).toBeVisible();
});

test("las sedes sin ninguna caja se anuncian aparte y llevan al listado de Sedes", async ({ page }) => {
  const aviso = page.getByRole("main").locator("div").filter({ hasText: /no tienen? ninguna caja y no aparecen? en esta tabla/ }).first();
  await expect(aviso).toBeVisible();
  await page.getByRole("link", { name: "Verlas en Sedes" }).click();
  await page.waitForURL(/\/super-admin\/sedes\?.*sinCajas=1/);
  /* El listado de Sedes llega con su conmutador puesto. */
  await expect(page.getByLabel("Sin cajas")).toBeChecked();
});

test("las retiradas no salen hasta que se piden, y entonces dicen cuándo y por qué", async ({ page }) => {
  const tabla = page.getByRole("table");
  await expect(tabla.getByRole("cell", { name: /^Retirada/ })).toHaveCount(0);

  await page.getByLabel("Mostrar también las retiradas").check();
  const retiradas = tabla.getByRole("cell", { name: /^Retirada/ });
  await expect(retiradas.first()).toBeVisible();
  await expect(retiradas.first()).toContainText(/el \d/);
});

test("el filtro de vínculo aísla las cajas sin equipo", async ({ page }) => {
  const tabla = page.getByRole("table");
  await page.getByLabel("Vínculo").selectOption("sin");
  await expect(tabla.getByRole("cell", { name: "Sin equipo", exact: true }).first()).toBeVisible();
  await expect(tabla.getByRole("cell", { name: /^CAJ-/ })).toHaveCount(0);

  await page.getByLabel("Vínculo").selectOption("con");
  await expect(tabla.getByRole("cell", { name: /^CAJ-/ }).first()).toBeVisible();
  await expect(tabla.getByRole("cell", { name: "Sin equipo", exact: true })).toHaveCount(0);
});

test("no hay forma de crear una caja ni de vincular un equipo desde aquí", async ({ page }) => {
  const main = page.getByRole("main");
  await expect(main.getByText(/Las cajas las crea el administrador de cada sede/)).toBeVisible();
  for (const nombre of [/Nueva caja/i, /Vincular/i, /Retirar/i, /Desvincular/i]) {
    await expect(main.getByRole("button", { name: nombre })).toHaveCount(0);
    await expect(main.getByRole("link", { name: nombre })).toHaveCount(0);
  }
});

test("los kioscos cuentan lo que generan, y se dice que las pantallas no se inventarían", async ({ page }) => {
  await page.getByRole("link", { name: /^Kioscos de autoservicio/ }).click();
  await page.waitForURL(/pestana=kioscos/);

  await expect(page.getByText("Las pantallas informativas no se inventarían aquí")).toBeVisible();
  const tabla = page.getByRole("table");
  await expect(tabla.getByRole("columnheader", { name: /^Operaciones \(30 días\)$/ })).toBeVisible();
  const fila = tabla.getByRole("row").filter({ hasText: "KIO-0001-0001" });
  await expect(fila).toHaveCount(1);
  await expect(fila.getByRole("link", { name: "PuntoCash Vedado" })).toBeVisible();
});

for (const width of [1024, 768, 390]) {
  test(`a ${width}px las dos pestañas no desbordan`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const ruta of ["/super-admin/equipos", "/super-admin/equipos?pestana=kioscos"]) {
      await page.goto(ruta);
      await expect(page.getByRole("main")).toBeVisible();
      await sinDesbordamientoHorizontal(page, ruta);
    }
  });
}
