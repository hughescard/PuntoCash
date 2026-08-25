import { test, expect, type Page } from "@playwright/test";

/**
 * Worker Caja — Añadir moneda (/worker/caja/anadir-moneda).
 *
 * Enables a new currency for Caja 03 — never moves cash, never creates a
 * movement, never asks for an amount. Data comes from
 * `src/features/caja/caja-data.ts`; each test gets an isolated browser
 * context, so enabled-currency state never leaks between tests.
 *
 * The "Moneda" control is a compact, closed-by-default combobox (matching
 * the approved reference): it must be opened before its search field or
 * option list are interactable.
 */
async function openPicker(page: Page) {
  await page.locator("#anadir-moneda-trigger").click();
}

test.describe("añadir moneda — render and navigation", () => {
  test("renders the approved header content", async ({ page }) => {
    await page.goto("/worker/caja/anadir-moneda");

    await expect(page.getByRole("heading", { name: "Añadir moneda" })).toBeVisible();
    await expect(page.getByText("Incorpora una nueva divisa a Caja 03.")).toBeVisible();
    await expect(page.getByText("Seleccionar moneda")).toBeVisible();
    await expect(page.getByRole("button", { name: "Moneda: Selecciona una moneda" })).toBeVisible();
  });

  test("the Caja action tile navigates here", async ({ page }) => {
    await page.goto("/worker/caja");
    await page.getByRole("link", { name: /Añadir moneda/ }).click();
    await expect(page).toHaveURL(/\/worker\/caja\/anadir-moneda$/);
  });

  test("shows the context block, including the not-yet-open jornada state", async ({ page }) => {
    await page.goto("/worker/caja/anadir-moneda");
    await expect(page.getByText("Caja 03").first()).toBeVisible();
    await expect(page.getByText("Juan Pérez").first()).toBeVisible();
    await expect(page.getByText("Monedas habilitadas")).toBeVisible();
    await expect(page.getByText("4", { exact: true })).toBeVisible();
    await expect(page.getByText("Pendiente de apertura")).toBeVisible();
    await expect(page.getByText("Sin abrir")).toBeVisible();
  });
});

