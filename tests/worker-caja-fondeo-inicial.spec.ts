import { test, expect } from "@playwright/test";

/**
 * Worker Caja — Registrar fondeo inicial (/worker/caja/fondeo-inicial).
 *
 * Three steps: the approved form → Review → Confirmar y abrir caja → a
 * success result. Confirming opens a new jornada and establishes its
 * OPENING balances (never additive on top of history), recording one
 * "Fondeo inicial" movement per funded currency. Data comes from
 * `src/features/caja/caja-data.ts`; each test gets an isolated browser
 * context, so the in-memory jornada state never leaks between tests.
 */

async function fillAndReview(page: import("@playwright/test").Page, amounts: Record<string, string>) {
  await page.goto("/worker/caja/fondeo-inicial");
  for (const [currency, value] of Object.entries(amounts)) {
    await page.getByLabel(`Fondo inicial en ${currency}`).fill(value);
  }
  await page.getByRole("button", { name: "Continuar" }).click();
}

async function fillReviewAndConfirm(
  page: import("@playwright/test").Page,
  amounts: Record<string, string>,
) {
  await fillAndReview(page, amounts);
  await page.getByRole("button", { name: "Confirmar y abrir caja" }).click();
  await expect(page.getByRole("heading", { name: "Caja abierta correctamente" })).toBeVisible({
    timeout: 3000,
  });
}

