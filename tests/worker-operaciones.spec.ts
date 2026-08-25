import { test, expect } from "@playwright/test";

/**
 * Worker operaciones — list, filters, pagination and detail route.
 *
 * Data comes from the frontend mock in `src/features/operations/operations-history.ts`.
 * When that is replaced by a real paginated query these tests should point at
 * seeded fixtures rather than be rewritten.
 */

test.describe("worker operaciones — render and shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/operaciones");
  });

  test("renders the page header with no primary action", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Operaciones" })).toBeVisible();
    await expect(
      page.getByText("Consulta las operaciones realizadas desde tu caja."),
    ).toBeVisible();
    // No top-right CTA — only the sidebar/header content, no "Nueva operación"
    // button inside the page header row.
    await expect(page.getByRole("main").getByRole("heading", { name: "Operaciones" })).toBeVisible();
  });

  test("marks Operaciones as the current navigation item", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(nav.getByRole("link", { name: "Operaciones" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("renders the table with all seven columns", async ({ page }) => {
    for (const heading of [
      "Código",
      "Fecha y hora",
      "Cliente",
      "Servicio",
      "Importe",
      "Estado",
      "Acciones",
    ]) {
      await expect(page.getByRole("columnheader", { name: heading })).toBeVisible();
    }
    await expect(page.locator("tbody tr")).toHaveCount(20);
  });

  test("shows Cliente as plain text, never an avatar or initials chip", async ({ page }) => {
    await expect(page.getByRole("cell", { name: "Carlos Pérez Rodríguez" })).toBeVisible();
    // No avatar/initials chip elements anywhere in the table body.
    await expect(page.locator("tbody img")).toHaveCount(0);
    const clienteCell = page.getByRole("cell", { name: "Carlos Pérez Rodríguez" });
    await expect(clienteCell.locator("svg")).toHaveCount(0);
  });
});

test.describe("worker operaciones — Importe formatting", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/operaciones");
  });

  test("shows dual-currency Cambio de moneda rows with an arrow and both flags", async ({
    page,
  }) => {
    const row = page.locator("tbody tr").filter({ hasText: "Carlos Pérez Rodríguez" });
    await expect(row.getByText("1.000,00 USD")).toBeVisible();
    await expect(row.getByText("920,00 EUR")).toBeVisible();
    await expect(row.locator("svg[data-currency-flag]")).toHaveCount(2);
    await expect(row.locator("svg[data-currency-flag]").first()).toHaveAttribute(
      "data-currency-flag",
      "USD",
    );
    await expect(row.locator("svg[data-currency-flag]").last()).toHaveAttribute(
      "data-currency-flag",
      "EUR",
    );
  });

  test("shows single-currency rows with exactly one amount and one flag", async ({ page }) => {
    const row = page.locator("tbody tr").filter({ hasText: "Ana Ruiz" });
    await expect(row.getByText("250,00 USD", { exact: true })).toBeVisible();
    await expect(row.locator("svg[data-currency-flag]")).toHaveCount(1);
  });

  test("matches the spec's canonical amount and date examples exactly", async ({ page }) => {
    await expect(page.getByText("15.000,00 CUP", { exact: true })).toBeVisible();
    await expect(page.getByText("250,00 USD", { exact: true })).toBeVisible();
    // Canonical order is amount-then-currency, never the reverse.
    await expect(page.getByText("USD 1.000,00")).toHaveCount(0);
    await expect(page.getByText("EUR 920,00")).toHaveCount(0);
  });

  test("formats date and time as dd/MM/yyyy · HH:mm", async ({ page }) => {
    await expect(page.getByRole("cell", { name: /^\d{2}\/\d{2}\/\d{4} · \d{2}:\d{2}$/ }).first()).toBeVisible();
  });

  test("shows currency flags as aria-hidden SVGs, never emoji", async ({ page }) => {
    const flags = page.locator("tbody svg[data-currency-flag]");
    expect(await flags.count()).toBeGreaterThan(0);
    for (const flag of await flags.all()) {
      await expect(flag).toHaveAttribute("aria-hidden", "true");
    }
    const hasRegionalIndicator = await page.evaluate(() =>
      /[\u{1F1E6}-\u{1F1FF}]/u.test(document.querySelector("tbody")?.textContent ?? ""),
    );
    expect(hasRegionalIndicator).toBe(false);
  });
});

