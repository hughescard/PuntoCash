import { test, expect } from "./worker-fixture";
import { type Page } from "@playwright/test";

import { abrirPorPantalla } from "./worker-helpers";

/**
 * Worker Caja — Ajustar efectivo (/worker/caja/ajustar-efectivo), **a ciegas**
 * (decisión del 6/11/2026).
 *
 * El trabajador no ve el saldo de su caja: elige una moneda, escribe lo que
 * contó y, al confirmar el aviso de que no podrá cambiarlo, el ajuste queda
 * registrado con la diferencia contra los libros. Solo entonces la ve y dice
 * por qué, en una ventana de la que no se sale sin terminar. Si coincide, no
 * hay ajuste.
 *
 * La jornada se siembra con 1.200 EUR.
 */

test.use({ fondos: { EUR: 1_200 } });

async function openJornada(page: Page, fondos: Record<string, string> = { EUR: "1200" }) {
  await abrirPorPantalla(page, fondos);
}

async function goToAjustarEfectivo(page: Page) {
  await page.goto("/worker/caja");
  await page.getByRole("link", { name: /Ajustar efectivo/ }).click();
  await expect(page.getByRole("heading", { name: "Ajustar efectivo" })).toBeVisible();
}

async function contar(page: Page, counted: string, currency = "EUR") {
  await page.locator("#ajuste-moneda").click();
  await page.getByRole("option", { name: new RegExp(`^${currency}`) }).click();
  await page.getByLabel("Efectivo contado").fill(counted);
  await page.getByRole("button", { name: "Continuar" }).click();
}

/** Cuenta, confirma el aviso y espera la ventana del motivo. */
async function registrarConteo(page: Page, counted: string, currency = "EUR") {
  await contar(page, counted, currency);
  await page.getByRole("dialog").getByRole("button", { name: "Confirmar conteo" }).click();
}

async function explicar(page: Page, motivo: string, observaciones?: string) {
  await page.locator("#ajuste-motivo").click();
  await page.getByRole("option", { name: motivo, exact: true }).click();
  if (observaciones) await page.locator("#ajuste-observaciones").fill(observaciones);
  await page.getByRole("button", { name: "Guardar motivo y terminar" }).click();
}

test.describe("ajustar efectivo — action availability", () => {
  /*
   * Necesita la caja CERRADA, así que se sale de la siembra del archivo. Y no
   * solo por afirmar lo contrario de lo que habría: el estado sembrado se
   * repone al hidratar, de modo que la pantalla bloqueada que pintó el
   * servidor se sustituye por la de trabajo a media prueba.
   */
  test.use({ fondos: null });

  test("the Caja tile is disabled with an accurate reason, never generic, while no jornada is open", async ({
    page,
  }) => {
    await page.goto("/worker/caja");
    const tile = page.getByRole("button", { name: /Ajustar efectivo/ });
    await expect(tile).toBeDisabled();
    await expect(tile.getByText("Requiere jornada abierta")).toBeVisible();
    await expect(tile.getByText("Próximamente")).toHaveCount(0);
  });

  test("the Caja tile becomes an available link once a jornada is open, and navigates here", async ({
    page,
  }) => {
    await openJornada(page);
    await page.getByRole("link", { name: "Ir a Caja" }).click();

    const tile = page.getByRole("link", { name: /Ajustar efectivo/ });
    await expect(tile).toBeVisible();
    await tile.click();
    await expect(page).toHaveURL(/\/worker\/caja\/ajustar-efectivo$/);
  });
});

test.describe("ajustar efectivo — route blocking without an open jornada", () => {
  /*
   * Necesita la caja CERRADA, así que se sale de la siembra del archivo. Y no
   * solo por afirmar lo contrario de lo que habría: el estado sembrado se
   * repone al hidratar, de modo que la pantalla bloqueada que pintó el
   * servidor se sustituye por la de trabajo a media prueba.
   */
  test.use({ fondos: null });

  test("direct navigation without a jornada shows the blocked state, not the form", async ({ page }) => {
    await page.goto("/worker/caja/ajustar-efectivo");

    await expect(page.getByRole("heading", { name: "No hay jornada abierta" })).toBeVisible();
    await expect(page.getByLabel("Efectivo contado")).toHaveCount(0);
  });

  test('"Volver a Caja" from the blocked state returns to Caja', async ({ page }) => {
    await page.goto("/worker/caja/ajustar-efectivo");
    await page.getByRole("link", { name: "Volver a Caja" }).first().click();
    await expect(page).toHaveURL(/\/worker\/caja$/);
  });
});

