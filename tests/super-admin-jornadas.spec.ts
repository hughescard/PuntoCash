import { expect, test, type Page } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Jornadas de la red — solo lectura, y por eso ninguna prueba escribe.
 *
 * La sección no estaba en el requisito: se añadió porque la jornada es la
 * unidad con la que PuntoCash concilia. Lo que estas pruebas fijan es
 * justamente eso: que el cierre se lea, que el operador aparezca, y que no
 * haya ni un control para forzar nada.
 */

test.beforeEach(async ({ page }) => {
  await signInAsSuperAdmin(page);
  await page.goto("/super-admin/jornadas");
});

test("cada jornada trae su operador y en qué quedó su cierre", async ({ page }) => {
  const tabla = page.getByRole("table");
  for (const columna of ["Caja y sede", "Operador", "Trabajador", "Jornada", "Estado", "Operaciones", "Cierre"]) {
    await expect(tabla.getByRole("columnheader", { name: columna, exact: true })).toBeVisible();
  }
  await expect(tabla.getByRole("cell", { name: "Cuadrada", exact: true }).first()).toBeVisible();
  await expect(tabla.getByRole("link", { name: "Malecón Servicios Financieros S.R.L." }).first()).toBeVisible();
});

test("filtrar por operador deja solo sus jornadas", async ({ page }) => {
  const tabla = page.getByRole("table");
  await page.getByLabel("Operador").selectOption({ label: "Caribe Cambios S.A." });
  await expect(tabla.getByRole("link", { name: "Caribe Cambios S.A." }).first()).toBeVisible();
  await expect(tabla.getByRole("link", { name: "Malecón Servicios Financieros S.R.L." })).toHaveCount(0);
});

test("un cierre forzado se señala en la lista y se explica en la jornada, sin ofrecer forzar nada", async ({ page }) => {
  await page.getByLabel("Estado").selectOption("forzada");
  const tabla = page.getByRole("table");
  const fila = tabla.getByRole("row").filter({ hasText: "Cierre forzado" }).first();
  await expect(fila).toBeVisible();
  await fila.click();
  await page.waitForURL(/\/super-admin\/jornadas\/.+/);

  const main = page.getByRole("main");
  await expect(main.getByText("Cierre forzado").first()).toBeVisible();
  await expect(main.getByText(/La cerró .+ el /)).toBeVisible();
  await expect(main.getByRole("button", { name: /Forzar/i })).toHaveCount(0);
});

test("la jornada muestra el libro de movimientos, con enlace a la operación y sin detalle del movimiento", async ({ page }) => {
  await abrirUnaJornadaCerrada(page);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Movimientos" })).toBeVisible();
  await expect(main.getByRole("link", { name: /^PC-/ }).first()).toBeVisible();
  /* El concepto no es enlace: esa pantalla es del mercante y aquí no existe. */
  await expect(main.getByRole("link", { name: "Fondeo inicial" })).toHaveCount(0);
});

test("la jornada dice de qué sede y de qué operador es, y no ofrece ninguna acción", async ({ page }) => {
  await abrirUnaJornadaCerrada(page);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "La jornada" })).toBeVisible();
  await expect(main.getByRole("link", { name: /^PuntoCash / }).first()).toBeVisible();
  await expect(main.getByRole("button", { name: /Forzar/i })).toHaveCount(0);
});

/* 1280 es el ancho de escritorio mínimo que soporta el producto y el más
   estrecho en el que el listado todavía es tabla: es donde aprieta. */
for (const width of [1280, 1024, 768, 390]) {
  test(`a ${width}px el listado y la jornada no desbordan`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await sinDesbordamientoHorizontal(page, "el listado");
    await abrirUnaJornadaCerrada(page);
    await sinDesbordamientoHorizontal(page, "la jornada");
  });
}

/**
 * Abre la primera jornada cerrada del periodo. No se entra por una dirección
 * fija: el identificador de una jornada lleva su fecha y la siembra se mueve
 * con el calendario, así que una ruta escrita a mano caduca al día siguiente.
 */
async function abrirUnaJornadaCerrada(page: Page): Promise<void> {
  if (!/\/super-admin\/jornadas(\?|$)/.test(page.url())) await page.goto("/super-admin/jornadas");
  await page.getByLabel("Estado").selectOption("cerrada");
  /* Por el enlace de la fila, no por la tabla: debajo de xl el listado son
     tarjetas y `getByRole("table")` no encontraría nada. */
  const enlace = page.getByRole("link", { name: /^Ver la jornada de / }).first();
  await expect(enlace).toBeVisible();
  /* Se navega por su `href` en vez de pulsarlo: en la tarjeta del teléfono
     los enlaces de dentro se superponen al de la fila. */
  const href = await enlace.getAttribute("href");
  await page.goto(href!);
}

test("una jornada de Miramar anterior al traspaso es de Atlántico, no de Caribe", async ({ page }) => {
  await page.goto("/super-admin/jornadas?desde=2026-06-01&operador=op-atlantico");
  const main = page.getByRole("main");
  const enlace = main.getByRole("link", { name: /^Ver la jornada de / }).first();
  await expect(enlace).toBeVisible();
  await expect(main.getByText(/^\d+ jornadas? en el periodo$/)).not.toHaveText(/^0 /);
  const href = await enlace.getAttribute("href");
  await page.goto(href!);
  const ficha = page.getByRole("main");
  await expect(ficha.getByText("PuntoCash Miramar").first()).toBeVisible();
  await expect(ficha.getByRole("link", { name: "Atlántico Casas de Cambio" }).first()).toBeVisible();
});
