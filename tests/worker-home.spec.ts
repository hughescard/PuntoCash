import { test, expect } from "@playwright/test";

/**
 * Worker home — content, navigation and shell.
 *
 * Data comes from the frontend mocks in `src/features/worker/`. When those are
 * replaced by real queries these tests should point at a seeded worker rather
 * than be rewritten.
 */

test.describe("worker home", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/worker/inicio");
  });

  test("renders the shell with the approved header content", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Hola, Juan" })).toBeVisible();
    await expect(page.getByText("Aquí tienes el estado de tu jornada.")).toBeVisible();

    // PuntoCash | Juan Pérez | Caja 03 | Perfil / Cerrar sesión (§10).
    const header = page.getByRole("banner");
    await expect(header.getByText("Juan Pérez")).toBeVisible();
    await expect(header.getByText("Caja 03")).toBeVisible();
    await expect(header.getByRole("link", { name: "Perfil" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Cerrar sesión" })).toBeVisible();
  });

  test("marks Inicio as the current navigation item", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(nav.getByRole("link", { name: "Inicio" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    for (const label of ["Nueva operación", "Operaciones", "Caja"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("offers one primary action", async ({ page }) => {
    const primary = page.getByRole("link", { name: "Nueva operación", exact: true });
    // The sidebar item and the page action share the label; the page action is
    // the only one that is a filled primary button.
    await expect(primary).toHaveCount(2);
    await expect(page.getByRole("main").getByRole("link", { name: "Nueva operación" })).toBeVisible();
  });

  test("shows the register balances by currency", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByText("Mi caja")).toBeVisible();

    for (const [currency, amount] of [
      ["CUP", "245.000,00"],
      ["USD", "3.850,00"],
      ["EUR", "2.120,00"],
    ] as const) {
      await expect(main.getByText(currency, { exact: true }).first()).toBeVisible();
      await expect(main.getByText(amount, { exact: true })).toBeVisible();
    }
  });

  test("shows the active rates as read-only data", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByText("Tasas vigentes")).toBeVisible();
    await expect(main.getByText("Actualizadas hace 4 min")).toBeVisible();

    for (const heading of ["Moneda", "Compra", "Venta"]) {
      await expect(main.getByRole("columnheader", { name: heading })).toBeVisible();
    }
    await expect(main.getByRole("cell", { name: "375,00" })).toBeVisible();
    await expect(main.getByRole("cell", { name: "490,00" })).toBeVisible();
  });

  test("shows SVG currency flags in Mi caja and Tasas vigentes, never emoji", async ({
    page,
  }) => {
    const main = page.getByRole("main");
    await expect(main.getByText("Mi caja")).toBeVisible();

    // Decorative SVGs are identified by a stable data attribute rather than
    // made accessible solely for testability (§4) — the currency code text is
    // what a screen reader announces.
    const flags = main.locator("svg[data-currency-flag]");
    await expect(flags).toHaveCount(6);

    const currencies = await flags.evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-currency-flag")),
    );
    // 3 in Mi caja (CUP, USD, EUR) + 3 in Tasas vigentes (USD, EUR, GBP).
    expect(currencies).toEqual(["CUP", "USD", "EUR", "USD", "EUR", "GBP"]);

    // Every flag is aria-hidden, so it never duplicates the currency code
    // announcement, and the flag never stands in as the sole identifier.
    for (const flag of await flags.all()) {
      await expect(flag).toHaveAttribute("aria-hidden", "true");
    }

    // Currency codes alone must carry the information; no emoji glyphs.
    const hasRegionalIndicator = await main.evaluate((el) =>
      /[\u{1F1E6}-\u{1F1FF}]/u.test(el.textContent ?? ""),
    );
    expect(hasRegionalIndicator).toBe(false);

    // The currency text remains present and authoritative alongside the flags.
    for (const currency of ["CUP", "USD", "EUR", "GBP"]) {
      await expect(main.getByText(currency, { exact: true }).first()).toBeVisible();
    }
  });

  test('"Ver todas" under Tasas vigentes goes to /worker/tasas, not /worker/operaciones', async ({
    page,
  }) => {
    const main = page.getByRole("main");
    // Exact match: "Ver todas" is a substring of "Ver todas las operaciones"
    // and "Ver todas las alertas", both of which also appear on this screen.
    await main.getByRole("link", { name: "Ver todas", exact: true }).click();

    await expect(page).toHaveURL(/\/worker\/tasas$/);
    await expect(page).not.toHaveURL(/\/worker\/operaciones$/);
    // Still inside the Worker shell.
    await expect(page.getByRole("banner").getByText("Caja 03")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
    // The placeholder must offer a way back.
    await page.getByRole("link", { name: /Volver a Inicio/ }).click();
    await expect(page).toHaveURL(/\/worker\/inicio$/);
  });

  test("shows exactly four quick actions plus the catalogue link", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByText("Accesos rápidos")).toBeVisible();

    for (const label of ["Cambio de moneda", "Remesas", "Extracción", "Inserción de efectivo"]) {
      await expect(main.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(main.getByRole("link", { name: "Ver todos los servicios" })).toBeVisible();
  });

  test("shows the five most recent operations with status badges", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByText("Operaciones recientes")).toBeVisible();

    await expect(main.getByRole("cell", { name: "OP-000523" })).toBeVisible();
    await expect(main.getByRole("cell", { name: "OP-000519" })).toBeVisible();
    await expect(main.getByRole("cell", { name: "María Rodríguez" })).toBeVisible();

    // Status is text, not colour alone (§20).
    await expect(main.getByText("En proceso")).toBeVisible();
    await expect(main.getByText("Completada").first()).toBeVisible();
  });

  test("formats operation amounts as amount, then currency", async ({ page }) => {
    const main = page.getByRole("main");

    // Canonical order: "350,00 USD", never "USD 350,00".
    for (const amount of [
      "350,00 USD",
      "500,00 USD",
      "200,00 USD",
      "150,00 EUR",
      "50.000,00 CUP",
    ]) {
      await expect(main.getByRole("cell", { name: amount, exact: true })).toBeVisible();
    }

    // Confirms the reverse order is not present anywhere on the page.
    await expect(page.getByText("USD 350,00")).toHaveCount(0);
    await expect(page.getByText("EUR 150,00")).toHaveCount(0);
  });

  test("shows the attention alert while one exists", async ({ page }) => {
    const alert = page.getByRole("status").filter({ hasText: "Efectivo bajo en EUR" });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("nivel operativo recomendado");
  });
});

