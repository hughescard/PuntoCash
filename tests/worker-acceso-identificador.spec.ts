import { test, expect } from "./worker-fixture";
import { esperarBotonVivo } from "./worker-helpers";

/**
 * En Worker también se entra con el identificador o con el correo,
 * indistintamente (decisión del 28/10/2026). Ver `acceso-identificador.spec.ts`
 * para las consolas.
 */
test.use({ conSesion: false });

test("Worker entra con el nombre de usuario y con el correo", async ({ page, puesto }) => {
  for (const cuenta of [puesto.identifier, `${puesto.identifier}@puntocash.com`]) {
    await page.goto("/worker/login");
    await esperarBotonVivo(page, "Iniciar sesión", "el inicio de sesión de Worker");
    await page.getByLabel("Usuario o correo electrónico").fill(cuenta);
    await page.getByLabel("Contraseña", { exact: true }).fill("puntocash");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await page.waitForURL(/\/worker\/verificacion$/);
    await expect(page.getByRole("heading", { name: "Verifica que eres tú" })).toBeVisible();
    /* El mismo destino se escriba el usuario o el correo: es la misma cuenta. */
    await expect(page.getByText(`${puesto.identifier.charAt(0)}•••${puesto.identifier.slice(-1)}@puntocash.com`)).toBeVisible();
  }
});
