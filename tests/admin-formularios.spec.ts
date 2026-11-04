import { expect, test } from "@playwright/test";

import { MARTA, signInAsAdmin } from "./admin-helpers";

/**
 * Lo elegido en un desplegable sobrevive a un rechazo.
 *
 * Con `<form action={accion}>`, React restablecía el formulario tras cada
 * respuesta y los desplegables volvían a su primera opción sin que se notara:
 * en el alta de un trabajador, el tipo de documento pasaba de «Pasaporte» a
 * «CI», y el segundo envío lo registraba así. Los formularios se envían ahora
 * con `enviarSinReiniciar` (`src/lib/enviar-sin-reiniciar.ts`).
 */
test("el alta de un trabajador conserva el tipo de documento y la sede tras un error", async ({ page }) => {
  await signInAsAdmin(page, MARTA);
  await page.goto("/admin/trabajadores/nuevo");

  const tipo = page.getByLabel(/^Tipo de documento\*?$/);
  const sede = page.locator("#trabajador-sede");
  await tipo.selectOption("PASAPORTE");
  await sede.selectOption("sede-vedado");

  /* Sin nombre: el alta se rechaza. */
  await page.getByRole("button", { name: /Dar de alta/ }).click();
  await expect(page.getByText(/obligatorio|Completa|Escribe/).first()).toBeVisible();

  await expect(tipo).toHaveValue("PASAPORTE");
  await expect(sede).toHaveValue("sede-vedado");
});
