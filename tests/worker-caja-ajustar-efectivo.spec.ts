import { test, expect, type Page } from "@playwright/test";

import { esperarFondeoVivo, rellenar } from "./worker-helpers";
import { cajaConJornadaAbierta, EQUIPO_SIN_JORNADA } from "./storage-state";

/**
 * Worker Caja — Ajustar efectivo (/worker/caja/ajustar-efectivo).
 *
 * Corrects one enabled currency's CURRENT balance from a physical cash
 * count: the worker declares the counted cash, never an adjustment amount
 * directly, and the difference is computed automatically. Confirming writes
 * exactly one "Ajuste de efectivo" movement and updates only the selected
 * currency's balance — the jornada stays open throughout.
 *
 * `abrirJornada`/`ajustarEfectivo` mutan un módulo del lado del cliente que
 * ahora guarda su estado en el equipo, así que la jornada sobrevive a un
 * `page.goto`. Estas pruebas siguen llegando aquí **por enlace** de todas
 * formas: es más rápido que una navegación dura, y es el camino que recorre un
 * trabajador. Cada prueba tiene su propio contexto de navegador, con su propio
 * `localStorage`, así que ni la jornada ni los saldos se filtran entre
 * pruebas.
 *
 * La jornada **se siembra** con 1.200 EUR, que es lo que abría el fondeo que
 * había aquí: veintitrés de estas pruebas la necesitan abierta y ninguna trata
 * de abrirla. Los dos grupos que sí tratan de eso —la disponibilidad del
 * azulejo y el bloqueo de la ruta— se salen de la siembra y abren por la
 * interfaz.
 */

test.use({ storageState: cajaConJornadaAbierta({ EUR: 1_200 }) });

async function openJornada(page: Page, fondos: Record<string, string> = { EUR: "1200" }) {
  await page.goto("/worker/caja/fondeo-inicial");
  await esperarFondeoVivo(page);
  for (const [currency, value] of Object.entries(fondos)) {
    await rellenar(page.getByLabel(`Fondo inicial en ${currency}`), value);
  }
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Confirmar y abrir caja" }).click();
  await expect(page.getByRole("heading", { name: "Caja abierta correctamente" })).toBeVisible({
    timeout: 5000,
  });
}

/**
 * Entra a Ajustar efectivo por su ruta, que con la jornada sembrada es
 * directo. Pasa por Caja —y no por la URL del formulario— para que el camino
 * siga siendo el del trabajador: el azulejo de Caja es lo único que lleva
 * aquí.
 */
async function goToAjustarEfectivo(page: Page) {
  await page.goto("/worker/caja");
  await page.getByRole("link", { name: /Ajustar efectivo/ }).click();
  await expect(page.getByRole("heading", { name: "Ajustar efectivo" })).toBeVisible();
}

async function selectCurrency(page: Page, code: string) {
  await page.getByRole("button", { name: /^Moneda:/ }).click();
  await page.getByRole("option", { name: new RegExp(`^${code}`) }).click();
}

async function fillStep1(
  page: Page,
  {
    currency = "EUR",
    counted,
    motivo = "Faltante detectado",
    observaciones,
  }: { currency?: string; counted: string; motivo?: string; observaciones?: string },
) {
  await selectCurrency(page, currency);
  await page.getByLabel("Efectivo contado").fill(counted);
  await page.getByLabel("Motivo del ajuste").click();
  await page.getByRole("option", { name: motivo, exact: true }).click();
  if (observaciones) await page.locator("#ajuste-observaciones").fill(observaciones);
}

async function completeAdjustment(
  page: Page,
  opts: { currency?: string; counted: string; motivo?: string; observaciones?: string },
) {
  await fillStep1(page, opts);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Revisar ajuste de efectivo" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar ajuste" }).click();
  await expect(page.getByRole("heading", { name: "Ajuste registrado correctamente" })).toBeVisible({
    timeout: 3000,
  });
}

