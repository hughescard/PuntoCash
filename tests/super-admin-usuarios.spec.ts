import { expect, test, type Page } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { ELENA, JORGE, signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Sección Usuarios de la consola (FR-SA-USR): solo el principal la ve.
 * Las altas y desactivaciones de estas pruebas recaen sobre cuentas que la
 * propia prueba crea, porque el estado vive en memoria y lo comparten las demás
 * suites del mismo servidor.
 */

const ANCHOS = [1440, 1024, 768, 390] as const;

/** Da de alta una cuenta de prueba y deja la página en su ficha. */
async function altaDePrueba(page: Page, identificador: string): Promise<void> {
  await page.goto("/super-admin/usuarios/nuevo");
  await page.getByLabel(/^Nombre\*?$/).fill("Prueba");
  await page.getByLabel(/^Primer apellido\*?$/).fill("Alta Consola");
  await page.getByLabel(/^Teléfono\*?$/).fill("+53 7 000 1111");
  await page.getByLabel(/^Correo electrónico\*?$/).fill(identificador);
  await page.getByLabel(/^Identificador de acceso\*?$/).fill(identificador);
  await page.getByLabel(/^Área\*?$/).fill("Control interno");
  await page.getByRole("button", { name: "Dar de alta" }).click();
  await expect(page.getByText("Credencial inicial")).toBeVisible();
  await page.getByRole("link", { name: "Ver su ficha" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Prueba Alta Consola" })).toBeVisible();
}

test.describe("Usuarios de la consola · principal", () => {
  test("el principal ve la entrada del menú y la lista con su fila marcada", async ({ page }) => {
    await signInAsSuperAdmin(page, ELENA);

    await expect(page.getByRole("link", { name: "Usuarios" }).first()).toBeVisible();
    await page.goto("/super-admin/usuarios");
    await expect(page.getByRole("heading", { level: 1, name: "Usuarios" })).toBeVisible();
    await expect(page.getByText("Tú", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Jorge Aguilera Ruiz" })).toBeVisible();
  });

  test("dar de alta enseña la credencial una sola vez y la cuenta abre su ficha", async ({ page }) => {
    await signInAsSuperAdmin(page, ELENA);
    await altaDePrueba(page, `prueba.${Date.now()}@puntocash.com`);
    await expect(page.getByText("Cópiala ahora: no se podrá volver a consultar")).toHaveCount(0);
  });

  test("desactivar sin motivo se rechaza y con motivo se aplica", async ({ page }) => {
    await signInAsSuperAdmin(page, ELENA);
    await altaDePrueba(page, `motivo.${Date.now()}@puntocash.com`);

    await page.getByRole("button", { name: "Desactivar" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.getByRole("button", { name: "Desactivar" }).click();
    await expect(dialogo.getByText("Escribe el motivo")).toBeVisible();

    await dialogo.getByLabel(/^Motivo\*?$/).fill("Cese de funciones en la consola");
    await dialogo.getByRole("button", { name: "Desactivar" }).click();
    await expect(dialogo.getByText("ya no puede entrar en la consola")).toBeVisible();
  });

  test("el principal no tiene botón de desactivar y la razón queda visible", async ({ page }) => {
    await signInAsSuperAdmin(page, ELENA);

    await page.goto("/super-admin/usuarios");
    await page.getByRole("link", { name: "Elena Marrero Fonseca" }).click();
    await expect(page.getByRole("button", { name: "Desactivar" })).toHaveCount(0);
    await expect(page.getByText("Al principal no lo desactiva nadie")).toBeVisible();
  });

  test("la sección se sostiene en las cuatro anchuras sin desbordamiento", async ({ page }) => {
    await signInAsSuperAdmin(page, ELENA);
    for (const ancho of ANCHOS) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/super-admin/usuarios");
      await expect(page.getByRole("heading", { level: 1, name: "Usuarios" })).toBeVisible();
      await sinDesbordamientoHorizontal(page);
    }
  });
});

test.describe("Usuarios de la consola · resto de super administradores", () => {
  test("Jorge no ve la entrada del menú y la ruta responde como inexistente", async ({ page }) => {
    await signInAsSuperAdmin(page, JORGE);

    await expect(page.getByRole("link", { name: "Usuarios" })).toHaveCount(0);
    const respuesta = await page.goto("/super-admin/usuarios");
    expect(respuesta?.status()).toBe(404);
  });

  test("tampoco llega a la ficha ni al alta", async ({ page }) => {
    await signInAsSuperAdmin(page, JORGE);
    expect((await page.goto("/super-admin/usuarios/sa-1"))?.status()).toBe(404);
    expect((await page.goto("/super-admin/usuarios/nuevo"))?.status()).toBe(404);
  });
});

