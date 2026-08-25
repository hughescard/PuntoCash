import { test, expect, type Page } from "@playwright/test";

/**
 * Worker Caja — the operational/financial register view.
 *
 * Phase 1: balances, today's metrics, a movement ledger and an actions area
 * that visibly prepares (but does not implement) fund/adjust/transfer/close.
 * Data comes from `src/features/caja/caja-data.ts`.
 */

/**
 * The print-only "Imprimir resumen" section repeats several of these same
 * labels and figures off-screen (`hidden print:block`). Filtering to what is
 * actually rendered keeps every assertion about the on-screen page.
 */
function onScreen(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true });
}

/** Reads the "Disponible después" figure (with currency) off an operation's own detail page. */
async function readDisponibleDespues(page: Page): Promise<string | undefined> {
  const row = page.locator("div").filter({ hasText: /^Disponible después/ }).last();
  const text = await row.textContent();
  return text?.replace("Disponible después", "").trim();
}

test.describe("worker caja — render and shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/caja");
  });

  test("renders the page header and marks Caja as the active nav item", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Caja", exact: true })).toBeVisible();
    await expect(
      page.getByText("Consulta el estado operativo y financiero de tu caja asignada."),
    ).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(nav.getByRole("link", { name: "Caja" })).toHaveAttribute("aria-current", "page");
  });

  test("shows the register summary", async ({ page }) => {
    await expect(onScreen(page, "Caja 03").first()).toBeVisible();
    await expect(onScreen(page, "Juan Pérez").first()).toBeVisible();
    await expect(onScreen(page, "Operativa").first()).toBeVisible();
    await expect(onScreen(page, "Última actualización").first()).toBeVisible();
  });
});

test.describe("worker caja — balances", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/caja");
  });

  test("shows CUP, USD, EUR and GBP with SVG flags and canonical amounts", async ({ page }) => {
    await expect(page.getByText("Saldos de caja")).toBeVisible();
    const balancesTable = page.getByRole("table").first();

    for (const [currency, amount] of [
      ["CUP", "245.000,00"],
      ["USD", "3.850,00"],
      ["EUR", "2.120,00"],
      ["GBP", "950,00"],
    ] as const) {
      const row = balancesTable.locator("tbody tr").filter({ hasText: currency });
      await expect(row).toBeVisible();
      await expect(row.getByText(amount, { exact: true })).toBeVisible();
      await expect(row.locator("svg[data-currency-flag]")).toHaveCount(1);
    }
  });

  test("flags stay decorative SVGs, never emoji", async ({ page }) => {
    const flags = page.getByRole("main").locator("svg[data-currency-flag]");
    expect(await flags.count()).toBeGreaterThan(0);
    for (const flag of await flags.all()) {
      await expect(flag).toHaveAttribute("aria-hidden", "true");
    }
    const hasRegionalIndicator = await page.evaluate(() =>
      /[\u{1F1E6}-\u{1F1FF}]/u.test(document.body.textContent ?? ""),
    );
    expect(hasRegionalIndicator).toBe(false);
  });

  test("flags a low balance as text, not colour alone", async ({ page }) => {
    const balancesTable = page.getByRole("table").first();
    const eurRow = balancesTable.locator("tbody tr").filter({ hasText: "EUR" });
    await expect(eurRow.getByText("Nivel bajo")).toBeVisible();
    const cupRow = balancesTable.locator("tbody tr").filter({ hasText: "CUP" });
    await expect(cupRow.getByText("Normal")).toBeVisible();
  });
});

