import { expect, test, type Page } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Sedes en Super administración: listado y alta.
 *
 * El estado vive en memoria y lo comparten las demás suites, también las de
 * Admin, que cuentan las sedes de cada operador. Por eso las sedes de prueba
 * llevan un código único por ejecución, se asignan a Bahía Cambios —cuyas
 * pruebas miran sedes concretas por su nombre, no cuántas tiene— y **terminan
 * revocadas y cerradas**: al acabar, ningún operador tiene una sede de más.
 */

const codigoUnico = () => `T${Date.now().toString(36).slice(-6).toUpperCase()}`;

/** Deja la sede de prueba como si no hubiera existido para los operadores. */
async function revocarYCerrar(page: Page, sedeId: string): Promise<void> {
  await page.goto(`/super-admin/sedes/${sedeId}`);
  let dialogo = page.getByRole("dialog");
  if (await page.getByRole("button", { name: "Revocar" }).count()) {
    await page.getByRole("button", { name: "Revocar" }).click();
    await dialogo.getByLabel(/^Motivo\*?$/).fill("Fin de la prueba automática");
    await dialogo.getByRole("button", { name: "Revocar" }).click();
    await expect(page.getByText("Asignación revocada")).toBeVisible();
  }
  await page.getByRole("button", { name: "Cerrar la sede" }).click();
  dialogo = page.getByRole("dialog");
  await dialogo.getByLabel(/^Motivo\*?$/).fill("Fin de la prueba automática");
  await dialogo.getByRole("button", { name: "Cerrar la sede" }).click();
  await expect(page.getByText("Sede cerrada", { exact: true })).toBeVisible();
}

async function rellenarDatos(page: Page, codigo: string, nombre: string): Promise<void> {
  await page.getByLabel(/^Código\*?$/).fill(codigo);
  await page.getByLabel(/^Nombre\*?$/).fill(nombre);
  await page.getByLabel(/^Dirección\*?$/).fill("Calle 100 n.º 5, entre 1.ª y 3.ª");
  await page.getByLabel(/^Provincia\*?$/).selectOption("La Habana");
  await page.getByLabel(/^Municipio\*?$/).fill("Marianao");
  await page.getByLabel(/^Teléfono\*?$/).fill("+53 7 260 1111");
}

test.describe("listado de sedes", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsSuperAdmin(page);
    await page.goto("/super-admin/sedes");
  });

  test("muestra cada sede con su estado, operador, cajas y trabajadores", async ({ page }) => {
    const tabla = page.getByRole("table");
    for (const cabecera of ["Sede", "Estado", "Operador", "Cajas", "Trabajadores"]) {
      await expect(tabla.getByRole("columnheader", { name: cabecera, exact: true })).toBeVisible();
    }
    const vedado = tabla.getByRole("row").filter({ hasText: "PuntoCash Vedado" });
    await expect(vedado.getByText("Malecón Servicios Financieros S.R.L.")).toBeVisible();
    await expect(vedado.getByText(/desde el/)).toBeVisible();
  });

  test("filtra por sedes sin operador y lo guarda en la dirección", async ({ page }) => {
    await page.getByLabel("Operador").selectOption({ label: "Sin operador asignado" });
    const filas = page.getByRole("table").getByRole("row");
    await expect(filas.filter({ hasText: "PuntoCash Santiago" })).toBeVisible();
    await expect(filas.filter({ hasText: "PuntoCash Vedado" })).toHaveCount(0);
    await expect(page).toHaveURL(/operador=sin-operador/);
  });

  test("«Sin cajas» deja solo las sedes que no tienen ninguna", async ({ page }) => {
    await page.getByLabel("Sin cajas").check();
    const filas = page.getByRole("table").getByRole("row");
    await expect(filas.filter({ hasText: "PuntoCash Cerro" })).toBeVisible();
    await expect(filas.filter({ hasText: "PuntoCash Vedado" })).toHaveCount(0);
    await expect(page).toHaveURL(/sinCajas=1/);
  });
});