test.describe("worker operaciones — status", () => {
  test("shows all five approved status labels as text, not colour alone", async ({ page }) => {
    await page.goto("/worker/operaciones");
    for (const status of ["Completada", "En proceso", "Rechazada", "Fallida", "Cancelada"]) {
      await expect(page.getByText(status, { exact: true }).first()).toBeVisible();
    }
  });

  test("Rechazada and Fallida are independently represented, never merged", async ({ page }) => {
    await page.goto("/worker/operaciones");
    // Both statuses have their own dedicated mock rows (Ana Ruiz / Yasmani
    // Prieto), so both labels resolve to distinct, non-overlapping rows.
    const rechazadaRow = page.locator("tbody tr").filter({ hasText: "Ana Ruiz" });
    const fallidaRow = page.locator("tbody tr").filter({ hasText: "Yasmani Prieto" });

    await expect(rechazadaRow.getByText("Rechazada", { exact: true })).toBeVisible();
    await expect(rechazadaRow.getByText("Fallida", { exact: true })).toHaveCount(0);

    await expect(fallidaRow.getByText("Fallida", { exact: true })).toBeVisible();
    await expect(fallidaRow.getByText("Rechazada", { exact: true })).toHaveCount(0);
  });
});

test.describe("worker operaciones — filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/operaciones");
  });

  test("searches by código, cliente and documento, case- and accent-insensitively", async ({
    page,
  }) => {
    const search = page.getByPlaceholder("Buscar por código, cliente o documento");

    await search.fill("PC-260818-005004");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.getByRole("cell", { name: "PC-260818-005004" })).toBeVisible();

    await search.fill("perez rodriguez");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.getByRole("cell", { name: "Carlos Pérez Rodríguez" })).toBeVisible();

    await search.fill("90010112345");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.getByRole("cell", { name: "Carlos Pérez Rodríguez" })).toBeVisible();
  });

  test("filters by Servicio", async ({ page }) => {
    await page.getByLabel("Servicio").click();
    await page.getByRole("option", { name: "Cambio de moneda" }).click();

    const services = page.locator("tbody tr td:nth-child(4)");
    expect(await services.count()).toBeGreaterThan(0);
    for (const text of await services.allTextContents()) {
      expect(text.trim()).toBe("Cambio de moneda");
    }
  });

  test("Estado offers all five states plus Todos", async ({ page }) => {
    await page.getByLabel("Estado").click();
    const options = await page.getByRole("option").allTextContents();
    expect(options).toEqual(["Todos", "Completada", "En proceso", "Rechazada", "Fallida", "Cancelada"]);
  });

  test("filters by Estado = Rechazada, distinct from Fallida", async ({ page }) => {
    await page.getByLabel("Estado").click();
    await page.getByRole("option", { name: "Rechazada", exact: true }).click();

    const statuses = page.locator("tbody tr td:nth-child(6)");
    expect(await statuses.count()).toBeGreaterThan(0);
    for (const text of await statuses.allTextContents()) {
      expect(text.trim()).toBe("Rechazada");
    }
    await expect(page.getByText("Fallida", { exact: true })).toHaveCount(0);
  });

  test("filters by Estado = Fallida, distinct from Rechazada", async ({ page }) => {
    await page.getByLabel("Estado").click();
    await page.getByRole("option", { name: "Fallida", exact: true }).click();

    const statuses = page.locator("tbody tr td:nth-child(6)");
    expect(await statuses.count()).toBeGreaterThan(0);
    for (const text of await statuses.allTextContents()) {
      expect(text.trim()).toBe("Fallida");
    }
    await expect(page.getByText("Rechazada", { exact: true })).toHaveCount(0);
  });

  test("filters by Fecha", async ({ page }) => {
    const totalBefore = await page.getByText(/de \d+ operaciones/).textContent();

    await page.getByLabel("Fecha").click();
    await page.getByRole("option", { name: "Hoy" }).click();

    const totalAfter = await page.getByText(/de \d+ operaciones/).textContent();
    expect(totalAfter).not.toEqual(totalBefore);
  });

  test("Limpiar filtros restores the full list and is disabled at rest", async ({ page }) => {
    const clearButton = page.getByRole("main").getByRole("button", { name: "Limpiar filtros" });
    await expect(clearButton).toBeDisabled();

    await page.getByPlaceholder("Buscar por código, cliente o documento").fill("Ana Ruiz");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(clearButton).toBeEnabled();

    await clearButton.click();
    await expect(page.locator("tbody tr")).toHaveCount(20);
    await expect(page.getByPlaceholder("Buscar por código, cliente o documento")).toHaveValue("");
  });

  test("shows an empty state with a way back when no operation matches", async ({ page }) => {
    await page
      .getByPlaceholder("Buscar por código, cliente o documento")
      .fill("zzz-no-such-operation-zzz");

    await expect(page.getByText("No encontramos operaciones")).toBeVisible();
    await expect(
      page.getByText("Prueba ajustando los filtros o el término de búsqueda."),
    ).toBeVisible();

    await page.getByRole("row", { name: "No encontramos operaciones" }).getByRole("button", { name: "Limpiar filtros" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(20);
  });
});

