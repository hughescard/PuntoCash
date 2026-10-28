import { expect, test } from "@playwright/test";

import { sinDesbordamientoHorizontal } from "./admin-helpers";
import { signInAsSuperAdmin } from "./super-admin-helpers";

/**
 * Monedas y tasas en Super administración.
 *
 * Las escrituras de estas pruebas recaen sobre el **yen**, que ninguna sede
 * tiene en su lista: definir y retirar su rango no toca ninguna tasa ni los
 * Pendientes de Inicio que otras suites comprueban. Sobre el dólar solo se
 * abre el editor para ver la vista previa, y se cancela.
 */

test.describe("monedas y rangos", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsSuperAdmin(page);
    await page.goto("/super-admin/monedas-y-tasas");
  });

  test("una fila por moneda: con rango se cotiza, sin rango nadie puede", async ({ page }) => {
    const tabla = page.getByRole("table");
    const usd = tabla.getByRole("row").filter({ hasText: "Dólar estadounidense" });
    await expect(usd.getByText("300 – 330")).toBeVisible();
    const cad = tabla.getByRole("row").filter({ hasText: "Dólar canadiense" });
    await expect(cad.getByText("Sin rango")).toBeVisible();
    await expect(cad.getByText("2 sedes la esperan")).toBeVisible();
    /* El peso cubano es la referencia: no tiene fila. */
    await expect(tabla.getByRole("row").filter({ hasText: "Peso cubano" })).toHaveCount(0);
  });

  test("al cambiar un rango se ven, antes de guardar, las sedes que quedarían fuera", async ({ page }) => {
    await page.getByRole("button", { name: "Cambiar el rango del USD" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.locator("#rango-cmin").fill("300");
    await dialogo.locator("#rango-cmax").fill("310");
    await dialogo.locator("#rango-vmin").fill("310");
    await dialogo.locator("#rango-vmax").fill("320");
    await expect(dialogo.getByText(/sedes tienen hoy una tasa fuera del nuevo rango/)).toBeVisible();
    await expect(dialogo.getByRole("cell", { name: "PuntoCash Vedado" })).toBeVisible();

    /* Una compra por encima de la venta no se deja guardar. */
    await dialogo.locator("#rango-cmax").fill("330");
    await expect(dialogo.getByText(/La compra no puede quedar por encima de la venta/)).toBeVisible();
    await expect(dialogo.getByRole("button", { name: "Guardar el rango" })).toBeDisabled();
    await dialogo.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("table").getByRole("row").filter({ hasText: "Dólar estadounidense" }).getByText("300 – 330")).toBeVisible();
  });

  test("definir y retirar el rango del yen", async ({ page }) => {
    await page.getByRole("button", { name: "Definir el rango del JPY" }).click();
    let dialogo = page.getByRole("dialog");
    await dialogo.locator("#rango-cmin").fill("2");
    await dialogo.locator("#rango-cmax").fill("3");
    await dialogo.locator("#rango-vmin").fill("2,2");
    await dialogo.locator("#rango-vmax").fill("3,2");
    await dialogo.getByRole("button", { name: "Definir el rango" }).click();
    await expect(page.getByText(/Rango del JPY definido/)).toBeVisible();

    await page.getByRole("button", { name: "Retirar el rango del JPY" }).click();
    dialogo = page.getByRole("dialog");
    await dialogo.getByRole("button", { name: "Retirar el rango" }).click();
    await expect(dialogo.getByText(/Escribe el motivo/)).toBeVisible();
    await dialogo.getByLabel(/^Motivo\*?$/).fill("Prueba automática: el yen vuelve a no cotizarse");
    await dialogo.getByRole("button", { name: "Retirar el rango" }).click();
    await expect(page.getByText(/Rango del JPY retirado/)).toBeVisible();
    await expect(page.getByRole("table").getByRole("row").filter({ hasText: "Yen japonés" }).getByText("Sin rango")).toBeVisible();
  });
});

test("tasas por sede: lo que publica cada una, de solo lectura", async ({ page }) => {
  await signInAsSuperAdmin(page);
  await page.goto("/super-admin/monedas-y-tasas?vista=sedes");
  await expect(page.getByText("PuntoCash Trinidad").first()).toBeVisible();
  await expect(page.getByText("Sin rango de PuntoCash: no se publica.").first()).toBeVisible();
  await expect(page.getByRole("main").getByRole("button", { name: /Cambiar|Definir|Retirar/ })).toHaveCount(0);
});

for (const ancho of [1024, 768, 390]) {
  test.describe(`a ${ancho}px`, () => {
    test.use({ viewport: { width: ancho, height: 900 } });

    test("las dos vistas no desbordan", async ({ page }) => {
      await signInAsSuperAdmin(page);
      await page.goto("/super-admin/monedas-y-tasas");
      await sinDesbordamientoHorizontal(page, "Monedas y rangos");
      await page.goto("/super-admin/monedas-y-tasas?vista=sedes");
      await sinDesbordamientoHorizontal(page, "Tasas por sede");
    });
  });
}