test.describe("ajustar efectivo — action availability", () => {
  /*
   * Necesita la caja CERRADA, así que se sale de la siembra del archivo. Y no
   * solo por afirmar lo contrario de lo que habría: el estado sembrado se
   * repone al hidratar, de modo que la pantalla bloqueada que pintó el
   * servidor se sustituye por la de trabajo a media prueba.
   */
  test.use({ storageState: EQUIPO_SIN_JORNADA });

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
  test.use({ storageState: EQUIPO_SIN_JORNADA });

  test("direct navigation without a jornada shows the blocked state, not the form", async ({ page }) => {
    await page.goto("/worker/caja/ajustar-efectivo");

    await expect(page.getByText("Caja cerrada", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Debes abrir una jornada antes de ajustar efectivo."),
    ).toBeVisible();
    await expect(page.getByLabel("Efectivo contado")).toHaveCount(0);
  });

  test('"Volver a Caja" from the blocked state returns to Caja', async ({ page }) => {
    await page.goto("/worker/caja/ajustar-efectivo");
    await page.getByRole("link", { name: "Volver a Caja" }).first().click();
    await expect(page).toHaveURL(/\/worker\/caja$/);
  });
});

test.describe("ajustar efectivo — header and context", () => {
  test("renders the approved header content and Jornada abierta badge", async ({ page }) => {
    await goToAjustarEfectivo(page);

    await expect(page.getByRole("heading", { name: "Ajustar efectivo" })).toBeVisible();
    await expect(
      page.getByText("Corrige el saldo de una moneda a partir de un conteo físico."),
    ).toBeVisible();
    await expect(page.getByText("Jornada abierta")).toBeVisible();
  });

  test("the context strip shows Caja, Trabajador, Jornada and Monedas habilitadas — nothing invented", async ({
    page,
  }) => {
    await goToAjustarEfectivo(page);

    await expect(page.getByText("Caja 03").first()).toBeVisible();
    await expect(page.getByText("Juan Pérez").first()).toBeVisible();
    await expect(page.getByText("Abierta", { exact: true })).toBeVisible();
    await expect(page.getByText(/Apertura: \d{2}\/\d{2}\/\d{4} · \d{2}:\d{2}/)).toBeVisible();
    await expect(page.getByText("Monedas habilitadas")).toBeVisible();
    await expect(page.getByText("4", { exact: true }).first()).toBeVisible();
  });

});

test.describe("ajustar efectivo — currency selection", () => {
  test("only currently enabled currencies are offered, never the full catalog", async ({ page }) => {
    await goToAjustarEfectivo(page);
    await page.getByRole("button", { name: /^Moneda:/ }).click();

    for (const currency of ["CUP", "USD", "EUR", "GBP"]) {
      await expect(page.getByRole("option", { name: new RegExp(`^${currency}`) })).toBeVisible();
    }
    // CAD is in the full catalog but not enabled for Caja 03 by default.
    await expect(page.getByRole("option", { name: /^CAD/ })).toHaveCount(0);
  });

  test("options render an SVG flag (never emoji) marked aria-hidden, plus code and name", async ({
    page,
  }) => {
    await goToAjustarEfectivo(page);
    await page.getByRole("button", { name: /^Moneda:/ }).click();

    await expect(page.getByRole("option", { name: "EUR — Euro" }).or(page.getByRole("option", { name: /^EUR/ }))).toBeVisible();
    const flags = page.locator("svg[data-currency-flag]");
    expect(await flags.count()).toBeGreaterThan(0);
    for (const flag of await flags.all()) {
      await expect(flag).toHaveAttribute("aria-hidden", "true");
    }
    const hasRegionalIndicator = await page.evaluate(() =>
      /[\u{1F1E6}-\u{1F1FF}]/u.test(document.body.textContent ?? ""),
    );
    expect(hasRegionalIndicator).toBe(false);
  });

});

test.describe("ajustar efectivo — counted cash and difference", () => {
  test("the difference is computed automatically with an explicit sign, never a direct amount input", async ({
    page,
  }) => {
    await goToAjustarEfectivo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1185");

    await expect(
      page.getByText("−15,00 EUR").or(page.getByText("-15,00 EUR")).first(),
    ).toBeVisible();
    await expect(page.getByLabel(/^Ajuste$/)).toHaveCount(0);
    await expect(page.getByLabel(/^Diferencia$/)).toHaveCount(0);
  });

  test("an equal count shows the zero-difference notice and keeps Continuar disabled", async ({
    page,
  }) => {
    await goToAjustarEfectivo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1200");

    await expect(
      page.getByText(
        "El efectivo contado coincide con el saldo registrado. No es necesario realizar un ajuste.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  test("Continuar stays disabled until currency, counted cash and reason are all set", async ({
    page,
  }) => {
    await goToAjustarEfectivo(page);
    const continuar = page.getByRole("button", { name: "Continuar" });
    await expect(continuar).toBeDisabled();

    await selectCurrency(page, "EUR");
    await expect(continuar).toBeDisabled();

    await page.getByLabel("Efectivo contado").fill("1185");
    await expect(continuar).toBeDisabled();

    await page.getByLabel("Motivo del ajuste").click();
    await page.getByRole("option", { name: "Faltante detectado", exact: true }).click();
    await expect(continuar).toBeEnabled();
  });
});

test.describe("ajustar efectivo — motivo and observaciones", () => {
  test("offers exactly the four approved reasons, no more", async ({ page }) => {
    await goToAjustarEfectivo(page);
    await page.getByLabel("Motivo del ajuste").click();

    for (const reason of ["Faltante detectado", "Sobrante detectado", "Error de registro", "Otro"]) {
      await expect(page.getByRole("option", { name: reason, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("option")).toHaveCount(4);
  });

  test("observaciones is optional for every reason except Otro", async ({ page }) => {
    await goToAjustarEfectivo(page);
    await fillStep1(page, { counted: "1185", motivo: "Faltante detectado" });
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  test("observaciones becomes required when the reason is Otro", async ({ page }) => {
    await goToAjustarEfectivo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1185");
    await page.getByLabel("Motivo del ajuste").click();
    await page.getByRole("option", { name: "Otro", exact: true }).click();

    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await expect(page.locator("#ajuste-observaciones")).toHaveAttribute("aria-required", "true");

    await page.locator("#ajuste-observaciones").fill("Conteo repetido dos veces.");
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });
});

test.describe("ajustar efectivo — reason validity vs. difference sign", () => {
  test('a negative difference does not offer "Sobrante detectado"', async ({ page }) => {
    await goToAjustarEfectivo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1185"); // registered 1.200,00 → -15,00
    await page.getByLabel("Motivo del ajuste").click();

    await expect(page.getByRole("option", { name: "Sobrante detectado", exact: true })).toHaveCount(0);
  });

  test('flipping + to - clears an already-selected "Sobrante detectado", never swaps it to "Faltante detectado"', async ({
    page,
  }) => {
    await goToAjustarEfectivo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1220"); // +20,00
    await page.getByLabel("Motivo del ajuste").click();
    await page.getByRole("option", { name: "Sobrante detectado", exact: true }).click();
    await expect(page.getByLabel("Motivo del ajuste")).toHaveText("Sobrante detectado");

    await page.getByLabel("Efectivo contado").fill("1185"); // now -15,00

    await expect(page.getByLabel("Motivo del ajuste")).not.toHaveText("Sobrante detectado");
    await expect(page.getByLabel("Motivo del ajuste")).not.toHaveText("Faltante detectado");
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

});

test.describe("ajustar efectivo — live summary (Step 1)", () => {
  test("reflects registered balance, counted cash and difference, with no duplicated 'Saldo después'", async ({
    page,
  }) => {
    await goToAjustarEfectivo(page);
    await fillStep1(page, { counted: "1185", motivo: "Faltante detectado", observaciones: "Conteo verificado nuevamente." });

    await expect(page.getByText("Resumen del ajuste")).toBeVisible();
    await expect(page.getByText("1.200,00 EUR").first()).toBeVisible();
    await expect(page.getByText("1.185,00 EUR").first()).toBeVisible();
    await expect(page.getByText(/Saldo después/)).toHaveCount(0);
  });
});

test.describe("ajustar efectivo — Step 1 → Step 2", () => {
  test("Continuar opens Revisar ajuste de efectivo", async ({ page }) => {
    await goToAjustarEfectivo(page);
    await fillStep1(page, { counted: "1185" });
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("heading", { name: "Revisar ajuste de efectivo" })).toBeVisible();
    await expect(
      page.getByText("Verifica la información antes de modificar el saldo de Caja 03."),
    ).toBeVisible();
  });

  test("the review preserves every entered value, with no duplicated 'Saldo después'", async ({
    page,
  }) => {
    await goToAjustarEfectivo(page);
    await fillStep1(page, { counted: "1185", motivo: "Error de registro", observaciones: "Conteo verificado nuevamente." });
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByText("EUR · Euro")).toBeVisible();
    await expect(page.getByText("1.200,00 EUR")).toBeVisible();
    await expect(page.getByText("1.185,00 EUR")).toBeVisible();
    await expect(page.getByText("−15,00 EUR").or(page.getByText("-15,00 EUR"))).toBeVisible();
    await expect(page.getByText("Error de registro")).toBeVisible();
    await expect(page.getByText("Conteo verificado nuevamente.")).toBeVisible();
    await expect(page.getByText("Se registrará al confirmar")).toBeVisible();
    await expect(page.getByText(/Saldo después/)).toHaveCount(0);
  });

  test("Volver returns to Step 1 with the draft intact", async ({ page }) => {
    await goToAjustarEfectivo(page);
    await fillStep1(page, { counted: "1185", motivo: "Faltante detectado", observaciones: "Nota." });
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Volver" }).click();

    await expect(page.getByRole("heading", { name: "Registrar conteo" })).toBeVisible();
    await expect(page.getByLabel("Efectivo contado")).toHaveValue("1185");
    await expect(page.locator("#ajuste-observaciones")).toHaveValue("Nota.");
  });
});

test.describe("ajustar efectivo — confirmation and domain effects", () => {
  test("a negative difference records a Salida movement with the exact concepto and no operation code", async ({
    page,
  }) => {
    await goToAjustarEfectivo(page);
    await completeAdjustment(page, { counted: "1185", motivo: "Faltante detectado" });
    await page.getByRole("link", { name: "Ir a Caja" }).click();

    const movementsTable = page.getByRole("table").nth(1);
    const row = movementsTable.locator("tbody tr").filter({ hasText: "Ajuste de efectivo" }).first();
    await expect(row).toContainText("Salida");
    await expect(row).toContainText("−15,00");
    await expect(row.locator("td").nth(1)).toHaveText("—");
  });

});

test.describe("ajustar efectivo — result", () => {
  test("shows Saldo anterior, Ajuste and Saldo actual together — intentional here, unlike Steps 1–2", async ({
    page,
  }) => {
    await goToAjustarEfectivo(page);
    await completeAdjustment(page, { counted: "1185", motivo: "Faltante detectado" });

    await expect(page.getByText("Ajuste registrado correctamente")).toBeVisible();
    await expect(
      page.getByText("El saldo de EUR · Euro en Caja 03 se actualizó correctamente."),
    ).toBeVisible();
    await expect(page.getByText("Saldo anterior").first()).toBeVisible();
    await expect(page.getByText("1.200,00 EUR").first()).toBeVisible();
    await expect(page.getByText("Saldo actual").first()).toBeVisible();
    await expect(page.getByText("1.185,00 EUR").first()).toBeVisible();
    await expect(page.getByText("Faltante detectado").first()).toBeVisible();
    await expect(page.getByText("Juan Pérez").first()).toBeVisible();
    await expect(page.getByText(/\d{2}\/\d{2}\/\d{4} · \d{2}:\d{2}/).first()).toBeVisible();
  });

  test('"Imprimir comprobante" triggers the existing browser-print mechanism', async ({ page }) => {
    await goToAjustarEfectivo(page);
    await completeAdjustment(page, { counted: "1185", motivo: "Faltante detectado" });

    let printed = false;
    await page.exposeFunction("__notifyPrint", () => {
      printed = true;
    });
    await page.evaluate(() => {
      window.print = () => (window as unknown as { __notifyPrint: () => void }).__notifyPrint();
    });
    await page.getByRole("button", { name: "Imprimir comprobante" }).click();
    expect(printed).toBe(true);
  });

  test('"Ir a Caja" returns to Caja, which shows the corrected balance and the new movement', async ({
    page,
  }) => {
    await goToAjustarEfectivo(page);
    await completeAdjustment(page, { counted: "1185", motivo: "Faltante detectado" });
    await page.getByRole("link", { name: "Ir a Caja" }).click();

    await expect(page).toHaveURL(/\/worker\/caja$/);
    const table = page.getByRole("table").first();
    await expect(table.locator("tr", { hasText: "EUR" })).toContainText("1.185,00");
    const movementsTable = page.getByRole("table").nth(1);
    await expect(movementsTable.getByText("Ajuste de efectivo").first()).toBeVisible();
  });

  test("does not auto-redirect away from the result screen", async ({ page }) => {
    await goToAjustarEfectivo(page);
    await completeAdjustment(page, { counted: "1185", motivo: "Faltante detectado" });
    await page.waitForTimeout(800);
    await expect(page.getByText("Ajuste registrado correctamente")).toBeVisible();
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
    await completeAdjustment(page, { counted: "1185", motivo: "Faltante detectado" });
    await page.getByRole("link", { name: "Ir a Caja" }).click();

    expect(errors).toEqual([]);
  });
});
