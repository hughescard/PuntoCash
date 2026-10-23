import { test, expect } from "@playwright/test";

import { IDALMIS, MARTA, signInAsAdmin } from "./admin-helpers";

/**
 * `/admin/operaciones` — **FR-AD-OPS-1** a **FR-AD-OPS-9**. Solo lee: ninguna
 * prueba de aquí cambia nada.
 */

test.describe("Operaciones", () => {
  test("se listan todas, se filtran por servicio y se entra pulsando la fila", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/operaciones");
    const main = page.getByRole("main");

    /* FR-AD-OPS-1: todas, completadas o no. */
    await expect(main.locator("tbody tr").first()).toBeVisible();
    await expect(main.getByText(/\d+ de \d+ operaciones/)).toBeVisible();

    /* FR-AD-OPS-2: el filtro de servicio deja solo ese servicio. */
    await main.getByLabel("Servicio").selectOption("Remesa");
    const filas = main.locator("tbody tr");
    await expect(filas.first()).toContainText("Remesa");
    for (const texto of await filas.allTextContents()) expect(texto).toContain("Remesa");

    /* Se entra pulsando la fila en cualquier parte que no sea otro enlace. */
    const codigo = (await filas.first().locator(".pc-numeric").first().textContent())!.trim();
    await filas.first().locator("td").nth(2).click();
    await page.waitForURL(new RegExp(`/admin/operaciones/${codigo}$`));
    await expect(main.getByRole("heading", { name: `Operación ${codigo}` })).toBeVisible();
  });

  test("buscar por código la encuentra sea de cuando sea", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/operaciones");
    const main = page.getByRole("main");
    const codigo = (await main.locator("tbody tr").first().locator(".pc-numeric").first().textContent())!.trim();
    await main.getByLabel("Buscar").fill(codigo);
    await expect(main.locator("tbody tr")).toHaveCount(1);
    await expect(main.getByText("Buscando en todas las fechas", { exact: false })).toBeVisible();
  });

  test("el detalle dice dónde y quién, lleva a su jornada y no ofrece ninguna acción", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/operaciones");
    const main = page.getByRole("main");
    await main.getByLabel("Servicio").selectOption("Cambio de moneda");
    await main.getByLabel("Estado").selectOption("Completada");
    await main.locator("tbody tr").first().locator("td").nth(2).click();
    await page.waitForURL(/\/admin\/operaciones\/PC-/);

    /* FR-AD-OPS-4: sede, caja, trabajador, jornada y origen. */
    await expect(main.getByRole("heading", { name: "Contexto de la operación" })).toBeVisible();
    await expect(main.getByText("Origen", { exact: true })).toBeVisible();
    /* FR-AD-OPS-3: el detalle de Worker, con la tasa aplicada. */
    await expect(main.getByText("Tasa aplicada")).toBeVisible();
    /* FR-AD-OPS-5: ni imprimir, ni anular, ni corregir. */
    await expect(main.getByRole("button", { name: /Imprimir|Anular|Corregir|Reenviar/ })).toHaveCount(0);

    await main.getByRole("link", { name: /^Caja \d+ · .+ · \d+ \w+ \d{4}$/ }).click();
    await page.waitForURL(/\/admin\/jornadas\/J-/);
  });

  test("una operación de otra empresa responde como inexistente", async ({ page }) => {
    await signInAsAdmin(page, MARTA);
    await page.goto("/admin/operaciones");
    const codigo = (await page.getByRole("main").locator("tbody tr").first().locator(".pc-numeric").first().textContent())!.trim();

    await page.context().clearCookies();
    await signInAsAdmin(page, IDALMIS);
    const respuesta = await page.goto(`/admin/operaciones/${codigo}`);
    expect(respuesta?.status()).toBe(404);
  });
});