test.describe("ajustar efectivo — a ciegas", () => {
  test.beforeEach(async ({ page }) => {
    await goToAjustarEfectivo(page);
  });

  test("no enseña el saldo registrado ni calcula la diferencia mientras se cuenta", async ({ page }) => {
    await page.locator("#ajuste-moneda").click();
    await page.getByRole("option", { name: /^EUR/ }).click();
    await page.getByLabel("Efectivo contado").fill("1185");
    for (const gone of ["Saldo registrado", "1.200,00", "Saldo actual", "Saldo después"]) {
      await expect(page.getByText(gone)).toHaveCount(0);
    }
    await expect(page.getByText("Diferencia", { exact: true })).toHaveCount(0);
  });

  test("solo ofrece las monedas habilitadas en la caja", async ({ page }) => {
    await page.locator("#ajuste-moneda").click();
    await expect(page.getByRole("option", { name: /^EUR/ })).toBeVisible();
    await expect(page.getByRole("option", { name: /^CHF/ })).toHaveCount(0);
  });

  test("sin moneda o sin conteo no deja seguir", async ({ page }) => {
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Selecciona la moneda que contaste.")).toBeVisible();
    await expect(page.getByText("Introduce el efectivo contado. Si no hay, escribe 0.")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("avisa de que el valor no podrá cambiarse; «Seguir contando» no registra nada", async ({ page }) => {
    await contar(page, "1185");
    const aviso = page.getByRole("dialog");
    await expect(aviso.getByRole("heading", { name: "El valor introducido no podrá ser cambiado" })).toBeVisible();
    await expect(aviso.getByText("1.185,00 EUR")).toBeVisible();
    await aviso.getByRole("button", { name: "Seguir contando" }).click();
    await expect(page.getByLabel("Efectivo contado")).toHaveValue("1185");
    await page.goto("/worker/caja");
    await expect(page.getByRole("table").first().locator("tbody tr").filter({ hasText: "Ajuste de efectivo" })).toHaveCount(0);
  });

  test("si coincide, no hay ajuste", async ({ page }) => {
    await registrarConteo(page, "1200");
    await expect(page.getByRole("heading", { name: "El conteo coincide" })).toBeVisible();
    await page.getByRole("link", { name: "Ir a Caja" }).click();
    await expect(page.getByRole("table").first().locator("tbody tr").filter({ hasText: "Ajuste de efectivo" })).toHaveCount(0);
  });
});

test.describe("ajustar efectivo — la diferencia, después de registrar", () => {
  test.beforeEach(async ({ page }) => {
    await goToAjustarEfectivo(page);
    await registrarConteo(page, "1185");
  });

  test("la ventana enseña la diferencia y no se puede cerrar sin terminar", async ({ page }) => {
    const ventana = page.getByRole("dialog");
    await expect(ventana.getByRole("heading", { name: "Ajuste registrado · explica la diferencia" })).toBeVisible();
    await expect(ventana.getByText("−15,00 EUR")).toBeVisible();
    await expect(ventana.getByText("Falta efectivo")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(ventana).toBeVisible();
    await expect(ventana.getByRole("button", { name: "Cerrar", exact: true })).toHaveCount(0);
    /* El saldo no aparece ni aquí. */
    await expect(page.getByText("1.200,00")).toHaveCount(0);
  });

  test("solo ofrece motivos compatibles con el signo", async ({ page }) => {
    await page.locator("#ajuste-motivo").click();
    await expect(page.getByRole("option", { name: "Faltante detectado" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Sobrante detectado" })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Otro" })).toBeVisible();
  });

  test("sin motivo, o con «Otro» sin observaciones, no termina", async ({ page }) => {
    await page.getByRole("button", { name: "Guardar motivo y terminar" }).click();
    await expect(page.getByText("Selecciona el motivo de la diferencia.")).toBeVisible();
    await page.locator("#ajuste-motivo").click();
    await page.getByRole("option", { name: "Otro", exact: true }).click();
    await page.getByRole("button", { name: "Guardar motivo y terminar" }).click();
    await expect(page.getByText("Explica el motivo en las observaciones.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ajuste registrado", exact: true })).toHaveCount(0);
  });

  test("con el motivo, termina y lo registra en el libro sin saldos", async ({ page }) => {
    await explicar(page, "Faltante detectado", "Conteo verificado nuevamente.");
    await expect(page.getByRole("heading", { name: "Ajuste registrado", exact: true })).toBeVisible();
    await expect(page.getByText("Faltante detectado")).toBeVisible();
    await expect(page.getByText("Conteo verificado nuevamente.")).toBeVisible();
    await expect(page.getByText("−15,00 EUR")).toBeVisible();
    await expect(page.getByText("Saldo anterior")).toHaveCount(0);
    await expect(page.getByText("Saldo actual")).toHaveCount(0);

    await page.getByRole("link", { name: "Ir a Caja" }).click();
    const row = page.getByRole("table").first().locator("tbody tr").filter({ hasText: "Ajuste de efectivo" });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("Salida");
    await expect(row).toContainText("−15,00");
    await expect(row.locator("td").nth(1)).toHaveText("—");
  });

  test("si abandona la ventana, el ajuste ya está registrado, como «Sin explicar»", async ({ page }) => {
    await page.goto("/worker/caja");
    const row = page.getByRole("table").first().locator("tbody tr").filter({ hasText: "Ajuste de efectivo" });
    await expect(row).toHaveCount(1);
    await row.getByRole("link", { name: "Ver detalle" }).click();
    await expect(page.getByText("Sin explicar").filter({ visible: true }).first()).toBeVisible();
  });
});

test.describe("ajustar efectivo — reposición durante la jornada", () => {
  test("contar después de recibir fondos da una diferencia positiva", async ({ page }) => {
    await goToAjustarEfectivo(page);
    await registrarConteo(page, "1700");
    await expect(page.getByRole("dialog").getByText("+500,00 EUR")).toBeVisible();
    await page.locator("#ajuste-motivo").click();
    await expect(page.getByRole("option", { name: "Faltante detectado" })).toHaveCount(0);
    await page.getByRole("option", { name: "Sobrante detectado", exact: true }).click();
    await page.getByRole("button", { name: "Guardar motivo y terminar" }).click();
    await expect(page.getByRole("heading", { name: "Ajuste registrado", exact: true })).toBeVisible();
    await expect(page.getByText("+500,00 EUR")).toBeVisible();
  });
});

test.describe("ajustar efectivo — layout", () => {
  for (const width of [1440, 1280]) {
    test(`fits without page-level horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await goToAjustarEfectivo(page);
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);
    });
  }

  test("zero console errors across the full flow", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await goToAjustarEfectivo(page);
    await registrarConteo(page, "1185");
    await explicar(page, "Faltante detectado");
    await expect(page.getByRole("heading", { name: "Ajuste registrado", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
