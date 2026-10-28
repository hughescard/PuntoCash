import { expect, test, type Page } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Operadores en Super administración.
 *
 * Los operadores de prueba nacen sin sedes y **terminan dados de baja**: un
 * operador activo sin sedes aparecería en los Pendientes de Inicio que otras
 * suites comprueban. Sobre los operadores de la demo solo se abren diálogos.
 */

const sello = () => Date.now().toString(36).slice(-6).toUpperCase();

async function darDeAlta(page: Page, nombre: string, ident: string, documento = { tipo: "NIT", numero: `NIT${sello()}` }): Promise<void> {
  await page.goto("/super-admin/operadores/nuevo");
  await page.getByLabel(/^Nombre o razón social\*?$/).fill(nombre);
  await page.getByLabel(/^Tipo de documento\*?$/).selectOption(documento.tipo);
  await page.getByLabel(/^Número de documento\*?$/).fill(documento.numero);
  await page.getByLabel(/^Persona de contacto\*?$/).fill("Prueba Contacto");
  await page.locator("#operador-telefono").fill("+53 5 000 1111");
  await page.locator("#operador-correo").fill("contacto@prueba.cu");
  await page.getByLabel(/^Nombre\*?$/).fill("Prueba");
  await page.getByLabel(/^Primer apellido\*?$/).fill("Principal");
  await page.locator("#operador-usuario-telefono").fill("+53 5 000 2222");
  await page.locator("#operador-usuario-correo").fill(`${ident}@prueba.cu`);
  await page.getByLabel(/^Identificador de acceso\*?$/).fill(ident);
  await page.getByRole("button", { name: "Dar de alta" }).click();
}

async function conMotivo(page: Page, boton: string, confirmar: string, motivo: string): Promise<void> {
  await page.getByRole("button", { name: boton }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel(/^Motivo\*?$/).fill(motivo);
  await dialogo.getByRole("button", { name: confirmar, exact: true }).click();
}

test.describe("listado de operadores", () => {
  test("muestra operaciones del mes y no volumen, y filtra los que no tienen sedes", async ({ page }) => {
    await signInAsSuperAdmin(page);
    await page.goto("/super-admin/operadores");
    const tabla = page.getByRole("table");
    await expect(tabla.getByRole("columnheader", { name: "Operaciones del mes" })).toBeVisible();
    await expect(tabla.getByRole("columnheader", { name: /Volumen/ })).toHaveCount(0);

    await page.getByLabel("Sin sedes").check();
    await expect(tabla.getByRole("row").filter({ hasText: "Cienfuegos Cambio S.R.L." })).toBeVisible();
    await expect(tabla.getByRole("row").filter({ hasText: "Malecón Servicios Financieros S.R.L." })).toHaveCount(0);
    await expect(page).toHaveURL(/sinSedes=1/);
  });
});

test.describe("ficha de un operador de la demo", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsSuperAdmin(page);
    await page.goto("/super-admin/operadores/op-malecon");
  });

  test("muestra sus sedes, operaciones del mes y usuarios, sin solicitudes pendientes", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: "PuntoCash Vedado" })).toBeVisible();
    await expect(main.getByRole("heading", { name: /^Operaciones de / })).toBeVisible();
    await expect(main.getByText("Marta Sánchez").first()).toBeVisible();
    await expect(main.getByText("Principal", { exact: true })).toBeVisible();
    await expect(main.getByText(/solicitudes/i)).toHaveCount(0);
  });

  test("no se da de baja con sedes asignadas: lo dice y las enumera", async ({ page }) => {
    await page.getByRole("button", { name: "Dar de baja" }).click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByText("Este operador administra 3 sedes")).toBeVisible();
    await expect(dialogo.getByRole("link", { name: "PuntoCash Vedado" })).toBeVisible();
    await expect(dialogo.getByLabel(/^Motivo/)).toHaveCount(0);
  });

  test("suspender dice a cuántas personas afecta", async ({ page }) => {
    await page.getByRole("button", { name: "Suspender el operador" }).click();
    await expect(page.getByRole("dialog").getByText(/de sus 3 sedes podrán iniciar sesión/)).toBeVisible();
  });
});

