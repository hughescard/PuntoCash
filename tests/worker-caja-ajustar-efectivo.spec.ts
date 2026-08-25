import { test, expect, type Page } from "@playwright/test";

/**
 * Worker Caja — Ajustar efectivo (/worker/caja/ajustar-efectivo).
 *
 * Corrects one enabled currency's CURRENT balance from a physical cash
 * count: the worker declares the counted cash, never an adjustment amount
 * directly, and the difference is computed automatically. Confirming writes
 * exactly one "Ajuste de efectivo" movement and updates only the selected
 * currency's balance — the jornada stays open throughout.
 *
 * `abrirJornada`/`ajustarEfectivo` mutate a client-side, in-memory module —
 * a hard navigation (`page.goto`) re-fetches a fresh server render and loses
 * that state, so every test that needs an open jornada reaches this route by
 * clicking links, never by `page.goto`. Each test gets an isolated browser
 * context, so the in-memory jornada/balances never leak between tests.
 */

async function openJornada(page: Page, fondos: Record<string, string> = { EUR: "1200" }) {
  await page.goto("/worker/caja/fondeo-inicial");
  for (const [currency, value] of Object.entries(fondos)) {
    await page.getByLabel(`Fondo inicial en ${currency}`).fill(value);
  }
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Confirmar y abrir caja" }).click();
  await expect(page.getByRole("heading", { name: "Caja abierta correctamente" })).toBeVisible({
    timeout: 5000,
  });
}

async function goToAjustarEfectivo(page: Page) {
  await page.getByRole("link", { name: "Ir a Caja" }).click();
  await page.getByRole("link", { name: /Ajustar efectivo/ }).click();
  await expect(page.getByRole("heading", { name: "Ajustar efectivo" })).toBeVisible();
}

async function openJornadaAndGo(page: Page, fondos?: Record<string, string>) {
  await openJornada(page, fondos);
  await goToAjustarEfectivo(page);
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
    await openJornadaAndGo(page);

    await expect(page.getByRole("heading", { name: "Ajustar efectivo" })).toBeVisible();
    await expect(
      page.getByText("Corrige el saldo de una moneda a partir de un conteo físico."),
    ).toBeVisible();
    await expect(page.getByText("Jornada abierta")).toBeVisible();
  });

  test("the context strip shows Caja, Trabajador, Jornada and Monedas habilitadas — nothing invented", async ({
    page,
  }) => {
    await openJornadaAndGo(page);

    await expect(page.getByText("Caja 03").first()).toBeVisible();
    await expect(page.getByText("Juan Pérez").first()).toBeVisible();
    await expect(page.getByText("Abierta", { exact: true })).toBeVisible();
    await expect(page.getByText(/Apertura: \d{2}\/\d{2}\/\d{4} · \d{2}:\d{2}/)).toBeVisible();
    await expect(page.getByText("Monedas habilitadas")).toBeVisible();
    await expect(page.getByText("4", { exact: true }).first()).toBeVisible();
  });

  test("Volver a Caja from the form returns to Caja", async ({ page }) => {
    await openJornadaAndGo(page);
    await page.getByRole("link", { name: "Volver a Caja" }).click();
    await expect(page).toHaveURL(/\/worker\/caja$/);
  });
});

