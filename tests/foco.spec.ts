import { expect, test } from "@playwright/test";

import { MARTA, signInAsAdmin } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Dónde queda la vista después de una acción (`src/lib/foco.ts`): al intentar
 * seguir con errores, la vista va al primer campo con error y lo enfoca, aunque
 * el botón esté abajo del todo. Una prueba por consola con un formulario que
 * valida el servidor; el kiosco tiene la suya en `kiosk-smoke`.
 */

const alFondo = (page: import("@playwright/test").Page) =>
  page.getByRole("main").evaluate((el) => (el.scrollTop = el.scrollHeight));

test("Admin: al dar de alta sin datos, la vista va al primer campo con error", async ({ page }) => {
  await signInAsAdmin(page, MARTA);
  await page.goto("/admin/trabajadores/nuevo");
  const enviar = page.getByRole("main").getByRole("button", { name: "Dar de alta" });
  await expect(enviar).toBeEnabled();
  await alFondo(page);
  await enviar.click();
  const enfocado = page.locator(":focus");
  await expect(enfocado).toHaveAttribute("aria-invalid", "true");
  await expect(enfocado).toBeInViewport();
});

test("Super Admin: al crear una sede sin datos, la vista va al primer campo con error", async ({ page }) => {
  await signInAsSuperAdmin(page);
  await page.goto("/super-admin/sedes/nueva");
  const enviar = page.getByRole("button", { name: "Crear la sede" });
  await expect(enviar).toBeEnabled();
  await alFondo(page);
  await enviar.click();
  const enfocado = page.locator(":focus");
  await expect(enfocado).toHaveAttribute("aria-invalid", "true");
  await expect(enfocado).toBeInViewport();
});