test.describe("alta de una sede", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsSuperAdmin(page);
    await page.goto("/super-admin/sedes/nueva");
  });

  test("un código que ya existe se rechaza", async ({ page }) => {
    await rellenarDatos(page, "VED", "PuntoCash Prueba");
    await page.getByRole("button", { name: "Crear la sede" }).click();
    await expect(page.getByText("Ya existe una sede con ese código.")).toBeVisible();
  });

  test("con operador pide motivo y, con él, la entrega y lo dice", async ({ page }) => {
    const codigo = codigoUnico();
    const nombre = `PuntoCash Prueba ${codigo}`;
    await rellenarDatos(page, codigo, nombre);
    await page.getByLabel(/^Operador$/).selectOption({ label: "Bahía Cambios S.R.L." });
    await page.getByRole("button", { name: "Crear la sede" }).click();
    await expect(page.getByText(/Escribe el motivo de la asignación/)).toBeVisible();

    await page.getByLabel(/^Motivo de la asignación\*?$/).fill("Entrega inicial de la sede al operador");
    await page.getByRole("button", { name: "Crear la sede" }).click();
    await expect(page.getByText(`${nombre} está creada`)).toBeVisible();
    await expect(page.getByText("Bahía Cambios S.R.L.")).toBeVisible();

    await page.goto("/super-admin/sedes");
    await page.getByLabel("Buscar sede").fill(codigo);
    await expect(page.getByRole("table").getByRole("row").filter({ hasText: nombre })).toBeVisible();

    await revocarYCerrar(page, `sede-${codigo.toLowerCase()}`);
  });
});