test("un operador de prueba recorre el alta y todas sus acciones", async ({ page }) => {
  test.setTimeout(120_000);
  await signInAsSuperAdmin(page);
  const nombre = `Prueba Operador ${sello()}`;
  const ident = `prueba${sello().toLowerCase()}`;
  /* Con pasaporte: el tipo que se añadió para operadores extranjeros (28/10). */
  const pasaporte = `K${sello()}`;
  await darDeAlta(page, nombre, ident, { tipo: "PASAPORTE", numero: pasaporte });

  await expect(page.getByText(`${nombre} está dado de alta`)).toBeVisible();
  await expect(page.getByText("Credencial inicial")).toBeVisible();
  await page.getByRole("link", { name: "Ver su ficha y asignarle una sede" }).click();
  await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();
  await expect(page.getByText(`Pasaporte ${pasaporte}`).first()).toBeVisible();
  await expect(page.getByText("Todavía no se le ha entregado ninguna sede.")).toBeVisible();

  // Asignar: el diálogo ofrece las sedes sin operador (no se confirma).
  await page.getByRole("button", { name: "Asignar una sede" }).click();
  await expect(page.getByRole("dialog").getByRole("option", { name: /PuntoCash Santiago/ })).toBeAttached();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();

  // Restablecer el acceso del principal, cambiando su correo.
  await page.getByRole("button", { name: "Restablecer el acceso del principal" }).click();
  let dialogo = page.getByRole("dialog");
  await dialogo.getByLabel(/^Correo de verificación\*?$/).fill(`${ident}.nuevo@prueba.cu`);
  await dialogo.getByLabel(/^Motivo\*?$/).fill("Perdió el acceso a su correo anterior");
  await dialogo.getByRole("button", { name: "Restablecer" }).click();
  await expect(dialogo.getByText("Credencial nueva")).toBeVisible();
  await expect(dialogo.getByText(`${ident}.nuevo@prueba.cu`)).toBeVisible();
  await dialogo.getByRole("button", { name: "Cerrar" }).first().click();

  // Suspender, reactivar y dar de baja.
  await conMotivo(page, "Suspender el operador", "Suspender", "Revisión de la documentación del operador");
  await expect(page.getByText("Operador suspendido", { exact: true })).toBeVisible();
  await conMotivo(page, "Reactivar el operador", "Reactivar", "Documentación revisada y en regla");
  await expect(page.getByText("Operador reactivado", { exact: true })).toBeVisible();
  await conMotivo(page, "Dar de baja", "Dar de baja", "Fin de la prueba automática");
  await expect(page.getByText("Operador dado de baja", { exact: true })).toBeVisible();
  dialogo = page.getByRole("dialog");
  await expect(page.getByRole("button", { name: "Suspender el operador" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Restablecer el acceso del principal" })).toHaveCount(0);
});

test("un identificador de acceso repetido se rechaza", async ({ page }) => {
  await signInAsSuperAdmin(page);
  await darDeAlta(page, `Prueba Repetido ${sello()}`, "msanchez");
  await expect(page.getByText("Ya hay un usuario con ese identificador de acceso.")).toBeVisible();
});

for (const ancho of [1024, 768, 390]) {
  test.describe(`a ${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: 900 } });
    test("listado, alta y ficha no desbordan", async ({ page }) => {
      await signInAsSuperAdmin(page);
      for (const ruta of ["/super-admin/operadores", "/super-admin/operadores/nuevo", "/super-admin/operadores/op-malecon"]) {
        await page.goto(ruta);
        await sinDesbordamientoHorizontal(page, ruta);
      }
    });
  });
}
