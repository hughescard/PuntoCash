import { expect, type Page } from "@playwright/test";

import { ADMIN_PASSWORD, DEMO_CODE } from "./admin-helpers";

/** Cuentas de PuntoCash de la demostración (`features/super-admin/usuarios.ts`). */
export const ELENA = "emarrero@puntocash.com";
export const JORGE = "jaguilera@puntocash.com";
/** Cuenta desactivada: no entra, con el mismo mensaje que una contraseña equivocada. */
export const RAUL = "rvaldes@puntocash.com";

/** El acceso de PuntoCash pide el correo: sus cuentas no tienen otro identificador. */
export async function submitSuperAdminCredentials(page: Page, identifier: string, password: string): Promise<void> {
  const enviar = page.getByRole("button", { name: "Iniciar sesión" });
  await expect(enviar).toBeEnabled({ timeout: 20_000 });
  await page.getByLabel("Correo electrónico").fill(identifier);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await enviar.click();
}

export async function signInAsSuperAdmin(page: Page, identifier = ELENA): Promise<void> {
  await page.goto("/super-admin/login");
  await submitSuperAdminCredentials(page, identifier, ADMIN_PASSWORD);
  await page.waitForURL(/\/super-admin\/verificacion$/);
  await page.getByLabel("Código de verificación").fill(DEMO_CODE);
  await page.waitForURL(/\/super-admin\/inicio$/);
  await expect(page.getByRole("main")).toBeVisible();
}