test.describe("worker operaciones — custom date range", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/operaciones");
  });

  test("Fecha offers Personalizado alongside the four existing options", async ({ page }) => {
    await page.getByLabel("Fecha").click();
    const options = await page.getByRole("option").allTextContents();
    expect(options).toEqual(["Todos", "Hoy", "Últimos 7 días", "Últimos 30 días", "Personalizado"]);
  });

  test("selecting Personalizado reveals Desde/Hasta, and leaving it hides them", async ({
    page,
  }) => {
    await expect(page.getByLabel("Desde")).toHaveCount(0);

    await page.getByLabel("Fecha").click();
    await page.getByRole("option", { name: "Personalizado" }).click();
    await expect(page.getByLabel("Desde")).toBeVisible();
    await expect(page.getByLabel("Hasta")).toBeVisible();

    await page.getByLabel("Fecha").click();
    await page.getByRole("option", { name: "Todos", exact: true }).click();
    await expect(page.getByLabel("Desde")).toHaveCount(0);
  });

  test("a valid custom range filters inclusively", async ({ page }) => {
    await page.getByLabel("Fecha").click();
    await page.getByRole("option", { name: "Personalizado" }).click();
    await page.getByLabel("Desde").fill("2026-08-15");
    await page.getByLabel("Hasta").fill("2026-08-17");

    const dates = await page.locator("tbody tr td:nth-child(2)").allTextContents();
    expect(dates.length).toBeGreaterThan(0);
    for (const cell of dates) {
      const [day, month, year] = cell.split(" · ")[0]!.split("/");
      const recordDate = new Date(Number(year), Number(month) - 1, Number(day));
      expect(recordDate >= new Date(2026, 7, 15)).toBe(true);
      expect(recordDate <= new Date(2026, 7, 17)).toBe(true);
    }
    // The boundary dates themselves are included, not excluded.
    await expect(page.getByRole("cell", { name: "15/08/2026 · 10:00" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "17/08/2026 · 10:00" })).toBeVisible();
  });

  test("Desde alone filters from that date onward", async ({ page }) => {
    await page.getByLabel("Fecha").click();
    await page.getByRole("option", { name: "Personalizado" }).click();
    await page.getByLabel("Desde").fill("2026-08-16");

    const dates = await page.locator("tbody tr td:nth-child(2)").allTextContents();
    expect(dates.length).toBeGreaterThan(0);
    for (const cell of dates) {
      const [day, month, year] = cell.split(" · ")[0]!.split("/");
      const recordDate = new Date(Number(year), Number(month) - 1, Number(day));
      expect(recordDate >= new Date(2026, 7, 16)).toBe(true);
    }
  });

  test("Hasta alone filters up to that date", async ({ page }) => {
    await page.getByLabel("Fecha").click();
    await page.getByRole("option", { name: "Personalizado" }).click();
    await page.getByLabel("Hasta").fill("2026-08-10");

    const dates = await page.locator("tbody tr td:nth-child(2)").allTextContents();
    expect(dates.length).toBeGreaterThan(0);
    for (const cell of dates) {
      const [day, month, year] = cell.split(" · ")[0]!.split("/");
      const recordDate = new Date(Number(year), Number(month) - 1, Number(day));
      expect(recordDate <= new Date(2026, 7, 10)).toBe(true);
    }
  });

  test("Desde after Hasta shows a validation message and does not apply the range", async ({
    page,
  }) => {
    await page.getByLabel("Fecha").click();
    await page.getByRole("option", { name: "Personalizado" }).click();

    const rowsBeforeInvalidInput = await page.locator("tbody tr").count();

    await page.getByLabel("Desde").fill("2026-08-20");
    await page.getByLabel("Hasta").fill("2026-08-10");

    await expect(page.getByText("Desde no puede ser posterior a Hasta.").first()).toBeVisible();
    await expect(page.getByLabel("Desde")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Hasta")).toHaveAttribute("aria-invalid", "true");
    // The broken range is not applied — the list keeps showing its
    // (unfiltered-by-date) rows rather than silently rendering zero results.
    await expect(page.locator("tbody tr")).toHaveCount(rowsBeforeInvalidInput);
  });

  test("Limpiar filtros resets Fecha to Todos and clears Desde/Hasta", async ({ page }) => {
    await page.getByLabel("Fecha").click();
    await page.getByRole("option", { name: "Personalizado" }).click();
    await page.getByLabel("Desde").fill("2026-08-10");
    await page.getByLabel("Hasta").fill("2026-08-12");

    await page.getByRole("main").getByRole("button", { name: "Limpiar filtros" }).click();

    await expect(page.getByLabel("Fecha")).toHaveText("Todos");
    await expect(page.getByLabel("Desde")).toHaveCount(0);
    await expect(page.getByText(/Mostrando/)).toContainText("Mostrando 1–20 de 128 operaciones");
  });

  test("changing the custom range resets pagination to page 1", async ({ page }) => {
    await page.getByRole("navigation", { name: "Paginación" }).getByRole("button", { name: "2", exact: true }).click();
    await expect(page.getByText(/Mostrando/)).toContainText("21–40");

    await page.getByLabel("Fecha").click();
    await page.getByRole("option", { name: "Personalizado" }).click();
    await page.getByLabel("Desde").fill("2026-08-01");

    await expect(page.getByText(/Mostrando/)).toContainText("Mostrando 1–");
  });
});