test.describe("ficha de una sede", () => {
  test("dice quién la administra: las personas del operador, con el principal marcado", async ({ page }) => {
    await signInAsSuperAdmin(page);
    await page.goto("/super-admin/sedes/sede-vedado");

    const asignacion = page
      .getByRole("main")
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Asignación vigente" }) });

    await expect(asignacion.getByText("Quién la administra")).toBeVisible();
    /* Las personas, no la entidad: es lo que faltaba para saber a quién llamar. */
    await expect(asignacion.getByText("Marta Sánchez")).toBeVisible();
    await expect(asignacion.getByText("Principal", { exact: true })).toBeVisible();
    await expect(asignacion.getByText("msanchez · m•••a@malecon-sf.cu")).toBeVisible();
    await expect(asignacion.getByText("Daniel Castro")).toBeVisible();
    /* Un principal por entidad, no uno por sede: la pantalla lo dice. */
    await expect(asignacion.getByText(/Administran todas las sedes de esa empresa/)).toBeVisible();
  });

  test("con jornadas abiertas, revocar y cerrar se bloquean y las enumeran", async ({ page }) => {
    await signInAsSuperAdmin(page);
    await page.goto("/super-admin/sedes/sede-habana-vieja");
    /* La siembra de jornadas sigue el reloj de Cuba y no abre ninguna caja
       antes de las 8:30: de madrugada no hay jornada abierta que probar. */
    const abiertas = await page.getByText(/Jornada abierta de|con la sesión iniciada/).count();
    test.skip(abiertas === 0, "La siembra no tiene jornadas abiertas a esta hora (antes de las 8:30 en Cuba).");
    for (const boton of ["Revocar", "Cerrar la sede"]) {
      await page.getByRole("button", { name: boton }).click();
      const dialogo = page.getByRole("dialog");
      await expect(dialogo.getByText("Esta sede tiene jornadas abiertas. Deben cerrarse antes.")).toBeVisible();
      await expect(dialogo.getByText(/abierta desde el/).first()).toBeVisible();
      await expect(dialogo.getByLabel(/^Motivo/)).toHaveCount(0);
      await dialogo.getByRole("button", { name: "Entendido" }).click();
      await expect(dialogo).toBeHidden();
    }
  });

  test("una sede de prueba recorre todas sus acciones", async ({ page }) => {
    test.setTimeout(120_000);
    await signInAsSuperAdmin(page);
    await page.goto("/super-admin/sedes/nueva");
    const codigo = codigoUnico();
    const nombre = `PuntoCash Ficha ${codigo}`;
    await rellenarDatos(page, codigo, nombre);
    await page.getByLabel(/^Operador$/).selectOption({ label: "Bahía Cambios S.R.L." });
    await page.getByLabel(/^Motivo de la asignación\*?$/).fill("Entrega inicial para la prueba de la ficha");
    await page.getByRole("button", { name: "Crear la sede" }).click();
    await page.getByRole("link", { name: "Ver su ficha" }).click();
    await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();

    // Editar: con operador, solo código y nombre.
    await page.getByRole("link", { name: "Editar datos" }).click();
    await expect(page.getByLabel(/^Dirección\*?$/)).toHaveCount(0);
    await page.getByLabel(/^Nombre\*?$/).fill(`${nombre} Centro`);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Datos guardados")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: `${nombre} Centro` })).toBeVisible();

    // Servicios: quitar uno pide motivo.
    await page.getByRole("button", { name: "Cambiar servicios" }).click();
    let dialogo = page.getByRole("dialog");
    await dialogo.getByLabel("Giros").uncheck();
    await dialogo.getByRole("button", { name: "Guardar servicios" }).click();
    await expect(dialogo.getByText(/Escribe el motivo/)).toBeVisible();
    await dialogo.getByLabel(/^Motivo\*?$/).fill("Giros todavía no disponible en esta zona");
    await dialogo.getByRole("button", { name: "Guardar servicios" }).click();
    await expect(page.getByText("Servicios actualizados")).toBeVisible();

    // Suspender y reactivar.
    await page.getByRole("button", { name: "Suspender la sede" }).click();
    dialogo = page.getByRole("dialog");
    await dialogo.getByLabel(/^Motivo\*?$/).fill("Inspección de la licencia de la sucursal");
    await dialogo.getByRole("button", { name: "Suspender" }).click();
    await expect(page.getByText("Sede suspendida", { exact: true })).toBeVisible();
    await expect(page.getByText("Inspección de la licencia de la sucursal").first()).toBeVisible();
    await page.getByRole("button", { name: "Reactivar la sede" }).click();
    dialogo = page.getByRole("dialog");
    await dialogo.getByLabel(/^Motivo\*?$/).fill("Licencia revisada y en regla");
    await dialogo.getByRole("button", { name: "Reactivar" }).click();
    await expect(page.getByText("Sede reactivada", { exact: true })).toBeVisible();

    // Revocar y volver a asignar.
    await page.getByRole("button", { name: "Revocar" }).click();
    dialogo = page.getByRole("dialog");
    await dialogo.getByLabel(/^Motivo\*?$/).fill("Cambio de operador acordado");
    await dialogo.getByRole("button", { name: "Revocar" }).click();
    await expect(page.getByText("Asignación revocada")).toBeVisible();
    await expect(page.getByText("Esta sede no tiene operador.", { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: "Asignar un operador" }).click();
    dialogo = page.getByRole("dialog");
    await dialogo.getByLabel(/^Operador\*?$/).selectOption({ label: "Bahía Cambios S.R.L." });
    await dialogo.getByLabel(/^Motivo\*?$/).fill("Nuevo tramo con el mismo operador");
    await expect(dialogo.getByText("Desde")).toBeVisible();
    await dialogo.getByRole("button", { name: "Asignar" }).click();
    await expect(page.getByText("Sede asignada")).toBeVisible();
    await expect(page.getByText("Cambio de operador acordado")).toBeVisible(); // el tramo anterior, en el historial

    // Revocar y cerrar: la sede de prueba no le queda a ningún operador.
    await revocarYCerrar(page, `sede-${codigo.toLowerCase()}`);
    await expect(page.getByRole("button", { name: "Suspender la sede" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Editar datos" })).toHaveCount(0);
  });
});

for (const ancho of [1024, 768, 390]) {
  test.describe(`a ${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: 900 } });

    test("el listado y el alta no desbordan", async ({ page }) => {
      await signInAsSuperAdmin(page);
      await page.goto("/super-admin/sedes");
      await sinDesbordamientoHorizontal(page, "Sedes");
      await page.goto("/super-admin/sedes/nueva");
      await sinDesbordamientoHorizontal(page, "Nueva sede");
    });
  });
}
