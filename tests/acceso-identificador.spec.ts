import { expect, test } from "@playwright/test";

import { ADMIN_PASSWORD, DEMO_CODE, submitCredentials } from "./admin-helpers";
import { submitSuperAdminCredentials } from "./super-admin-helpers";
import { EQUIPO_SIN_JORNADA } from "./storage-state";
import { esperarBotonVivo } from "./worker-helpers";

/**
 * En las tres consolas se entra con el **identificador de acceso** —un nombre
 * de usuario— o con el **correo**, indistintamente (decisión del 28/10/2026).
 *
 * El resto de la suite entra siempre con el correo, así que aquí se prueba el
 * camino nuevo: el nombre de usuario. Ninguna de estas pruebas escribe nada.
 */

test("Admin de sede: el identificador lleva a la misma sesión que el correo", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByLabel("Usuario o correo electrónico")).toBeVisible();

  await submitCredentials(page, "msanchez", ADMIN_PASSWORD);
  await page.waitForURL(/\/admin\/verificacion$/);

  /* El código va a **su** correo, no a uno deducido del nombre de usuario:
     entrar como «msanchez» no puede anunciar «msanchez@puntocash.com». */
  await expect(page.getByText("m•••a@malecon-sf.cu")).toBeVisible();

  await page.getByLabel("Código de verificación").fill(DEMO_CODE);
  await page.waitForURL(/\/admin\/inicio$/);

  await expect(page.getByRole("banner").getByText("Marta Sánchez")).toBeVisible();
});

test("Super administración: el acceso pide usuario o correo, y el usuario entra", async ({ page }) => {
  await page.goto("/super-admin/login");
  await expect(page.getByLabel("Usuario o correo electrónico")).toBeVisible();

  await submitSuperAdminCredentials(page, "emarrero", ADMIN_PASSWORD);
  await page.waitForURL(/\/super-admin\/verificacion$/);
  await expect(page.getByText("e•••o@puntocash.com")).toBeVisible();

  await page.getByLabel("Código de verificación").fill(DEMO_CODE);
  await page.waitForURL(/\/super-admin\/inicio$/);

  await expect(page.getByRole("banner").getByText("Elena Marrero Fonseca")).toBeVisible();
});

test.describe("Worker", () => {
  test.use({ storageState: EQUIPO_SIN_JORNADA });

  test("entra con el nombre de usuario y con el correo", async ({ page }) => {
    for (const cuenta of ["jperez", "jperez@puntocash.com"]) {
      await page.goto("/worker/login");
      await esperarBotonVivo(page, "Iniciar sesión", "el inicio de sesión de Worker");
      await page.getByLabel("Usuario o correo electrónico").fill(cuenta);
      await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN_PASSWORD);
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
      await page.waitForURL(/\/worker\/verificacion$/);
      await expect(page.getByRole("heading", { name: "Verifica que eres tú" })).toBeVisible();
      /* El mismo destino se escriba el usuario o el correo: es la misma cuenta. */
      await expect(page.getByText("j•••z@puntocash.com")).toBeVisible();
    }
  });
});

test("el alta de un usuario dice que el identificador no es un correo, y lo rechaza si lo es", async ({ page }) => {
  await page.goto("/admin/login");
  await submitCredentials(page, "msanchez", ADMIN_PASSWORD);
  await page.waitForURL(/\/admin\/verificacion$/);
  await page.getByLabel("Código de verificación").fill(DEMO_CODE);
  await page.waitForURL(/\/admin\/inicio$/);

  await page.goto("/admin/usuarios/nuevo");
  await expect(page.getByText("Su nombre de usuario, sin «@». Podrá entrar con él o con su correo.")).toBeVisible();

  await page.getByLabel(/^Nombre\*?$/).fill("Prueba");
  await page.getByLabel(/^Primer apellido\*?$/).fill("Identificador");
  await page.getByLabel(/^Teléfono\*?$/).fill("+53 5 000 1111");
  await page.getByLabel(/^Correo electrónico\*?$/).fill("prueba.identificador@malecon-sf.cu");
  await page.getByLabel(/^Identificador de acceso\*?$/).fill("prueba.identificador@malecon-sf.cu");
  await page.getByRole("button", { name: "Dar de alta" }).click();

  await expect(page.getByText(/no lleva «@»/)).toBeVisible();
  /* Se rechaza: no se llega a dar de alta a nadie. */
  await expect(page.getByText("Credencial inicial")).toHaveCount(0);
});