test.describe("worker caja — metrics and alerts", () => {
  test("shows today's operational metrics", async ({ page }) => {
    await page.goto("/worker/caja");
    for (const label of [
      "Operaciones de hoy",
      "Entradas de hoy",
      "Salidas de hoy",
      "Moneda con mayor movimiento",
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("shows the low-EUR alert using the established status language", async ({ page }) => {
    await page.goto("/worker/caja");
    const alert = page.getByRole("status").filter({ hasText: "Efectivo bajo en EUR" });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("nivel operativo recomendado");
  });
});

test.describe("worker caja — movements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/caja");
  });

  test("renders the ledger with pagination", async ({ page }) => {
    await expect(page.getByText("Movimientos de caja")).toBeVisible();
    const movementsTable = page.getByRole("table").nth(1);
    for (const heading of ["Fecha y hora", "Operación", "Tipo", "Concepto", "Moneda", "Importe"]) {
      await expect(movementsTable.getByRole("columnheader", { name: heading })).toBeVisible();
    }
    await expect(page.getByText(/Mostrando \d+–\d+ de \d+ movimientos/)).toBeVisible();
  });

  test("filters by Tipo = Entrada", async ({ page }) => {
    const table = page.getByRole("table").nth(1);
    await page.getByLabel("Tipo").click();
    await page.getByRole("option", { name: "Entrada", exact: true }).click();
    await expect(table.locator("tbody tr").first()).toBeVisible();

    const types = await table.locator("tbody tr td:nth-child(3)").allTextContents();
    expect(types.length).toBeGreaterThan(0);
    for (const text of types) expect(text.trim()).toBe("Entrada");
  });

  test("filters by Moneda", async ({ page }) => {
    const table = page.getByRole("table").nth(1);
    await page.getByLabel("Moneda").click();
    await page.getByRole("option", { name: "EUR", exact: true }).click();
    await expect(table.locator("tbody tr").first()).toBeVisible();

    const currencies = await table.locator("tbody tr td:nth-child(5)").allTextContents();
    expect(currencies.length).toBeGreaterThan(0);
    for (const text of currencies) expect(text.trim()).toBe("EUR");
  });

  test("a currency with no movements shows the empty state, not an error", async ({ page }) => {
    await page.getByLabel("Moneda").click();
    await page.getByRole("option", { name: "GBP", exact: true }).click();
    await expect(page.getByText("No encontramos movimientos")).toBeVisible();
  });

  test("searches by operation code", async ({ page }) => {
    const table = page.getByRole("table").nth(1);
    await page.getByPlaceholder("Buscar por operación o concepto").fill("PC-260818-005004");
    await expect(table.locator("tbody tr").first()).toBeVisible();

    const rows = table.locator("tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
    for (const text of await rows.allTextContents()) {
      expect(text).toContain("PC-260818-005004");
    }
  });

  test("Limpiar filtros restores the full ledger", async ({ page }) => {
    await page.getByPlaceholder("Buscar por operación o concepto").fill("zzz-no-match-zzz");
    await expect(page.getByText("No encontramos movimientos")).toBeVisible();

    // The filter bar's own button, not the empty state's copy — it is the
    // first "Limpiar filtros" in DOM order, above the table.
    await page.getByRole("button", { name: "Limpiar filtros" }).first().click();
    await expect(page.getByText("No encontramos movimientos")).toHaveCount(0);
  });

  test("an operation code links to its real detail page, never a 404", async ({ page }) => {
    const table = page.getByRole("table").nth(1);
    const link = table.getByRole("link", { name: /^PC-\d{6}-\d{6}$/ }).first();
    const code = (await link.textContent())?.trim();
    await link.click();

    await expect(page).toHaveURL(new RegExp(`/worker/operaciones/${code}$`));
    await expect(page.getByRole("heading", { name: `Operación ${code}` })).toBeVisible();
  });

  test("pagination still works", async ({ page }) => {
    const table = page.getByRole("table").nth(1);
    // Fecha y hora (unlike Operación) is never blank, so it reliably proves
    // page 2 shows a different, older slice of the ledger.
    const firstDatePage1 = await table.locator("tbody tr td:nth-child(1)").first().textContent();

    await page.getByRole("navigation", { name: "Paginación" }).getByRole("button", { name: "2", exact: true }).click();
    await expect(page.getByText(/Mostrando 21–\d+/)).toBeVisible();

    const firstDatePage2 = await table.locator("tbody tr td:nth-child(1)").first().textContent();
    expect(firstDatePage2).not.toEqual(firstDatePage1);
  });
});

test.describe("worker caja — historical cash-balance consistency", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/caja");
  });

  /**
   * Regression coverage for the fix: the Caja ledger must display an
   * operation's own historical cash snapshot rather than a value
   * reconstructed to make the series terminate at today's live balance.
   */
  test("PC-260818-005004's EUR movement shows its historical snapshot, not the current balance", async ({
    page,
  }) => {
    const table = page.getByRole("table").nth(1);
    const row = table
      .locator("tbody tr")
      .filter({ hasText: "PC-260818-005004" })
      .filter({ hasText: "EUR" });

    await expect(row.getByText("Salida", { exact: true })).toBeVisible();
    await expect(row.getByText("−920,00", { exact: true })).toBeVisible();
    // The live EUR balance shown in "Saldos de caja" is 2.120,00 — if this
    // cell showed that instead, the fix has regressed.
    await expect(row.getByText("330,00", { exact: true })).toBeVisible();
    await expect(row.getByText("2.120,00")).toHaveCount(0);
  });

  test("that value matches the operation's own amount.cashSnapshot.after, read from its detail page", async ({
    page,
  }) => {
    const table = page.getByRole("table").nth(1);
    const row = table
      .locator("tbody tr")
      .filter({ hasText: "PC-260818-005004" })
      .filter({ hasText: "EUR" });
    // "Saldo después" (index 6) — not the last column: "Acciones" (§ Cash
    // Movement Detail) comes after it.
    const ledgerSaldoDespues = (await row.locator("td").nth(6).textContent())?.trim();

    await page.goto("/worker/operaciones/PC-260818-005004");
    const detailCashAfter = await readDisponibleDespues(page);

    // The ledger shows the bare figure ("330,00"); the detail card shows it
    // with the currency code appended ("330,00 EUR") — same historical value.
    expect(detailCashAfter).toBe(`${ledgerSaldoDespues} EUR`);
  });

  test("snapshot-anchored rows are not overwritten across every Cambio de moneda operation, not just one", async ({
    page,
  }) => {
    const table = page.getByRole("table").nth(1);
    // Every "Cambio de moneda" Salida row's own operation detail must report
    // the exact same "Disponible después" the ledger shows — generic across
    // the whole ledger, not special-cased to a single code.
    const salidaRows = table.locator("tbody tr").filter({ hasText: "Cambio de moneda" }).filter({
      hasText: "Salida",
    });
    const sampleSize = Math.min(3, await salidaRows.count());
    expect(sampleSize).toBeGreaterThan(0);

    for (let i = 0; i < sampleSize; i++) {
      const row = salidaRows.nth(i);
      const cells = await row.locator("td").allTextContents();
      const code = cells[1]?.trim();
      const ledgerCurrency = cells[4]?.trim();
      // "Saldo después" is second-to-last: "Acciones" (§ Cash Movement Detail) is the final column.
      const ledgerSaldoDespues = cells[cells.length - 2]?.trim();

      await page.goto(`/worker/operaciones/${code}`);
      const detailCashAfter = await readDisponibleDespues(page);

      expect(detailCashAfter).toBe(`${ledgerSaldoDespues} ${ledgerCurrency}`);
      await page.goto("/worker/caja");
    }
  });

  test("operations without a cash snapshot still fall back to a computed running balance", async ({
    page,
  }) => {
    const table = page.getByRole("table").nth(1);
    // A single-currency service (Remesa/Extracción/Pago) never carries a
    // cashSnapshot — its row must still show a real computed figure, not a
    // blank dash, confirming the fallback path is unaffected by the fix.
    const fallbackRow = table
      .locator("tbody tr")
      .filter({ hasText: "Remesa nacional" })
      .first();
    // "Saldo después" (index 6) — not the last column: "Acciones" (§ Cash
    // Movement Detail) comes after it.
    const saldoDespues = (await fallbackRow.locator("td").nth(6).textContent())?.trim();

    expect(saldoDespues).toBeTruthy();
    expect(saldoDespues).not.toBe("—");
  });

  test("an explicit reconciling movement, not a disguised operation, closes the gap to the live balance", async ({
    page,
  }) => {
    const table = page.getByRole("table").nth(1);
    const reconcilingRow = table
      .locator("tbody tr")
      .filter({ hasText: "Fondeo adicional" })
      .filter({ hasText: "EUR" });

    await expect(reconcilingRow).toBeVisible();
    // No operation code: this is an internal Caja movement, not masquerading
    // as a customer operation.
    await expect(reconcilingRow.getByText("—", { exact: true })).toBeVisible();
    await expect(reconcilingRow.getByText("+1.790,00", { exact: true })).toBeVisible();
    await expect(reconcilingRow.getByText("2.120,00", { exact: true })).toBeVisible();
  });

  test("current Caja balances remain correctly displayed", async ({ page }) => {
    const balancesTable = page.getByRole("table").first();
    const eurRow = balancesTable.locator("tbody tr").filter({ hasText: "EUR" });
    await expect(eurRow.getByText("2.120,00", { exact: true })).toBeVisible();
  });
});

