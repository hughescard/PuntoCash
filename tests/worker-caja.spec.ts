import { test, expect } from "./worker-fixture";
import { type Page } from "@playwright/test";

/**
 * Worker Caja — the operational/financial register view.
 *
 * Saldos, indicadores del día, libro de movimientos y acciones, sobre la caja
 * del puesto de la prueba en la red: jornada abierta con estos fondos y
 * dieciocho giros enviados, que dan un libro de más de una página.
 */

const GIROS = Array.from({ length: 18 }, (_, i) => 1_000 + i * 100);
test.use({ fondos: { CUP: 245_000, USD: 3_850, EUR: 2_120, GBP: 950 }, giros: GIROS, monedas: ["CHF"] });
const CUP_FINAL = 245_000 + GIROS.reduce((a, b) => a + b, 0);
const fmt = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions);

/**
 * The print-only "Imprimir resumen" section repeats several of these same
 * labels and figures off-screen (`hidden print:block`). Filtering to what is
 * actually rendered keeps every assertion about the on-screen page.
 */
function onScreen(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true });
}

test.describe("worker caja — render and shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/caja");
    // El shell de `/worker` vive detrás de la puerta de vinculación, que es un
    // componente de cliente: solo existe tras la hidratación (Worker FRD §2.1).
    // Sin esperarlo, una lectura sincrónica del DOM mide una página vacía.
    await page.getByRole("main").waitFor();
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
    // El shell de `/worker` vive detrás de la puerta de vinculación, que es un
    // componente de cliente: solo existe tras la hidratación (Worker FRD §2.1).
    // Sin esperarlo, una lectura sincrónica del DOM mide una página vacía.
    await page.getByRole("main").waitFor();
  });

  test("shows CUP, USD, EUR and GBP with SVG flags and canonical amounts", async ({ page }) => {
    await expect(page.getByText("Saldos de caja")).toBeVisible();
    const balancesTable = page.getByRole("table").first();

    for (const [currency, amount] of [
      ["CUP", fmt(CUP_FINAL)],
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

  test("el estado de cada saldo es texto, y no inventa un «nivel bajo» sin umbral", async ({ page }) => {
    const balancesTable = page.getByRole("table").first();
    const cupRow = balancesTable.locator("tbody tr").filter({ hasText: "CUP" });
    await expect(cupRow.getByText("Con efectivo")).toBeVisible();
    await expect(page.getByText("Nivel bajo")).toHaveCount(0);
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

  test("los indicadores salen del libro de hoy", async ({ page }) => {
    await page.goto("/worker/caja");
    const ops = page.getByText("Operaciones de hoy", { exact: true }).locator("..");
    await expect(ops).toContainText(String(GIROS.length));
  });
});

test.describe("worker caja — movements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/caja");
    // El shell de `/worker` vive detrás de la puerta de vinculación, que es un
    // componente de cliente: solo existe tras la hidratación (Worker FRD §2.1).
    // Sin esperarlo, una lectura sincrónica del DOM mide una página vacía.
    await page.getByRole("main").waitFor();
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
    /* La fila visible anterior al filtro ya satisface `toBeVisible()`, así que
       esa espera no demuestra nada y la lectura sincrónica podía medir la tabla
       sin filtrar. La forma que sí espera es afirmar que no queda ninguna fila
       distinta. */
    const types = table.locator("tbody tr td:nth-child(3)");
    await expect(types.filter({ hasNotText: "Entrada" })).toHaveCount(0);
    await expect(types).not.toHaveCount(0);
  });

  test("filters by Moneda", async ({ page }) => {
    const table = page.getByRole("table").nth(1);
    await page.getByLabel("Moneda").click();
    await page.getByRole("option", { name: "EUR", exact: true }).click();
    /* La fila visible anterior al filtro ya satisface `toBeVisible()`, así que
       esa espera no demuestra nada y la lectura sincrónica podía medir la tabla
       sin filtrar. La forma que sí espera es afirmar que no queda ninguna fila
       distinta. */
    const currencies = table.locator("tbody tr td:nth-child(5)");
    await expect(currencies.filter({ hasNotText: "EUR" })).toHaveCount(0);
    await expect(currencies).not.toHaveCount(0);
  });

  test("a currency with no movements shows the empty state, not an error", async ({ page }) => {
    await page.getByLabel("Moneda").click();
    /* CHF está habilitada en cero: no tiene ningún movimiento. */
    await page.getByRole("option", { name: "CHF", exact: true }).click();
    await expect(page.getByText("No encontramos movimientos")).toBeVisible();
  });

  test("searches by operation code", async ({ page }) => {
    const table = page.getByRole("table").nth(1);
    const code = (await table.getByRole("link", { name: /^PC-\d{6}-\d{6}$/ }).first().textContent())!.trim();
    await page.getByPlaceholder("Buscar por operación o concepto").fill(code);
    /* La fila visible anterior al filtro ya satisface `toBeVisible()`, así que
       esa espera no demuestra nada y la lectura sincrónica podía medir la tabla
       sin filtrar. La forma que sí espera es afirmar que no queda ninguna fila
       distinta. */
    const rows = table.locator("tbody tr");
    await expect(rows.filter({ hasNotText: code })).toHaveCount(0);
    await expect(rows).not.toHaveCount(0);
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
    /* Todo el libro de la prueba cae en el mismo minuto: se compara la fila
       entera, no solo la hora. */
    const firstDatePage1 = await table.locator("tbody tr").first().textContent();

    await page.getByRole("navigation", { name: "Paginación" }).getByRole("button", { name: "2", exact: true }).click();
    await expect(page.getByText(/Mostrando 21–\d+/)).toBeVisible();

    const firstDatePage2 = await table.locator("tbody tr").first().textContent();
    expect(firstDatePage2).not.toEqual(firstDatePage1);
  });
});

