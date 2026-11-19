import { expect, test, type Page } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Tarifas en Super administración.
 *
 * Las escrituras recaen sobre el **yen**, que no tiene tarifa sembrada y en el
 * que ninguna prueba de Worker envía giros; la prueba la define y la retira.
 * Sobre el dólar solo se abre el editor y se cancela.
 */

const tramo = (page: Page, n: number) => page.getByRole("listitem", { name: `Tramo ${n}`, exact: true });

test.beforeEach(async ({ page }) => {
  await signInAsSuperAdmin(page);
});

test("Tarifas está en el menú y dice qué servicio lleva tarifa", async ({ page }) => {
  await page.getByRole("navigation").getByRole("link", { name: "Tarifas" }).first().click();
  await page.waitForURL(/\/super-admin\/tarifas$/);
  const lista = page.getByRole("main").getByRole("listitem");
  await expect(lista.filter({ hasText: "Cambio de moneda" }).getByText("El precio para el cliente es la tasa.")).toBeVisible();
  await expect(lista.filter({ hasText: "Remesas" }).getByText("Sin tarifa")).toBeVisible();
  const giros = lista.filter({ hasText: "Giros" });
  await expect(giros.getByText("Por tramos de importe · en 3 monedas. La paga el remitente.")).toBeVisible();
  await giros.getByRole("link", { name: "Ver tarifas de giros" }).click();
  await page.waitForURL(/\/super-admin\/tarifas\/giros$/);
});

test("cada moneda con tarifa muestra su mínimo y sus tramos; las demás, que no se envían giros", async ({ page }) => {
  await page.goto("/super-admin/tarifas/giros");
  const usd = page.getByRole("table", { name: "Tramos de la tarifa de giros en USD" });
  await expect(usd.getByRole("row")).toHaveCount(4);
  await expect(usd.getByRole("row").nth(1)).toContainText("De 10,00 a 100,00");
  await expect(usd.getByRole("row").nth(2)).toContainText("Más de 100,00 hasta 500,00");
  await expect(usd.getByRole("row").nth(2)).toContainText("2 %");
  await expect(usd.getByRole("row").nth(3)).toContainText("Más de 500,00");
  await expect(usd.getByRole("row").nth(3)).toContainText("1,5 %");
  await expect(page.getByText("10,00 USD", { exact: true })).toBeVisible();

  const sin = page.getByRole("region", { name: "Sin tarifa" });
  await expect(sin.getByRole("link", { name: "Definir la tarifa de giros en GBP" })).toBeVisible();
  /* El peso cubano tiene tarifa: no está en la lista de las que no. */
  await expect(sin.getByText("Peso cubano")).toBeHidden();
});

test("cambiar una tarifa que ya existe pide motivo", async ({ page }) => {
  await page.goto("/super-admin/tarifas/giros");
  await page.getByRole("link", { name: "Cambiar la tarifa de giros en USD" }).click();
  await page.waitForURL(/\/super-admin\/tarifas\/giros\/USD$/);
  await expect(page.getByRole("heading", { name: "Cambiar la tarifa de giros en USD" })).toBeVisible();
  await expect(tramo(page, 3).getByText("Sin límite", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Guardar la tarifa" }).click();
  await expect(page.getByText("Escribe el motivo del cambio: al menos 10 caracteres.")).toBeVisible();
  await page.getByRole("link", { name: "Cancelar" }).click();
  await page.waitForURL(/\/super-admin\/tarifas\/giros$/);
});

test("definir y retirar la tarifa de giros del yen", async ({ page }) => {
  await page.goto("/super-admin/tarifas/giros");
  await page.getByRole("link", { name: "Definir la tarifa de giros en JPY" }).click();
  await page.waitForURL(/\/super-admin\/tarifas\/giros\/JPY$/);

  await page.getByLabel(/^Giro mínimo/).fill("1000");
  await tramo(page, 1).getByLabel(/^Fijo/).fill("0");
  await tramo(page, 1).getByLabel(/^Porcentaje/).fill("0");
  /* Un tramo que no cobra nada se dice mientras se escribe. */
  await expect(tramo(page, 1).getByText(/no pueden ser cero a la vez/)).toBeVisible();

  /* El tramo nuevo entra antes del último, que sigue sin límite. */
  await page.getByRole("button", { name: "Añadir tramo" }).click();
  await expect(tramo(page, 2).getByText("Sin límite", { exact: true })).toBeVisible();
  await tramo(page, 1).getByLabel(/^Hasta/).fill("10000");
  await tramo(page, 1).getByLabel(/^Fijo/).fill("300");
  await tramo(page, 1).getByLabel(/^Porcentaje/).fill("0");
  await expect(tramo(page, 1).getByText("De 1.000,00 a 10.000,00")).toBeVisible();
  await tramo(page, 2).getByLabel(/^Fijo/).fill("0");
  await tramo(page, 2).getByLabel(/^Porcentaje/).fill("2,5");
  await expect(tramo(page, 2).getByText("Más de 10.000,00")).toBeVisible();

  /* Un límite que no supera el mínimo, no. */
  await tramo(page, 1).getByLabel(/^Hasta/).fill("900");
  await expect(tramo(page, 1).getByText(/tiene que ser mayor que el giro mínimo/)).toBeVisible();
  await tramo(page, 1).getByLabel(/^Hasta/).fill("10000");

  await page.getByRole("button", { name: "Definir la tarifa" }).click();
  await page.waitForURL(/\/super-admin\/tarifas\/giros\?guardada=JPY/);
  await expect(page.getByText("Ya se pueden enviar giros en JPY en todas las sedes que tienen Giros.")).toBeVisible();
  const jpy = page.getByRole("table", { name: "Tramos de la tarifa de giros en JPY" });
  await expect(jpy.getByRole("row").nth(2)).toContainText("2,5 %");

  await page.getByRole("button", { name: "Retirar la tarifa de giros en JPY" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel(/^Motivo/).fill("Prueba automática de tarifas");
  await dialogo.getByRole("button", { name: "Retirar la tarifa" }).click();
  await expect(page.getByText("Tarifa de giros en JPY retirada.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Definir la tarifa de giros en JPY" })).toBeVisible();
});

test("una moneda que no está en el catálogo no tiene editor", async ({ page }) => {
  const r = await page.goto("/super-admin/tarifas/giros/XYZ");
  expect(r?.status()).toBe(404);
});

test.describe("en el teléfono", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Tarifas, Tarifas de giros y el editor caben sin desplazamiento horizontal", async ({ page }) => {
    for (const ruta of ["/super-admin/tarifas", "/super-admin/tarifas/giros", "/super-admin/tarifas/giros/USD"]) {
      await page.goto(ruta);
      await expect(page.getByRole("main")).toBeVisible();
      await sinDesbordamientoHorizontal(page, ruta);
    }
  });
});
