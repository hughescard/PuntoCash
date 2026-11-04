import { expect, test, type Page } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Operaciones de la red — solo lectura.
 *
 * No se entra a ninguna operación por un código escrito a mano: la siembra se
 * mueve con el calendario y el código lleva la fecha. Se entra por la fila.
 */

async function abrirUnaOperacion(page: Page): Promise<void> {
  const enlace = page.getByRole("link", { name: /^Ver la operación / }).first();
  await expect(enlace).toBeVisible();
  /* Por su `href`: en la tarjeta del teléfono los enlaces de dentro se
     superponen al de la fila. */
  const href = await enlace.getAttribute("href");
  await page.goto(href!);
}

test.beforeEach(async ({ page }) => {
  await signInAsSuperAdmin(page);
  await page.goto("/super-admin/operaciones");
});

test("el listado trae el cliente con su documento, y la sede con su operador", async ({ page }) => {
  const tabla = page.getByRole("table");
  for (const columna of ["Operación", "Servicio", "Cliente", "Importe", "Sede y operador", "Trabajador"]) {
    await expect(tabla.getByRole("columnheader", { name: columna, exact: true })).toBeVisible();
  }
  /* El documento acompaña al nombre: un nombre solo no identifica a nadie. */
  await expect(tabla.getByRole("cell", { name: /\d{11}/ }).first()).toBeVisible();
  await expect(tabla.getByRole("link", { name: /^PuntoCash / }).first()).toBeVisible();
  /* Ni caja ni columna de estado: la caja es del mercante, y el estado va
     junto al código para dejarle sitio al cliente. */
  await expect(tabla.getByRole("columnheader", { name: /Caja/ })).toHaveCount(0);
  await expect(tabla.getByRole("columnheader", { name: "Estado", exact: true })).toHaveCount(0);
  await expect(tabla.getByRole("cell", { name: /^PC-/ }).first()).toContainText("Completada");
});

test("se busca por cliente y por documento", async ({ page }) => {
  const tabla = page.getByRole("table");
  await page.getByLabel("Buscar").fill("Yasmani");
  await expect(tabla.getByRole("cell", { name: /Yasmani/ }).first()).toBeVisible();

  await page.getByLabel("Buscar").fill("87051234567");
  await expect(tabla.getByRole("cell", { name: /Yasmani/ }).first()).toBeVisible();
});

test("filtrar por operador y por servicio acota el listado", async ({ page }) => {
  const tabla = page.getByRole("table");
  await page.getByLabel("Operador").selectOption({ label: "Caribe Cambios S.A." });
  await expect(tabla.getByRole("link", { name: "Malecón Servicios Financieros S.R.L." })).toHaveCount(0);

  await page.getByLabel("Servicio").selectOption("Remesa");
  await expect(tabla.getByRole("cell", { name: "Cambio de moneda" })).toHaveCount(0);
});

test("una operación anterior al traspaso de Miramar muestra a Atlántico, no a Caribe", async ({ page }) => {
  /* El traspaso fue el 30 de junio: el periodo tiene que llegar hasta antes. */
  await page.goto("/super-admin/operaciones?desde=2026-06-01");
  await page.getByLabel("Operador").selectOption({ label: "Atlántico Casas de Cambio" });
  const tabla = page.getByRole("table");
  const filas = tabla.getByRole("row").filter({ hasText: "PuntoCash Miramar" });
  await expect(filas.first()).toBeVisible();
  await expect(filas.first()).toContainText("Atlántico");
  await expect(tabla.getByRole("row").filter({ hasText: "Caribe Cambios" })).toHaveCount(0);
});

test("el detalle nombra al operador responsable y no ofrece ninguna acción", async ({ page }) => {
  await abrirUnaOperacion(page);
  const main = page.getByRole("main");
  await expect(main.getByText("Operador responsable")).toBeVisible();
  await expect(main.getByRole("heading", { name: "Contexto de la operación" })).toBeVisible();
  for (const nombre of [/Imprimir/i, /Comprobante/i, /Anular/i, /Corregir/i, /Editar/i]) {
    await expect(main.getByRole("button", { name: nombre })).toHaveCount(0);
    await expect(main.getByRole("link", { name: nombre })).toHaveCount(0);
  }
});

test("el detalle lleva a la sede, al trabajador y a la jornada", async ({ page }) => {
  await abrirUnaOperacion(page);
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: /^PuntoCash / }).first()).toBeVisible();
  /* Al contexto, no al detalle de Worker, que repite algunas etiquetas. */
  const contexto = main.locator("dl").first();
  await expect(contexto.getByText("Trabajador", { exact: true })).toBeVisible();
  await expect(contexto.getByText("Jornada", { exact: true })).toBeVisible();
  await expect(contexto.getByRole("link", { name: /^Caja / })).toBeVisible();
});

/* 1280 es el ancho de escritorio mínimo que soporta el producto y el más
   estrecho en el que el listado todavía es tabla: es donde aprieta. */
for (const width of [1280, 1024, 768, 390]) {
  test(`a ${width}px el listado y el detalle no desbordan`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await sinDesbordamientoHorizontal(page, "el listado");
    await abrirUnaOperacion(page);
    await sinDesbordamientoHorizontal(page, "el detalle");
  });
}