test.describe("worker caja — saldos del libro", () => {
  test("el saldo después del primer giro es el fondeo más ese giro", async ({ page }) => {
    await page.goto("/worker/caja");
    const row = page
      .getByRole("table")
      .nth(1)
      .locator("tbody tr")
      .filter({ hasText: "Envío de giro" })
      .filter({ hasText: `+${fmt(GIROS[0]!)}` });
    await expect(row.getByText(fmt(245_000 + GIROS[0]!), { exact: true })).toBeVisible();
  });

  test("el último movimiento de CUP deja el saldo que muestra la caja", async ({ page }) => {
    await page.goto("/worker/caja");
    const ultimo = page.getByRole("table").nth(1).locator("tbody tr").filter({ hasText: "CUP" }).first();
    await expect(ultimo.getByText(fmt(CUP_FINAL), { exact: true })).toBeVisible();
  });
});

test.describe("worker caja — actions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/caja");
    // El shell de `/worker` vive detrás de la puerta de vinculación, que es un
    // componente de cliente: solo existe tras la hidratación (Worker FRD §2.1).
    // Sin esperarlo, una lectura sincrónica del DOM mide una página vacía.
    await page.getByRole("main").waitFor();
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

  test("con la jornada abierta, «Abrir jornada» está deshabilitada con su motivo", async ({ page }) => {
    const tile = page.getByRole("button", { name: /Abrir jornada/ });
    await expect(tile).toBeDisabled();
    await expect(tile.getByText("Jornada abierta")).toBeVisible();
  });

  test("Añadir moneda is enabled and navigates to its own flow", async ({ page }) => {
    const tile = page.getByRole("link", { name: /Añadir moneda/ });
    await tile.click();
    await expect(page).toHaveURL(/\/worker\/caja\/anadir-moneda$/);
  });

  test("Ajustar efectivo y Arqueo y cierre llevan a sus flujos con la jornada abierta", async ({ page }) => {
    await expect(page.getByText("Transferir entre cajas")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Ajustar efectivo/ })).toBeVisible();
    await page.getByRole("link", { name: /Arqueo y cierre/ }).click();
    await expect(page).toHaveURL(/\/worker\/caja\/arqueo-cierre$/);
  });
});

test.describe("worker caja — sin jornada", () => {
  test.use({ fondos: null, giros: [], monedas: ["CUP"] });

  test("Arqueo y cierre y Ajustar efectivo se deshabilitan con su motivo real", async ({ page }) => {
    await page.goto("/worker/caja");
    for (const name of [/Arqueo y cierre/, /Ajustar efectivo/]) {
      const tile = page.getByRole("button", { name });
      await expect(tile).toBeDisabled();
      await expect(tile.getByText("Requiere jornada abierta")).toBeVisible();
      await expect(tile.getByText("Próximamente")).toHaveCount(0);
    }
    await page.getByRole("link", { name: /Abrir jornada/ }).click();
    await expect(page).toHaveURL(/\/worker\/caja\/fondeo-inicial$/);
  });
});

test.describe("worker caja — layout", () => {
  for (const width of [1440, 1280]) {
    test(`fits without page-level horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/worker/caja");
      // El shell de `/worker` solo existe tras la hidratación (ver `tests/README.md`):
      // medir antes mide una página vacía, y la aserción pasaría en falso.
      await page.getByRole("main").waitFor();

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