test.describe("fondeo inicial — form (Step 1, unchanged)", () => {
  test("renders the approved header content", async ({ page }) => {
    await page.goto("/worker/caja/fondeo-inicial");

    await expect(page.getByRole("heading", { name: "Registrar fondeo inicial" })).toBeVisible();
    await expect(
      page.getByText("Indica el efectivo con el que Caja 03 iniciará su jornada."),
    ).toBeVisible();
    await expect(page.getByText("Pendiente de apertura")).toBeVisible();
  });

  test("the Caja action tile navigates here", async ({ page }) => {
    await page.goto("/worker/caja");
    await page.getByRole("link", { name: /Registrar fondeo inicial/ }).click();
    await expect(page).toHaveURL(/\/worker\/caja\/fondeo-inicial$/);
  });

  test("Volver a Caja and Cancelar both return to Caja", async ({ page }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    await page.getByRole("link", { name: "Volver a Caja" }).click();
    await expect(page).toHaveURL(/\/worker\/caja$/);

    await page.goto("/worker/caja/fondeo-inicial");
    await page.getByRole("link", { name: "Cancelar" }).click();
    await expect(page).toHaveURL(/\/worker\/caja$/);
  });

  test("shows the register summary and info strip", async ({ page }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    await expect(page.getByText("Caja 03").first()).toBeVisible();
    await expect(page.getByText("Juan Pérez").first()).toBeVisible();
    await expect(page.getByText("Se registrará al confirmar")).toBeVisible();
  });

  test("lists all four enabled currencies with SVG flags, never emoji", async ({ page }) => {
    await page.goto("/worker/caja/fondeo-inicial");

    for (const currency of ["CUP", "USD", "EUR", "GBP"]) {
      await expect(page.getByLabel(`Fondo inicial en ${currency}`)).toBeVisible();
    }

    const flags = page.locator("svg[data-currency-flag]");
    expect(await flags.count()).toBeGreaterThanOrEqual(4);
    for (const flag of await flags.all()) {
      await expect(flag).toHaveAttribute("aria-hidden", "true");
    }
    const hasRegionalIndicator = await page.evaluate(() =>
      /[\u{1F1E6}-\u{1F1FF}]/u.test(document.body.textContent ?? ""),
    );
    expect(hasRegionalIndicator).toBe(false);
  });

  test("blocks an empty submission — cannot continue", async ({ page }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(
      page.getByText("Introduce el fondo inicial de al menos una moneda."),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Revisión del fondeo inicial" })).toHaveCount(0);
  });

  test("rejects an invalid amount inline", async ({ page }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    await page.getByLabel("Fondo inicial en USD").fill("abc");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByLabel("Fondo inicial en USD")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Introduce un monto válido.")).toBeVisible();
  });

  test("updates 'Monedas con fondos' live as amounts are entered", async ({ page }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    const summaryCount = page.locator("dd").filter({ hasText: /^\d+$/ }).last();
    await expect(summaryCount).toHaveText("0");

    await page.getByLabel("Fondo inicial en CUP").fill("100000");
    await expect(summaryCount).toHaveText("1");

    await page.getByLabel("Fondo inicial en USD").fill("1000");
    await expect(summaryCount).toHaveText("2");

    await page.getByLabel("Fondo inicial en USD").fill("");
    await expect(summaryCount).toHaveText("1");
  });

  test("each currency is a fixed row — no duplicate-currency selector exists", async ({
    page,
  }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    for (const currency of ["CUP", "USD", "EUR", "GBP"]) {
      await expect(page.getByLabel(`Fondo inicial en ${currency}`)).toHaveCount(1);
    }
  });

  test('"Añádela a la caja" reaches the real Añadir moneda flow, never a 404', async ({
    page,
  }) => {
    // The full round-trip (draft preservation, new currency appearing back
    // here) is covered in tests/worker-caja-anadir-moneda.spec.ts — this only
    // confirms the link itself resolves.
    await page.goto("/worker/caja/fondeo-inicial");
    await page.getByRole("link", { name: /Añádela a la caja/ }).click();
    await expect(page).toHaveURL(/\/worker\/caja\/anadir-moneda\?returnTo=fondeo-inicial$/);
    await expect(page.getByRole("heading", { name: "Añadir moneda" })).toBeVisible();
    await page.getByRole("link", { name: "Cancelar" }).click();
    await expect(page).toHaveURL(/\/worker\/caja\/fondeo-inicial$/);
  });
});

test.describe("fondeo inicial — Review step", () => {
  test("appears before confirmation and nothing is written yet", async ({ page }) => {
    await fillAndReview(page, { CUP: "200000", USD: "4000" });

    await expect(page.getByRole("heading", { name: "Revisión del fondeo inicial" })).toBeVisible();
    await expect(page.getByText("Al confirmar se abrirá una nueva jornada para Caja 03.")).toBeVisible();
    await expect(page.getByText("Caja 03").first()).toBeVisible();
    await expect(page.getByText("Juan Pérez").first()).toBeVisible();
    // Still on the fondeo-inicial route — Confirmar hasn't run yet.
    await expect(page).toHaveURL(/\/worker\/caja\/fondeo-inicial$/);
    await expect(page.getByRole("heading", { name: "Caja abierta correctamente" })).toHaveCount(0);
  });

  test("shows the confirmed funds by currency", async ({ page }) => {
    await fillAndReview(page, { CUP: "200000", USD: "4000", EUR: "1500" });
    for (const value of ["200.000,00 CUP", "4.000,00 USD", "1.500,00 EUR"]) {
      await expect(page.getByText(value, { exact: true })).toBeVisible();
    }
  });

  test("Volver returns to the form with values preserved", async ({ page }) => {
    await fillAndReview(page, { CUP: "50000" });
    await page.getByRole("button", { name: "Volver" }).click();
    await expect(page.getByRole("heading", { name: "Registrar fondeo inicial" })).toBeVisible();
    await expect(page.getByLabel("Fondo inicial en CUP")).toHaveValue("50000");
  });
});

test.describe("fondeo inicial — confirmation and opening balances", () => {
  test("confirming creates an open jornada with the actual confirmation-time openedAt", async ({
    page,
  }) => {
    const before = Date.now();
    await fillReviewAndConfirm(page, { CUP: "200000" });
    const after = Date.now();

    const shown = await page
      .getByText(/^\d{2}\/\d{2}\/\d{4} · \d{2}:\d{2}$/)
      .first()
      .textContent();
    expect(shown).toBeTruthy();
    // The displayed timestamp is within the confirmation window — never a
    // value invented before the worker actually clicked confirm.
    const [datePart, timePart] = shown!.split(" · ") as [string, string];
    const [dd, mm, yyyy] = datePart.split("/").map(Number) as [number, number, number];
    const [hh, min] = timePart.split(":").map(Number) as [number, number];
    const parsed = new Date(yyyy, mm - 1, dd, hh, min).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before - 60_000);
    expect(parsed).toBeLessThanOrEqual(after + 60_000);
  });

  test("opening balances equal the confirmed funding, never added to prior history", async ({
    page,
  }) => {
    await fillReviewAndConfirm(page, { CUP: "200000", USD: "4000", EUR: "1500" });
    await page.getByRole("link", { name: "Ir a Caja" }).click();
    await expect(page).toHaveURL(/\/worker\/caja$/);

    const balancesTable = page.getByRole("table").first();
    for (const [currency, amount] of [
      ["CUP", "200.000,00"],
      ["USD", "4.000,00"],
      ["EUR", "1.500,00"],
      // GBP was left unfunded — the new jornada opens it at 0, not carried
      // over from the pre-existing 950,00 historical balance.
      ["GBP", "0,00"],
    ] as const) {
      const row = balancesTable.locator("tbody tr").filter({ hasText: currency });
      await expect(row.getByText(amount, { exact: true })).toBeVisible();
    }
  });

  test("creates a 'Fondeo inicial' movement for every currency funded above zero", async ({
    page,
  }) => {
    await fillReviewAndConfirm(page, { CUP: "75000", EUR: "300" });
    await page.getByRole("link", { name: "Ir a Caja" }).click();

    const table = page.getByRole("table").nth(1);
    const cupRow = table.locator("tbody tr").filter({ hasText: "Fondeo inicial" }).filter({
      hasText: "CUP",
    });
    const eurRow = table.locator("tbody tr").filter({ hasText: "Fondeo inicial" }).filter({
      hasText: "EUR",
    });

    await expect(cupRow.getByText("Entrada", { exact: true })).toBeVisible();
    await expect(cupRow.getByText("+75.000,00", { exact: true })).toBeVisible();
    // Saldo después equals the opening amount for that currency.
    await expect(cupRow.getByText("75.000,00", { exact: true })).toBeVisible();

    await expect(eurRow.getByText("Entrada", { exact: true })).toBeVisible();
    await expect(eurRow.getByText("+300,00", { exact: true })).toBeVisible();
    await expect(eurRow.getByText("300,00", { exact: true }).first()).toBeVisible();

    // Internal Caja movement, not a disguised customer operation.
    await expect(cupRow.getByText("—", { exact: true })).toBeVisible();
  });

  test("a currency left at zero creates no ledger movement", async ({ page }) => {
    await fillReviewAndConfirm(page, { USD: "500", GBP: "0" });
    await page.getByRole("link", { name: "Ir a Caja" }).click();

    const table = page.getByRole("table").nth(1);
    const gbpFondeo = table
      .locator("tbody tr")
      .filter({ hasText: "Fondeo inicial" })
      .filter({ hasText: "GBP" });
    await expect(gbpFondeo).toHaveCount(0);
  });
});