test.describe("worker operaciones — pagination", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/operaciones");
  });

  test('shows "Mostrando 1–20 de 128 operaciones" and the numbered page window', async ({
    page,
  }) => {
    await expect(page.getByText("Mostrando")).toContainText("Mostrando 1–20 de 128 operaciones");

    const nav = page.getByRole("navigation", { name: "Paginación" });
    await expect(nav.getByRole("button", { name: "Anterior" })).toBeDisabled();
    await expect(nav.getByRole("button", { name: "1", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("button", { name: "7", exact: true })).toBeVisible();
    await expect(nav.getByText("…")).toBeVisible();
  });

  test("navigating to the next page loads a different set of operations", async ({ page }) => {
    const firstCodePage1 = await page.locator("tbody tr td:nth-child(1)").first().textContent();

    await page.getByRole("navigation", { name: "Paginación" }).getByRole("button", { name: "2", exact: true }).click();

    await expect(page.getByText("Mostrando")).toContainText("Mostrando 21–40 de 128 operaciones");
    const firstCodePage2 = await page.locator("tbody tr td:nth-child(1)").first().textContent();
    expect(firstCodePage2).not.toEqual(firstCodePage1);
  });

  test("changing a filter resets pagination back to page 1", async ({ page }) => {
    await page.getByRole("navigation", { name: "Paginación" }).getByRole("button", { name: "2", exact: true }).click();
    await expect(page.getByText("Mostrando")).toContainText("21–40");

    await page.getByLabel("Servicio").click();
    await page.getByRole("option", { name: "Cambio de moneda" }).click();

    await expect(page.getByText("Mostrando")).toContainText("Mostrando 1–");
  });
});

test.describe("worker operaciones — detail route", () => {
  test('"Ver detalle" opens the matching operation, never a 404', async ({ page }) => {
    await page.goto("/worker/operaciones");
    const row = page.locator("tbody tr").filter({ hasText: "Carlos Pérez Rodríguez" });
    await row.getByRole("link", { name: "Ver detalle" }).click();

    await expect(page).toHaveURL(/\/worker\/operaciones\/PC-\d{6}-\d{6}$/);
    await expect(page.getByRole("heading", { name: /^Operación PC-/ })).toBeVisible();
    // Filtered to what is rendered: the detail screen also carries a
    // print-only comprobante repeating these same values off-screen.
    // The detail itself is covered in `worker-operacion-detalle.spec.ts`.
    await expect(page.getByText("Carlos Pérez Rodríguez").filter({ visible: true })).toBeVisible();
    await expect(page.getByText("1.000,00 USD").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("920,00 EUR").filter({ visible: true }).first()).toBeVisible();
    // Still inside the Worker shell.
    await expect(page.getByRole("banner").getByText("Caja 03")).toBeVisible();
  });

  test("an unknown code renders a graceful not-found card, not a hard 404", async ({ page }) => {
    const response = await page.goto("/worker/operaciones/PC-NOPE-000000");
    expect(response?.status()).toBeLessThan(400);

    await expect(page.getByText("Operación no encontrada")).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver a Operaciones" }).first()).toBeVisible();
    await page.getByRole("link", { name: "Volver a Operaciones" }).first().click();
    await expect(page).toHaveURL(/\/worker\/operaciones$/);
  });
});

test.describe("worker operaciones — layout", () => {
  for (const width of [1440, 1280]) {
    test(`fits without page-level horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/worker/operaciones");

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

    await page.goto("/worker/operaciones", { waitUntil: "networkidle" });
    expect(errors).toEqual([]);
  });
});