test.describe("ajustar efectivo — currency selection", () => {
  test("only currently enabled currencies are offered, never the full catalog", async ({ page }) => {
    await openJornadaAndGo(page);
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
    await openJornadaAndGo(page);
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

  test("selecting a currency reveals its current registered balance, read-only", async ({ page }) => {
    await openJornadaAndGo(page);
    await selectCurrency(page, "EUR");

    await expect(page.getByText("1.200,00 EUR").first()).toBeVisible();
    await expect(page.getByLabel("Saldo registrado (actual)")).toHaveCount(0);
  });
});

test.describe("ajustar efectivo — counted cash and difference", () => {
  test("the difference is computed automatically with an explicit sign, never a direct amount input", async ({
    page,
  }) => {
    await openJornadaAndGo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1185");

    await expect(
      page.getByText("−15,00 EUR").or(page.getByText("-15,00 EUR")).first(),
    ).toBeVisible();
    await expect(page.getByLabel(/^Ajuste$/)).toHaveCount(0);
    await expect(page.getByLabel(/^Diferencia$/)).toHaveCount(0);
  });

  test("a positive count shows an explicit + sign", async ({ page }) => {
    await openJornadaAndGo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1220");

    await expect(page.getByText("+20,00 EUR").first()).toBeVisible();
  });

  test("an equal count shows the zero-difference notice and keeps Continuar disabled", async ({
    page,
  }) => {
    await openJornadaAndGo(page);
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
    await openJornadaAndGo(page);
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
    await openJornadaAndGo(page);
    await page.getByLabel("Motivo del ajuste").click();

    for (const reason of ["Faltante detectado", "Sobrante detectado", "Error de registro", "Otro"]) {
      await expect(page.getByRole("option", { name: reason, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("option")).toHaveCount(4);
  });

  test("observaciones is optional for every reason except Otro", async ({ page }) => {
    await openJornadaAndGo(page);
    await fillStep1(page, { counted: "1185", motivo: "Faltante detectado" });
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  test("observaciones becomes required when the reason is Otro", async ({ page }) => {
    await openJornadaAndGo(page);
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
    await openJornadaAndGo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1185"); // registered 1.200,00 → -15,00
    await page.getByLabel("Motivo del ajuste").click();

    await expect(page.getByRole("option", { name: "Sobrante detectado", exact: true })).toHaveCount(0);
  });

  test('a positive difference does not offer "Faltante detectado"', async ({ page }) => {
    await openJornadaAndGo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1220"); // registered 1.200,00 → +20,00
    await page.getByLabel("Motivo del ajuste").click();

    await expect(page.getByRole("option", { name: "Faltante detectado", exact: true })).toHaveCount(0);
  });

  test('a negative difference offers "Faltante detectado"', async ({ page }) => {
    await openJornadaAndGo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1185");
    await page.getByLabel("Motivo del ajuste").click();

    await expect(page.getByRole("option", { name: "Faltante detectado", exact: true })).toBeVisible();
  });

  test('a positive difference offers "Sobrante detectado"', async ({ page }) => {
    await openJornadaAndGo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1220");
    await page.getByLabel("Motivo del ajuste").click();

    await expect(page.getByRole("option", { name: "Sobrante detectado", exact: true })).toBeVisible();
  });

  test('"Error de registro" stays offered for both a negative and a positive difference', async ({
    page,
  }) => {
    await openJornadaAndGo(page);
    await selectCurrency(page, "EUR");

    await page.getByLabel("Efectivo contado").fill("1185");
    await page.getByLabel("Motivo del ajuste").click();
    await expect(page.getByRole("option", { name: "Error de registro", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByLabel("Efectivo contado").fill("1220");
    await page.getByLabel("Motivo del ajuste").click();
    await expect(page.getByRole("option", { name: "Error de registro", exact: true })).toBeVisible();
  });

  test('"Otro" stays offered for both a negative and a positive difference', async ({ page }) => {
    await openJornadaAndGo(page);
    await selectCurrency(page, "EUR");

    await page.getByLabel("Efectivo contado").fill("1185");
    await page.getByLabel("Motivo del ajuste").click();
    await expect(page.getByRole("option", { name: "Otro", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByLabel("Efectivo contado").fill("1220");
    await page.getByLabel("Motivo del ajuste").click();
    await expect(page.getByRole("option", { name: "Otro", exact: true })).toBeVisible();
  });

  test('flipping + to - clears an already-selected "Sobrante detectado", never swaps it to "Faltante detectado"', async ({
    page,
  }) => {
    await openJornadaAndGo(page);
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

  test('flipping - to + clears an already-selected "Faltante detectado", never swaps it to "Sobrante detectado"', async ({
    page,
  }) => {
    await openJornadaAndGo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1185"); // -15,00
    await page.getByLabel("Motivo del ajuste").click();
    await page.getByRole("option", { name: "Faltante detectado", exact: true }).click();
    await expect(page.getByLabel("Motivo del ajuste")).toHaveText("Faltante detectado");

    await page.getByLabel("Efectivo contado").fill("1220"); // now +20,00

    await expect(page.getByLabel("Motivo del ajuste")).not.toHaveText("Faltante detectado");
    await expect(page.getByLabel("Motivo del ajuste")).not.toHaveText("Sobrante detectado");
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  test('changing sign does NOT clear "Error de registro"', async ({ page }) => {
    await openJornadaAndGo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1220");
    await page.getByLabel("Motivo del ajuste").click();
    await page.getByRole("option", { name: "Error de registro", exact: true }).click();

    await page.getByLabel("Efectivo contado").fill("1185");

    await expect(page.getByLabel("Motivo del ajuste")).toHaveText("Error de registro");
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  test('changing sign does NOT clear "Otro" (still enforces its own observaciones requirement)', async ({
    page,
  }) => {
    await openJornadaAndGo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1220");
    await page.getByLabel("Motivo del ajuste").click();
    await page.getByRole("option", { name: "Otro", exact: true }).click();

    await page.getByLabel("Efectivo contado").fill("1185");

    await expect(page.getByLabel("Motivo del ajuste")).toHaveText("Otro");
    // "Otro" still requires observaciones (§5) — unaffected by this change.
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await page.locator("#ajuste-observaciones").fill("Conteo repetido.");
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  test("an invalid reason/sign combination cannot be carried into Step 2 via Enter-to-submit", async ({
    page,
  }) => {
    // Select a compatible reason, then flip the sign without re-touching the
    // select — Continuar (and a plain Enter submit) must both stay blocked
    // until the worker explicitly re-declares a compatible reason.
    await openJornadaAndGo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1220");
    await page.getByLabel("Motivo del ajuste").click();
    await page.getByRole("option", { name: "Sobrante detectado", exact: true }).click();

    const counted = page.getByLabel("Efectivo contado");
    await counted.fill("1185");
    await counted.press("Enter");

    await expect(page.getByRole("heading", { name: "Revisar ajuste de efectivo" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Registrar conteo" })).toBeVisible();
  });

  test("Review always shows a sign-compatible reason", async ({ page }) => {
    await openJornadaAndGo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1185");
    await page.getByLabel("Motivo del ajuste").click();
    await page.getByRole("option", { name: "Faltante detectado", exact: true }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("heading", { name: "Revisar ajuste de efectivo" })).toBeVisible();
    await expect(page.getByText("Faltante detectado")).toBeVisible();
    await expect(page.getByText("Sobrante detectado")).toHaveCount(0);
  });

  test("Result always shows a sign-compatible reason", async ({ page }) => {
    await openJornadaAndGo(page);
    await completeAdjustment(page, { currency: "EUR", counted: "1220", motivo: "Sobrante detectado" });

    await expect(page.getByText("Sobrante detectado").first()).toBeVisible();
    await expect(page.getByText("Faltante detectado")).toHaveCount(0);
  });
});

test.describe("ajustar efectivo — live summary (Step 1)", () => {
  test("reflects registered balance, counted cash and difference, with no duplicated 'Saldo después'", async ({
    page,
  }) => {
    await openJornadaAndGo(page);
    await fillStep1(page, { counted: "1185", motivo: "Faltante detectado", observaciones: "Conteo verificado nuevamente." });

    await expect(page.getByText("Resumen del ajuste")).toBeVisible();
    await expect(page.getByText("1.200,00 EUR").first()).toBeVisible();
    await expect(page.getByText("1.185,00 EUR").first()).toBeVisible();
    await expect(page.getByText(/Saldo después/)).toHaveCount(0);
  });
});

test.describe("ajustar efectivo — Step 1 → Step 2", () => {
  test("Continuar opens Revisar ajuste de efectivo", async ({ page }) => {
    await openJornadaAndGo(page);
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
    await openJornadaAndGo(page);
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
    await openJornadaAndGo(page);
    await fillStep1(page, { counted: "1185", motivo: "Faltante detectado", observaciones: "Nota." });
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Volver" }).click();

    await expect(page.getByRole("heading", { name: "Registrar conteo" })).toBeVisible();
    await expect(page.getByLabel("Efectivo contado")).toHaveValue("1185");
    await expect(page.locator("#ajuste-observaciones")).toHaveValue("Nota.");
  });
});

test.describe("ajustar efectivo — confirmation and domain effects", () => {
  test("confirming updates only the adjusted currency's balance", async ({ page }) => {
    await openJornada(page, { EUR: "1200", USD: "500" });
    await goToAjustarEfectivo(page);
    await completeAdjustment(page, { currency: "EUR", counted: "1185" });

    await page.getByRole("link", { name: "Ir a Caja" }).click();
    const table = page.getByRole("table").first();
    await expect(table.locator("tr", { hasText: "EUR" })).toContainText("1.185,00");
    await expect(table.locator("tr", { hasText: "USD" })).toContainText("500,00");
  });

  test("a negative difference records a Salida movement with the exact concepto and no operation code", async ({
    page,
  }) => {
    await openJornadaAndGo(page);
    await completeAdjustment(page, { counted: "1185", motivo: "Faltante detectado" });
    await page.getByRole("link", { name: "Ir a Caja" }).click();

    const movementsTable = page.getByRole("table").nth(1);
    const row = movementsTable.locator("tbody tr").filter({ hasText: "Ajuste de efectivo" }).first();
    await expect(row).toContainText("Salida");
    await expect(row).toContainText("−15,00");
    await expect(row.locator("td").nth(1)).toHaveText("—");
  });

  test("a positive difference records an Entrada movement", async ({ page }) => {
    await openJornadaAndGo(page);
    await completeAdjustment(page, { counted: "1220", motivo: "Sobrante detectado" });
    await page.getByRole("link", { name: "Ir a Caja" }).click();

    const movementsTable = page.getByRole("table").nth(1);
    const row = movementsTable.locator("tbody tr").filter({ hasText: "Ajuste de efectivo" }).first();
    await expect(row).toContainText("Entrada");
    await expect(row).toContainText("+20,00");
  });

  test("historical movements are untouched by the adjustment", async ({ page }) => {
    await openJornadaAndGo(page);
    await completeAdjustment(page, { counted: "1185", motivo: "Faltante detectado" });
    await page.getByRole("link", { name: "Ir a Caja" }).click();

    const movementsTable = page.getByRole("table").nth(1);
    await expect(movementsTable.getByText("Fondeo inicial")).toBeVisible();
  });

  test("the jornada remains open (no arqueo/cierre triggered) after confirming", async ({ page }) => {
    await openJornadaAndGo(page);
    await completeAdjustment(page, { counted: "1185", motivo: "Faltante detectado" });
    await page.getByRole("link", { name: "Ir a Caja" }).click();

    await expect(page.getByText("Operativa").first()).toBeVisible();
    const tile = page.getByRole("link", { name: /Ajustar efectivo/ });
    await expect(tile).toBeVisible();
  });

  test("a zero-value count is not reachable as a confirmed adjustment (Continuar blocks it)", async ({
    page,
  }) => {
    await openJornadaAndGo(page);
    await selectCurrency(page, "EUR");
    await page.getByLabel("Efectivo contado").fill("1200");
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });
});

test.describe("ajustar efectivo — result", () => {
  test("shows Saldo anterior, Ajuste and Saldo actual together — intentional here, unlike Steps 1–2", async ({
    page,
  }) => {
    await openJornadaAndGo(page);
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
    await openJornadaAndGo(page);
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
    await openJornadaAndGo(page);
    await completeAdjustment(page, { counted: "1185", motivo: "Faltante detectado" });
    await page.getByRole("link", { name: "Ir a Caja" }).click();

    await expect(page).toHaveURL(/\/worker\/caja$/);
    const table = page.getByRole("table").first();
    await expect(table.locator("tr", { hasText: "EUR" })).toContainText("1.185,00");
    const movementsTable = page.getByRole("table").nth(1);
    await expect(movementsTable.getByText("Ajuste de efectivo").first()).toBeVisible();
  });

  test("does not auto-redirect away from the result screen", async ({ page }) => {
    await openJornadaAndGo(page);
    await completeAdjustment(page, { counted: "1185", motivo: "Faltante detectado" });
    await page.waitForTimeout(800);
    await expect(page.getByText("Ajuste registrado correctamente")).toBeVisible();
  });
});

test.describe("ajustar efectivo — layout", () => {
  for (const width of [1440, 1280]) {
    test(`fits without page-level horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openJornadaAndGo(page);

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

    await openJornadaAndGo(page);
    await completeAdjustment(page, { counted: "1185", motivo: "Faltante detectado" });
    await page.getByRole("link", { name: "Ir a Caja" }).click();

    expect(errors).toEqual([]);
  });
});