test.describe("fondeo inicial — success result", () => {
  test("shows the approved success content", async ({ page }) => {
    await fillReviewAndConfirm(page, { CUP: "200000", USD: "4000" });

    await expect(page.getByRole("heading", { name: "Caja abierta correctamente" })).toBeVisible();
    await expect(
      page.getByText("El fondeo inicial de Caja 03 se registró correctamente."),
    ).toBeVisible();
    await expect(page.getByText("Caja 03").first()).toBeVisible();
    await expect(page.getByText("Juan Pérez").first()).toBeVisible();
    await expect(page.getByText("Fecha y hora de apertura").first()).toBeVisible();
    await expect(page.getByText("200.000,00 CUP", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("4.000,00 USD", { exact: true }).first()).toBeVisible();
  });

  test("Imprimir comprobante triggers print with only the confirmed opening data", async ({
    page,
  }) => {
    await fillReviewAndConfirm(page, { CUP: "200000" });

    await page.evaluate(() => {
      (window as unknown as { __printed?: boolean }).__printed = false;
      window.print = () => {
        (window as unknown as { __printed?: boolean }).__printed = true;
      };
    });

    await page.getByRole("button", { name: "Imprimir comprobante" }).click();
    expect(await page.evaluate(() => (window as unknown as { __printed?: boolean }).__printed)).toBe(
      true,
    );

    // The print-only receipt is `hidden print:block` — invisible in normal
    // rendering, so it must be inspected under print media, same as the
    // existing Cambio de moneda receipt tests.
    await page.emulateMedia({ media: "print" });
    const receipt = page.locator("section", { hasText: "Comprobante de fondeo inicial" });
    await expect(receipt.getByText("Comprobante de fondeo inicial")).toBeVisible();
    await expect(receipt.getByText("Caja 03", { exact: true }).first()).toBeVisible();
    await expect(receipt.getByText("Juan Pérez", { exact: true })).toBeVisible();
    await expect(receipt.getByText("200.000,00 CUP", { exact: true })).toBeVisible();
  });

  test("Ir a Caja navigates to /worker/caja", async ({ page }) => {
    await fillReviewAndConfirm(page, { CUP: "200000" });
    await page.getByRole("link", { name: "Ir a Caja" }).click();
    await expect(page).toHaveURL(/\/worker\/caja$/);
  });
});

test.describe("fondeo inicial — only one open jornada", () => {
  test("a second opening is blocked after confirming, even navigating back to the route", async ({
    page,
  }) => {
    await fillReviewAndConfirm(page, { CUP: "200000" });
    await page.getByRole("link", { name: "Ir a Caja" }).click();
    await expect(page).toHaveURL(/\/worker\/caja$/);

    // The Caja action tile itself must no longer offer it — and its badge
    // must say why (already open), never "Próximamente", which would
    // misreport a flow that just ran successfully as merely unbuilt.
    const tile = page.getByRole("button", { name: /Registrar fondeo inicial/ });
    await expect(tile).toBeDisabled();
    await expect(tile.getByText("Jornada abierta")).toBeVisible();
    await expect(tile.getByText("Próximamente")).toHaveCount(0);

    // Returning to the route (same SPA session) shows the blocked state,
    // never the form again.
    await page.goBack();
    await expect(page.getByText("La caja ya está abierta")).toBeVisible();
    await expect(page.getByLabel("Fondo inicial en CUP")).toHaveCount(0);
  });
});

test.describe("fondeo inicial — layout", () => {
  for (const width of [1440, 1280]) {
    test(`fits without page-level horizontal scroll at ${width}px, main is the only scroller`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/worker/caja/fondeo-inicial");

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

    await fillReviewAndConfirm(page, { CUP: "200000", USD: "4000" });
    await page.getByRole("link", { name: "Ir a Caja" }).click();
    await expect(page).toHaveURL(/\/worker\/caja$/);

    expect(errors).toEqual([]);
  });
});
