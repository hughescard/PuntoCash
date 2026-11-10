import type { Page } from "@playwright/test";

import { expect, test } from "./worker-fixture";
import { esperarBotonVivo, rellenar } from "./worker-helpers";

/**
 * Reposición o retiro, cambio de billetes y el recuento que pide el sistema
 * cuando saldrían billetes que sus libros no tienen (bloque 3, decisiones del
 * 9 y el 10/11/2026).
 */

test.use({ monedas: [], actionTimeout: 8000 });

async function elegir(page: Page, id: string, opcion: RegExp | string) {
  await page.locator(`#${id}`).click();
  await page.getByRole("option", { name: opcion }).first().click();
}

async function escribir(page: Page, region: string, etiqueta: string, valor: string) {
  await rellenar(page.getByRole("region", { name: region }).getByLabel(etiqueta, { exact: true }), valor);
}

test.describe("Reposición o retiro", () => {
  test.use({ fondos: { USD: 200 } });

  test("Caja ofrece las dos acciones nuevas con la jornada abierta", async ({ page }) => {
    await page.goto("/worker/caja");
    await expect(page.getByRole("link", { name: /Reposición o retiro/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Cambio de billetes/ })).toBeVisible();
  });

  test("una reposición entra en el acto y queda pendiente de que la confirme su supervisor", async ({ page }) => {
    await page.goto("/worker/caja/fondos");
    await esperarBotonVivo(page, "Revisar", "reposición o retiro");
    await page.getByRole("button", { name: "Revisar" }).click();
    await expect(page.getByText("Elige si es una reposición o un retiro.")).toBeVisible();

    await page.getByRole("radio", { name: /Reposición/ }).check();
    await elegir(page, "fondos-moneda", /^USD/);
    await elegir(page, "fondos-supervisor", /./);
    await escribir(page, "Billetes de USD", "Billetes de 50 USD", "2");
    await page.getByRole("button", { name: "Revisar" }).click();

    await expect(page.getByText("Revisa antes de confirmar")).toBeVisible();
    await expect(page.getByText("100,00 USD").first()).toBeVisible();
    await page.getByRole("button", { name: "Confirmar la reposición" }).click();
    await expect(page.getByRole("heading", { name: "Reposición registrada" })).toBeVisible();
    await expect(page.getByText(/Queda pendiente de que .+ lo confirme/)).toBeVisible();

    await page.getByRole("link", { name: "Ver el movimiento y su comprobante" }).click();
    await expect(page.getByText("Detalle del movimiento de fondos")).toBeVisible();
    await expect(page.getByText("Reposición: el supervisor trajo efectivo")).toBeVisible();
    await expect(page.getByText("Pendiente de confirmar")).toBeVisible();
  });

  test("si salen billetes que los libros no tienen, se cuenta la moneda, se explica y después se registra", async ({ page }) => {
    await page.goto("/worker/caja/fondos");
    await esperarBotonVivo(page, "Revisar", "reposición o retiro");
    await page.getByRole("radio", { name: /Retiro/ }).check();
    await elegir(page, "fondos-moneda", /^USD/);
    await elegir(page, "fondos-supervisor", /./);
    /* La caja abrió con 2 de 100: según los libros, no hay de 50. */
    await escribir(page, "Billetes de USD", "Billetes de 50 USD", "2");
    await page.getByRole("button", { name: "Revisar" }).click();
    await page.getByRole("button", { name: "Confirmar el retiro" }).click();

    await expect(page.getByText("Según los libros, la caja no tiene esos billetes")).toBeVisible();
    await escribir(page, "Conteo de USD", "Billetes de 100 USD", "1");
    await escribir(page, "Conteo de USD", "Billetes de 50 USD", "2");
    await page.getByRole("button", { name: "Confirmar el recuento" }).click();

    await expect(page.getByText("Los billetes no coinciden con los libros")).toBeVisible();
    await page.getByRole("button", { name: "Guardar el motivo y continuar" }).click();
    await expect(page.locator("#recuento-motivo-USD")).toHaveAttribute("aria-invalid", "true");
    await elegir(page, "recuento-motivo-USD", "Hice un cambio de billetes sin registrarlo");
    await page.getByRole("button", { name: "Guardar el motivo y continuar" }).click();

    await expect(page.getByRole("heading", { name: "Retiro registrado" })).toBeVisible();
    await page.getByRole("link", { name: "Ir a Caja" }).click();
    await expect(page.getByRole("table").first().getByRole("cell", { name: "Ajuste de billetes en recuento" })).toBeVisible();
  });
});

test.describe("Cambio de billetes", () => {
  test.use({ fondos: { USD: 300 } });

  test("con un cliente, el sistema propone qué darle y no pasa por aprobación", async ({ page }) => {
    await page.goto("/worker/caja/cambio-de-billetes");
    await esperarBotonVivo(page, "Revisar", "cambio de billetes");
    await page.getByRole("radio", { name: /Con un cliente/ }).check();
    await elegir(page, "cambio-moneda", /^USD/);
    await escribir(page, "Entran de USD", "Billetes de 20 USD", "5");
    await page.getByRole("button", { name: "Proponer billetes para darle" }).click();
    await expect(page.getByRole("region", { name: "Salen de USD" }).getByLabel("Billetes de 100 USD", { exact: true })).toHaveValue("1");

    await page.getByRole("button", { name: "Revisar" }).click();
    await page.getByRole("button", { name: "Confirmar el cambio" }).click();
    await expect(page.getByRole("heading", { name: "Cambio de billetes registrado" })).toBeVisible();
    await expect(page.getByText(/Queda pendiente/)).toHaveCount(0);

    await page.getByRole("link", { name: "Ver el movimiento y su comprobante" }).click();
    await expect(page.getByText("Cambio de billetes con un cliente")).toBeVisible();
    await expect(page.getByText("No hace falta")).toBeVisible();
  });

  test("con el supervisor, lo que entra y lo que sale tienen que sumar lo mismo", async ({ page }) => {
    await page.goto("/worker/caja/cambio-de-billetes");
    await esperarBotonVivo(page, "Revisar", "cambio de billetes");
    await page.getByRole("radio", { name: /Con el supervisor/ }).check();
    await elegir(page, "cambio-moneda", /^USD/);
    await elegir(page, "cambio-supervisor", /./);
    await escribir(page, "Entran de USD", "Billetes de 50 USD", "1");
    await escribir(page, "Salen de USD", "Billetes de 100 USD", "1");
    await page.getByRole("button", { name: "Revisar" }).click();
    await expect(page.getByText("Lo que entra y lo que sale tienen que sumar lo mismo.")).toBeVisible();
    await escribir(page, "Entran de USD", "Billetes de 50 USD", "2");
    await page.getByRole("button", { name: "Revisar" }).click();
    await page.getByRole("button", { name: "Confirmar el cambio" }).click();
    await expect(page.getByText(/Queda pendiente de que .+ lo confirme/)).toBeVisible();
  });
});
