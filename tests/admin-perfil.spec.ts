import { test, expect } from "@playwright/test";

import { MARTA, signInAsAdmin } from "./admin-helpers";

/** El segundo usuario de Malecón: administrador, **no** el principal. */
const DANIEL = "dcastro@malecon-sf.cu";

/**
 * `/admin/perfil` — **§8.2 del FRD**, la prueba de navegación y congruencia.
 *
 * ── Qué protege ───────────────────────────────────────────────────────────
 * Que el perfil sea de **todos** —también de quien no es el principal, que es
 * para quien existe— y que el correo **no** se cambie desde aquí sino que la
 * pantalla diga dónde (**FR-AD-PERF-4**). Las dos sesiones hacen falta porque
 * esa remisión es lo único que cambia entre una y otra.
 *
 * ── Por qué no se escribe nada ────────────────────────────────────────────
 * Cambiar la contraseña de Daniel la cambiaría **para el resto de la
 * corrida**, y `admin-usuarios.spec.ts` entra con él. Así que del cambio de
 * contraseña se recorre solo el rechazo, que no escribe.
 */

test.describe("§8.2 Perfil", () => {
  test("quien no es el principal tiene su perfil, y el correo remite al principal", async ({
    page,
  }) => {
    await signInAsAdmin(page, DANIEL);

    /* **FR-AD-PERF-1**: se llega desde la cabecera. */
    await page.getByRole("banner").getByRole("link", { name: "Perfil" }).click();
    await page.waitForURL(/\/admin\/perfil$/);
    await expect(page.getByRole("heading", { name: "Perfil", level: 1 })).toBeVisible();

    const main = page.getByRole("main");
    await expect(main.getByText("Daniel Castro")).toBeVisible();
    await expect(main.getByText("Administrador", { exact: true })).toBeVisible();

    /* **FR-AD-PERF-4**: el correo se ve y no se cambia aquí; la pantalla dice
       a quién pedírselo, por su nombre. */
    await expect(main.getByText("Para cambiarlo, pídeselo a Marta Sánchez.")).toBeVisible();

    /* **FR-AD-PERF-3**: editar es una pantalla aparte, con los mismos campos
       que §8 y ni identificador ni correo. */
    await main.getByRole("link", { name: "Editar" }).click();
    await page.waitForURL(/\/admin\/perfil\/editar$/);
    await expect(main.getByLabel(/^Nombre\*?$/)).toHaveValue("Daniel");
    for (const ausente of [/identificador/i, /correo/i]) {
      await expect(main.getByLabel(ausente)).toHaveCount(0);
    }
    await main.getByRole("link", { name: "Cancelar" }).click();
    await page.waitForURL(/\/admin\/perfil$/);

    /* **FR-AD-PERF-5**: la contraseña actual se pide, y si no es la correcta
       se dice en su campo. */
    await main.getByRole("link", { name: "Cambiar contraseña" }).click();
    await page.waitForURL(/\/admin\/perfil\/contrasena$/);

    const enviar = main.getByRole("button", { name: "Cambiar contraseña" });
    await main.getByLabel("Contraseña actual").fill("no-es-esta");
    await main.getByLabel("Contraseña nueva", { exact: true }).fill("otra-clave-1");
    await main.getByLabel("Repite la contraseña nueva").fill("otra-clave-1");
    await enviar.click();
    await expect(main.getByText("La contraseña actual no es correcta.")).toBeVisible();

    /* Los campos son controlados: el rechazo no obliga a teclearlo todo otra
       vez. */
    await expect(main.getByLabel("Repite la contraseña nueva")).toHaveValue("otra-clave-1");
  });

  test("al principal, el correo le remite a su propia ficha en Usuarios", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/perfil");

    const main = page.getByRole("main");
    await expect(main.getByText("Administrador principal", { exact: true })).toBeVisible();

    await main.getByRole("link", { name: "tu ficha en Usuarios" }).click();
    await page.waitForURL(/\/admin\/usuarios\/adm-malecon-1$/);
  });
});