test.describe("worker caja — actions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/caja");
  });

  test("Imprimir resumen is enabled and triggers print", async ({ page }) => {
    await page.evaluate(() => {
      (window as unknown as { __printed?: boolean }).__printed = false;
      window.print = () => {
        (window as unknown as { __printed?: boolean }).__printed = true;
      };
    });

    const print = page.getByRole("button", { name: "Imprimir resumen" });
    await expect(print).toBeEnabled();
    await print.click();
    expect(await page.evaluate(() => (window as unknown as { __printed?: boolean }).__printed)).toBe(
      true,
    );
  });

  test("Registrar fondeo inicial is enabled and navigates to its own flow", async ({ page }) => {
    const tile = page.getByRole("link", { name: /Registrar fondeo inicial/ });
    await tile.click();
    await expect(page).toHaveURL(/\/worker\/caja\/fondeo-inicial$/);
  });

  test("Añadir moneda is enabled and navigates to its own flow", async ({ page }) => {
    const tile = page.getByRole("link", { name: /Añadir moneda/ });
    await tile.click();
    await expect(page).toHaveURL(/\/worker\/caja\/anadir-moneda$/);
  });

  test("Arqueo y cierre stays disabled until a jornada is open", async ({ page }) => {
    await expect(page.getByText("Transferir entre cajas")).toHaveCount(0);
    const tile = page.getByRole("button", { name: /Arqueo y cierre/ });
    await expect(tile).toBeDisabled();
    await expect(tile.getByText("Requiere jornada abierta")).toBeVisible();
  });

  // Ajustar efectivo is a built flow gated on an open jornada, not an
  // unbuilt capability — its disabled badge must say so, never "Próximamente".
  test("Ajustar efectivo renders disabled with its true reason while no jornada is open", async ({
    page,
  }) => {
    const tile = page.getByRole("button", { name: /Ajustar efectivo/ });
    await expect(tile).toBeDisabled();
    await expect(tile.getByText("Requiere jornada abierta")).toBeVisible();
    await expect(tile.getByText("Próximamente")).toHaveCount(0);
  });
});

test.describe("worker caja — layout", () => {
  for (const width of [1440, 1280]) {
    test(`fits without page-level horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/worker/caja");

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);
    });
  }

  test("zero console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto("/worker/caja", { waitUntil: "networkidle" });
    expect(errors).toEqual([]);
  });
});