test.describe("worker home navigation", () => {
  /** Every link out of the home screen must land somewhere real. */
  const destinations = [
    { name: "Ver caja", path: "/worker/caja" },
    { name: "Ver todas las operaciones", path: "/worker/operaciones" },
    { name: "Ver todos los servicios", path: "/worker/nueva-operacion" },
    { name: "Ver todas las alertas", path: "/worker/alertas" },
    { name: "Cambio de moneda", path: "/worker/nueva-operacion/cambio-moneda" },
    { name: "Inserción de efectivo", path: "/worker/nueva-operacion/insercion-efectivo" },
  ] as const;

  for (const { name, path } of destinations) {
    test(`"${name}" reaches ${path} inside the shell`, async ({ page }) => {
      await page.goto("/worker/inicio");
      await page.getByRole("main").getByRole("link", { name }).click();

      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}$`));
      // Still inside the Worker shell, not a bare page or a 404.
      await expect(page.getByRole("banner").getByText("Caja 03")).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Navegación principal" }),
      ).toBeVisible();
    });
  }
});

test.describe("shell scroll containment", () => {
  /**
   * The shell must scroll its main area only. Regression guard for two faults
   * that shipped together: `min-h-screen` made the document the scroller (so the
   * header and sidebar scrolled away), and an unconstrained `overflow-y: auto`
   * with `overscroll-behavior: contain` swallowed the wheel instead of chaining
   * it — leaving the scrollbar as the only way to move.
   */
  test("only the main area scrolls, and the wheel drives it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/worker/inicio");

    const before = await page.evaluate(() => {
      const main = document.querySelector("main")!;
      return {
        documentScrolls: document.documentElement.scrollHeight > window.innerHeight,
        mainScrolls: main.scrollHeight > main.clientHeight,
      };
    });
    expect(before.documentScrolls).toBe(false);
    expect(before.mainScrolls).toBe(true);

    // A wheel tick is what a two-finger trackpad swipe sends.
    await page.mouse.move(900, 500);
    await page.mouse.wheel(0, 600);
    await expect
      .poll(() => page.evaluate(() => document.querySelector("main")!.scrollTop))
      .toBeGreaterThan(0);

    // The chrome must not have moved.
    const chrome = await page.evaluate(() => ({
      headerTop: Math.round(document.querySelector("header")!.getBoundingClientRect().top),
      navTop: Math.round(
        document
          .querySelector('nav[aria-label="Navegación principal"]')!
          .getBoundingClientRect().top,
      ),
    }));
    expect(chrome).toEqual({ headerTop: 0, navTop: 72 });
  });
});

test.describe("worker home layout", () => {
  for (const width of [1440, 1280]) {
    test(`fits without horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/worker/inicio");

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);

      // Operation codes and amounts must stay on one line to be scannable.
      const wrapped = await page.evaluate(() =>
        [...document.querySelectorAll("td")]
          .filter((c) => c.getBoundingClientRect().height > 60)
          .map((c) => c.textContent?.trim() ?? ""),
      );
      expect(wrapped).toEqual([]);
    });
  }
});

test("a verified access lands on the worker home", async ({ page }) => {
  await page.goto("/worker/login");
  await page.getByLabel("Usuario o correo electrónico").fill("juan.perez");
  await page.getByLabel("Contraseña", { exact: true }).fill("puntocash");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  // Credentials alone do not open a session: the second factor is obligatory
  // for every sign-in [R13]. `482913` is the mock's accepted code.
  await expect(page).toHaveURL(/\/worker\/verificacion$/);
  await page.getByLabel("Código de verificación").fill("482913");

  // The sixth digit submits on its own; the button is the manual equivalent.
  await expect(page).toHaveURL(/\/worker\/inicio$/);
  await expect(page.getByRole("heading", { name: "Hola, Juan" })).toBeVisible();
});
