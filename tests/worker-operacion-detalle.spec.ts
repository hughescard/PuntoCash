import { test, expect } from "@playwright/test";

/**
 * Worker operation detail — /worker/operaciones/[codigo].
 *
 * Cambio de moneda is the first fully specialized detail; every other service
 * falls back to a restrained generic block until its own flow is designed.
 * Data comes from the mock in `src/features/operations/operations-history.ts`.
 */

/** The Cambio de moneda hero record, with known literal values. */
const EXCHANGE_CODE = "PC-260818-005004";
/** A Remesa nacional record — no specialized detail exists for it yet. */
const GENERIC_CODE = "PC-260818-005003";
const REMITTANCE_CODE = "PC-260818-005006";

/**
 * Text as the worker actually sees it.
 *
 * The print-only comprobante is real markup living in the same document
 * (`hidden print:block`), so most of these labels and figures legitimately
 * appear twice. Filtering to what is rendered keeps every assertion about the
 * on-screen detail and never accidentally satisfied by the receipt.
 */
function onScreen(page: import("@playwright/test").Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true });
}

test.describe("operation detail — Cambio de moneda", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/worker/operaciones/${EXCHANGE_CODE}`);
  });

  test("renders the header with code, status badge and canonical timestamp", async ({ page }) => {
    await expect(page.getByRole("heading", { name: `Operación ${EXCHANGE_CODE}` })).toBeVisible();
    await expect(page.getByText("Completada", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("18/08/2026 · 10:00").first()).toBeVisible();
  });

  test("Volver a Operaciones returns to the list", async ({ page }) => {
    await page.getByRole("link", { name: "Volver a Operaciones" }).click();
    await expect(page).toHaveURL(/\/worker\/operaciones$/);
    await expect(page.getByRole("heading", { name: "Operaciones" })).toBeVisible();
  });

  test("shows the client snapshot recorded on the operation", async ({ page }) => {
    for (const value of [
      "Carlos Pérez Rodríguez",
      "CI · 90010112345",
      "+53 5 123 4567",
      "Cubana",
    ]) {
      await expect(onScreen(page, value).first()).toBeVisible();
    }
    // Read-only historical record: no avatar, no address, no edit affordance.
    await expect(page.getByRole("main").locator("img")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Editar/ })).toHaveCount(0);
    await expect(page.getByText(/Dirección/)).toHaveCount(0);
  });

  test("shows the common operation card", async ({ page }) => {
    for (const value of ["Cambio de moneda", "Juan Pérez", "Caja 03", EXCHANGE_CODE]) {
      await expect(onScreen(page, value).first()).toBeVisible();
    }
    for (const label of ["Servicio", "Trabajador", "Caja", "Fecha y hora", "Código de operación"]) {
      await expect(onScreen(page, label).first()).toBeVisible();
    }
  });

  test("shows both sides of the exchange with SVG flags and currency names", async ({ page }) => {
    await expect(onScreen(page, "Cliente entrega").first()).toBeVisible();
    await expect(onScreen(page, "1.000,00 USD").first()).toBeVisible();
    await expect(onScreen(page, "Dólar estadounidense").first()).toBeVisible();

    await expect(onScreen(page, "Cliente recibe").first()).toBeVisible();
    await expect(onScreen(page, "920,00 EUR").first()).toBeVisible();
    await expect(onScreen(page, "Euro").first()).toBeVisible();

    // Flags are the shared SVG component, decorative, and never emoji.
    const flags = page.getByRole("main").locator("svg[data-currency-flag]");
    expect(await flags.count()).toBeGreaterThanOrEqual(2);
    for (const flag of await flags.all()) {
      await expect(flag).toHaveAttribute("aria-hidden", "true");
    }
    const hasRegionalIndicator = await page
      .getByRole("main")
      .evaluate((el) => /[\u{1F1E6}-\u{1F1FF}]/u.test(el.textContent ?? ""));
    expect(hasRegionalIndicator).toBe(false);
  });

  test("shows the applied rate from the operation's own snapshot", async ({ page }) => {
    await expect(onScreen(page, "Tasa aplicada").first()).toBeVisible();
    await expect(onScreen(page, "1 USD = 0,9200 EUR").first()).toBeVisible();
  });

  test("shows the historical cash snapshot, not a live balance", async ({ page }) => {
    await expect(onScreen(page, "Estado de caja").first()).toBeVisible();

    for (const [label, value] of [
      ["Disponible antes", "1.250,00 EUR"],
      ["Entregado al cliente", "920,00 EUR"],
      ["Disponible después", "330,00 EUR"],
    ] as const) {
      await expect(onScreen(page, label).first()).toBeVisible();
      await expect(onScreen(page, value).first()).toBeVisible();
    }
  });

  test("shows the completed status message", async ({ page }) => {
    await expect(onScreen(page, "Estado de la operación").first()).toBeVisible();
    await expect(onScreen(page, "La operación se procesó correctamente.").first()).toBeVisible();
  });

  test("offers the print receipt action and no fake download", async ({ page }) => {
    await expect(onScreen(page, "Comprobante").first()).toBeVisible();
    await expect(onScreen(page, "Se generó el comprobante de la operación.").first()).toBeVisible();

    const print = page.getByRole("button", { name: "Imprimir comprobante" });
    await expect(print).toBeVisible();
    await expect(print).toBeEnabled();

    // No downloadable artifact exists, so no button may claim one.
    await expect(page.getByRole("button", { name: /Descargar/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Descargar/ })).toHaveCount(0);

    // The action is keyboard reachable and invoking it opens the print dialog
    // rather than throwing (the dialog itself is stubbed out).
    await page.evaluate(() => {
      (window as unknown as { __printed?: boolean }).__printed = false;
      window.print = () => {
        (window as unknown as { __printed?: boolean }).__printed = true;
      };
    });
    await print.press("Enter");
    expect(await page.evaluate(() => (window as unknown as { __printed?: boolean }).__printed)).toBe(
      true,
    );
  });

  test("renders no unsupported financial fields from the mockup", async ({ page }) => {
    // These appear in the approved visual reference but have no domain data
    // behind them, so they must not be invented onto the screen.
    for (const forbidden of [
      /Tipo de cambio de referencia/,
      /Diferencial aplicado/,
      /Comisión/,
      /Impuesto/,
      /Canal/,
      /Información adicional/,
    ]) {
      await expect(page.getByText(forbidden)).toHaveCount(0);
    }
  });
});

test.describe("operation detail — other services", () => {
  test("a non-Cambio operation resolves with a restrained generic detail", async ({ page }) => {
    const response = await page.goto(`/worker/operaciones/${GENERIC_CODE}`);
    expect(response?.status()).toBeLessThan(400);

    await expect(page.getByRole("heading", { name: `Operación ${GENERIC_CODE}` })).toBeVisible();
    await expect(onScreen(page, "María López González").first()).toBeVisible();
    await expect(onScreen(page, "Remesa nacional").first()).toBeVisible();
    await expect(onScreen(page, "8.500,00 CUP").first()).toBeVisible();

    // No exchange-only sections leak into a service that has none.
    await expect(page.getByText("Tasa aplicada")).toHaveCount(0);
    await expect(page.getByText("Estado de caja")).toHaveCount(0);
    await expect(page.getByText("Cliente entrega")).toHaveCount(0);
  });

  test("an unknown code renders a graceful not-found card, not a hard 404", async ({ page }) => {
    const response = await page.goto("/worker/operaciones/PC-NOPE-000000");
    expect(response?.status()).toBeLessThan(400);

    await expect(page.getByText("Operación no encontrada")).toBeVisible();
    await page.getByRole("link", { name: "Volver a Operaciones" }).first().click();
    await expect(page).toHaveURL(/\/worker\/operaciones$/);
  });
});

test.describe("operation detail — Remesa", () => {
  test("uses the historical Remesa snapshot and never creates a standalone Estado card", async ({ page }) => {
    await page.goto(`/worker/operaciones/${REMITTANCE_CODE}`);
    await expect(page.getByRole("heading", { name: "Detalle de operación" })).toBeVisible();
    for (const value of ["María Pérez García", "85010112345", "RM-7X82-9KLM", "REF-REM-500", "500,00 CUP", "CUP · Peso cubano", "Recogida", "Completada"]) {
      await expect(onScreen(page, value).first()).toBeVisible();
    }
    await expect(onScreen(page, "Estado de la remesa").first()).toBeVisible();
    await expect(page.getByText("Estado de la operación", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/COMPLETED|pickup/)).toHaveCount(0);
  });

  test("shows the linked commercial cash-out snapshot and stays read-only", async ({ page }) => {
    await page.goto(`/worker/operaciones/${REMITTANCE_CODE}`);
    for (const value of ["Movimiento de efectivo", "8.450,00 CUP", "−500,00 CUP", "7.950,00 CUP", "Salida", REMITTANCE_CODE]) {
      await expect(onScreen(page, value).first()).toBeVisible();
    }
    for (const action of [/Completar remesa/, /Reintentar/, /Editar/, /Cancelar remesa/]) {
      await expect(page.getByRole("button", { name: action })).toHaveCount(0);
    }
  });
});

test.describe("operation detail — layout", () => {
  for (const width of [1440, 1280]) {
    test(`fits without page-level horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/worker/operaciones/${EXCHANGE_CODE}`);

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);

      // Main stays the only vertical scroller; the shell never scrolls away.
      const scroll = await page.evaluate(() => {
        const main = document.querySelector("main")!;
        return {
          document: document.documentElement.scrollHeight > window.innerHeight,
          main: main.scrollHeight > main.clientHeight,
        };
      });
      expect(scroll.document).toBe(false);
      expect(scroll.main).toBe(true);

      // No financial value is clipped by its own box.
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll("dd, .pc-numeric")]
          .filter((el) => el.scrollWidth > el.clientWidth + 1)
          .map((el) => el.textContent?.trim() ?? ""),
      );
      expect(clipped).toEqual([]);
    });
  }

  test("zero console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto(`/worker/operaciones/${EXCHANGE_CODE}`, { waitUntil: "networkidle" });
    expect(errors).toEqual([]);
  });
});
