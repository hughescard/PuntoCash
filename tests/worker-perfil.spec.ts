import { test, expect } from "./worker-fixture";

/**
 * El perfil del trabajador (12/11/2026): ve sus datos, cambia su nombre de
 * usuario y su teléfono, y su contraseña. El nombre, el documento y el correo
 * no los cambia él.
 */
test.describe("Perfil del trabajador", () => {
  test("enseña sus datos y explica qué no puede cambiar", async ({ page }) => {
    await page.goto("/worker/inicio");
    await page.getByRole("banner").getByRole("link", { name: "Perfil" }).click();
    await page.waitForURL(/\/worker\/perfil$/);
    const main = page.getByRole("main");
    for (const dato of ["Nombre", "Documento", "Nombre de usuario", "Teléfono", "Correo de verificación", "Sede"]) {
      await expect(main.getByText(dato, { exact: true })).toBeVisible();
    }
    await expect(main.getByText(/Tu nombre, tu documento y tu correo los cambia tu administrador/)).toBeVisible();
    await expect(main.getByText(/@/)).toHaveCount(1);
  });

  test("cambia su nombre de usuario y su teléfono", async ({ page, puesto }) => {
    await page.goto("/worker/perfil/editar");
    const usuario = `u${Date.now().toString(36)}`;
    await page.getByLabel("Nombre de usuario").fill(usuario);
    await page.getByLabel("Teléfono").fill("+53 5 123 4567");
    await page.getByRole("button", { name: "Guardar" }).click();
    await page.waitForURL(/\/worker\/perfil\?datos=guardados/);
    await expect(page.getByText(`Desde ahora entras con «${usuario}» o con tu correo.`)).toBeVisible();
    await expect(page.getByRole("main").getByText("+53 5 123 4567")).toBeVisible();
    expect(puesto.workerId).toBeTruthy();

    /* Guardar sin cambiar nada lo dice. */
    await page.goto("/worker/perfil/editar");
    await page.getByRole("button", { name: "Guardar" }).click();
    await page.waitForURL(/datos=sin-cambios/);
  });

  test("valida el usuario y el teléfono", async ({ page }) => {
    await page.goto("/worker/perfil/editar");
    await page.getByLabel("Nombre de usuario").fill("con@arroba");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page).toHaveURL(/\/worker\/perfil\/editar$/);

    await page.getByLabel("Nombre de usuario").fill("jperez");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Ese nombre de usuario ya lo usa otra persona. Elige otro.").first()).toBeVisible();

    await page.getByLabel("Nombre de usuario").fill(`v${Date.now().toString(36)}`);
    await page.getByLabel("Teléfono").fill("123");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText(/al menos 8 cifras/).first()).toBeVisible();
  });

  test("cambia su contraseña sabiendo la actual", async ({ page }) => {
    await page.goto("/worker/perfil/contrasena");
    await page.getByLabel("Contraseña actual").fill("mal");
    await page.getByLabel("Contraseña nueva", { exact: true }).fill("nueva-clave-1");
    await page.getByLabel("Repite la contraseña nueva").fill("nueva-clave-1");
    await page.getByRole("button", { name: /Cambiar contraseña|Guardar/ }).click();
    await expect(page.getByText("La contraseña actual no es correcta.").first()).toBeVisible();

    await page.getByLabel("Contraseña actual").fill("puntocash");
    await page.getByRole("button", { name: /Cambiar contraseña|Guardar/ }).click();
    await page.waitForURL(/contrasena=cambiada/);
    await expect(page.getByText("Tu contraseña está cambiada")).toBeVisible();
  });
});