test.describe("añadir moneda — selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/caja/anadir-moneda");
  });

  test("the picker starts closed and expands on click", async ({ page }) => {
    await expect(page.getByPlaceholder("Buscar por código o nombre")).toHaveCount(0);
    await openPicker(page);
    await expect(page.getByPlaceholder("Buscar por código o nombre")).toBeVisible();
  });

  test("searches by ISO currency code", async ({ page }) => {
    await openPicker(page);
    await page.getByPlaceholder("Buscar por código o nombre").fill("CHF");
    const options = page.getByRole("option");
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText("CHF");
  });

  test("searches by currency name", async ({ page }) => {
    await openPicker(page);
    await page.getByPlaceholder("Buscar por código o nombre").fill("canadiense");
    const options = page.getByRole("option");
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText("CAD");
  });

  test("already-enabled currencies are never offered", async ({ page }) => {
    await openPicker(page);
    for (const enabled of ["CUP", "USD", "EUR", "GBP"]) {
      await expect(page.getByRole("option", { name: new RegExp(`^${enabled}`) })).toHaveCount(0);
    }
  });

  test("CAD can be selected, collapses the picker, and shows code, name and symbol", async ({
    page,
  }) => {
    await openPicker(page);
    await page.getByRole("option", { name: /^CAD/ }).click();

    // Selecting collapses the picker back to its compact, closed state.
    await expect(page.getByPlaceholder("Buscar por código o nombre")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Moneda: CAD — Dólar canadiense" }),
    ).toBeVisible();

    await expect(page.getByText("Código")).toBeVisible();
    await expect(page.getByText("Nombre")).toBeVisible();
    await expect(page.getByText("Símbolo")).toBeVisible();
    await expect(page.getByText("CAD", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Dólar canadiense", { exact: true }).first()).toBeVisible();

    // "Resumen de incorporación" reflects the selection live.
    await expect(page.locator("dd").filter({ hasText: "CAD" }).first()).toBeVisible();
  });

  test("selection is communicated by more than colour — text, border and a check icon", async ({
    page,
  }) => {
    await openPicker(page);
    await expect(page.getByRole("option", { name: /^CAD/ })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    await page.getByRole("option", { name: /^CAD/ }).click();

    // Selecting collapses the picker (the option itself unmounts); reopening
    // it is what proves the choice was actually recorded, not just clicked.
    await openPicker(page);
    await expect(page.getByRole("option", { name: /^CAD/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

test.describe("añadir moneda — restrained content (no rejected rows)", () => {
  test("no amount input, no saldo inicial, no estado esperado, no movement copy", async ({
    page,
  }) => {
    await page.goto("/worker/caja/anadir-moneda");
    await openPicker(page);
    await page.getByRole("option", { name: /^CAD/ }).click();

    await expect(page.getByText("Saldo inicial")).toHaveCount(0);
    await expect(page.getByText("Estado esperado")).toHaveCount(0);
    await expect(page.getByText("Resultado")).toHaveCount(0);
    await expect(page.getByText(/movimiento de caja/i)).toHaveCount(0);
    await expect(page.locator('input[inputmode="decimal"]')).toHaveCount(0);
    // No stray "¿No encuentras la moneda?" link inside this screen itself.
    await expect(page.getByText(/No encuentras la moneda/)).toHaveCount(0);
  });
});

test.describe("añadir moneda — confirmation, direct entry from Caja", () => {
  test("enabling CAD adds it to Caja 03 at 0,00 with no movement", async ({ page }) => {
    await page.goto("/worker/caja/anadir-moneda");
    await openPicker(page);
    await page.getByRole("option", { name: /^CAD/ }).click();
    await page.getByRole("button", { name: "Añadir moneda" }).click();

    await expect(page).toHaveURL(/\/worker\/caja$/, { timeout: 3000 });

    const balancesTable = page.getByRole("table").first();
    const cadRow = balancesTable.locator("tbody tr").filter({ hasText: "CAD" });
    await expect(cadRow.getByText("0,00", { exact: true })).toBeVisible();
    await expect(balancesTable.locator("tbody tr")).toHaveCount(5);

    const movementsTable = page.getByRole("table").nth(1);
    await expect(
      movementsTable.locator("tbody tr").filter({ hasText: "CAD" }),
    ).toHaveCount(0);
  });

  test("once enabled, a currency never appears as selectable again — duplicates rejected", async ({
    page,
  }) => {
    await page.goto("/worker/caja/anadir-moneda");
    await openPicker(page);
    await page.getByRole("option", { name: /^CAD/ }).click();
    await page.getByRole("button", { name: "Añadir moneda" }).click();
    await expect(page).toHaveURL(/\/worker\/caja$/, { timeout: 3000 });

    // Same SPA session, fresh visit to Añadir moneda: CAD is now enabled and
    // must never be offered again, proving the domain — not just the prior
    // render — is what excludes it.
    await page.getByRole("link", { name: /Añadir moneda/ }).click();
    await expect(page).toHaveURL(/\/worker\/caja\/anadir-moneda$/);
    await openPicker(page);
    await expect(page.getByRole("option", { name: /^CAD/ })).toHaveCount(0);
  });

  test("Cancelar returns to Caja without enabling anything", async ({ page }) => {
    await page.goto("/worker/caja/anadir-moneda");
    await openPicker(page);
    await page.getByRole("option", { name: /^CAD/ }).click();
    await page.getByRole("link", { name: "Cancelar" }).click();

    await expect(page).toHaveURL(/\/worker\/caja$/);
    const balancesTable = page.getByRole("table").first();
    await expect(balancesTable.locator("tbody tr")).toHaveCount(4);
  });
});

test.describe("añadir moneda — entry from Fondeo inicial", () => {
  test("preserves the in-progress draft and shows CAD as a new fixed row on return", async ({
    page,
  }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    await page.getByLabel("Fondo inicial en CUP").fill("200000");
    await page.getByLabel("Fondo inicial en USD").fill("4000");

    await page.getByRole("link", { name: /Añádela a la caja/ }).click();
    await expect(page).toHaveURL(/\/worker\/caja\/anadir-moneda\?returnTo=fondeo-inicial$/);

    await openPicker(page);
    await page.getByRole("option", { name: /^CAD/ }).click();
    await page.getByRole("button", { name: "Añadir moneda" }).click();

    await expect(page).toHaveURL(/\/worker\/caja\/fondeo-inicial$/, { timeout: 3000 });
    await expect(page.getByLabel("Fondo inicial en CUP")).toHaveValue("200000");
    await expect(page.getByLabel("Fondo inicial en USD")).toHaveValue("4000");

    const cadInput = page.getByLabel("Fondo inicial en CAD");
    await expect(cadInput).toBeVisible();
    await expect(cadInput).toHaveValue("");
  });

  test("Fondeo inicial can then accept and register an amount for CAD normally", async ({
    page,
  }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    await page.getByLabel("Fondo inicial en CUP").fill("200000");
    await page.getByRole("link", { name: /Añádela a la caja/ }).click();
    await openPicker(page);
    await page.getByRole("option", { name: /^CAD/ }).click();
    await page.getByRole("button", { name: "Añadir moneda" }).click();
    await expect(page).toHaveURL(/\/worker\/caja\/fondeo-inicial$/, { timeout: 3000 });

    await page.getByLabel("Fondo inicial en CAD").fill("1000");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Confirmar y abrir caja" }).click();
    await expect(page.getByRole("heading", { name: "Caja abierta correctamente" })).toBeVisible({
      timeout: 3000,
    });
    await expect(page.getByText("1.000,00 CAD", { exact: true }).first()).toBeVisible();

    await page.getByRole("link", { name: "Ir a Caja" }).click();
    await expect(page).toHaveURL(/\/worker\/caja$/);
    const balancesTable = page.getByRole("table").first();
    const cadRow = balancesTable.locator("tbody tr").filter({ hasText: "CAD" });
    await expect(cadRow.getByText("1.000,00", { exact: true })).toBeVisible();
  });

  test("Cancelar from Añadir moneda also returns to Fondeo inicial with the draft intact", async ({
    page,
  }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    await page.getByLabel("Fondo inicial en EUR").fill("1500");
    await page.getByRole("link", { name: /Añádela a la caja/ }).click();
    await page.getByRole("link", { name: "Cancelar" }).click();

    await expect(page).toHaveURL(/\/worker\/caja\/fondeo-inicial$/);
    await expect(page.getByLabel("Fondo inicial en EUR")).toHaveValue("1500");
    await expect(page.getByLabel("Fondo inicial en CAD")).toHaveCount(0);
  });
});

test.describe("añadir moneda — layout", () => {
  for (const width of [1440, 1280]) {
    test(`fits without page-level horizontal scroll at ${width}px, main is the only scroller`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/worker/caja/anadir-moneda");

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);

      const scroll = await page.evaluate(() => {
        const main = document.querySelector("main")!;
        return {
          document: document.documentElement.scrollHeight > window.innerHeight,
          main: main.scrollHeight >= main.clientHeight,
        };
      });
      expect(scroll.document).toBe(false);
    });
  }

  test("zero console errors across the full flow", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto("/worker/caja/anadir-moneda", { waitUntil: "networkidle" });
    await openPicker(page);
    await page.getByRole("option", { name: /^CAD/ }).click();
    await page.getByRole("button", { name: "Añadir moneda" }).click();
    await expect(page).toHaveURL(/\/worker\/caja$/, { timeout: 3000 });

    expect(errors).toEqual([]);
  });
});
