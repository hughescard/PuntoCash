import { test, expect } from "./worker-fixture";

/**
 * Worker home — content, navigation and shell.
 *
 * Los datos son los de la caja del puesto de la prueba, en la red: una copia de
 * PuntoCash Vedado con sus tasas, una jornada abierta con estos fondos y dos
 * giros enviados.
 */

test.use({ conCambio: true, fondos: { CUP: 245_000, USD: 3_850, EUR: 2_120 }, giros: [50_000, 2_500] });

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
    await expect(header.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
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

  test("Mi caja lista las monedas de la caja, sin importes", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByText("Mi caja")).toBeVisible();
    const monedas = main.getByRole("list", { name: "Monedas de la caja" });
    for (const currency of ["CUP", "USD", "EUR"]) {
      await expect(monedas.getByText(currency, { exact: true })).toBeVisible();
    }
    /* Worker opera a ciegas (6/11/2026). */
    for (const amount of ["297.500,00", "3.850,00", "2.120,00"]) {
      await expect(main.getByText(amount, { exact: true })).toHaveCount(0);
    }
  });

  test("shows the active rates as read-only data", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByText("Tasas vigentes")).toBeVisible();
    await expect(main.getByText("Las que tu sede tiene en vigor")).toBeVisible();

    for (const heading of ["Moneda", "Compra", "Venta"]) {
      await expect(main.getByRole("columnheader", { name: heading })).toBeVisible();
    }
    /* Las tasas de PuntoCash Vedado: USD 318/326, EUR 342/354, GBP 398/410. */
    await expect(main.getByRole("cell", { name: "318,00" })).toBeVisible();
    await expect(main.getByRole("cell", { name: "410,00" })).toBeVisible();
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
    await expect(flags).toHaveCount(12);

    const currencies = await flags.evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-currency-flag")),
    );
    // 4 en Mi caja (CUP, USD, EUR y GBP, en cero) + 3 en Tasas vigentes (USD, EUR, GBP)
    // + 2 que la sede maneja sin tasa (CHF, MXN), en «No se cambian hoy»
    // + 3 con tarifa de giros (CUP, USD, EUR) en «Tarifas vigentes»; la libra no tiene.
    expect(currencies).toEqual(["CUP", "USD", "EUR", "GBP", "USD", "EUR", "GBP", "CHF", "MXN", "CUP", "USD", "EUR"]);

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

  test("la tarjeta de tasas dice desde cuándo rige cada una, y ya no lleva a otra pantalla", async ({ page }) => {
    const main = page.getByRole("main");
    const tabla = main.getByRole("table").filter({ hasText: "Compra" });
    await expect(tabla.getByRole("columnheader", { name: "Desde" })).toBeVisible();
    /* El puesto de prueba copia las tasas de Vedado al crearse: rigen desde hoy. */
    await expect(tabla.getByText(/^hoy · \d{2}:\d{2}$/).first()).toBeVisible();
    await expect(main.getByRole("link", { name: "Ver todas", exact: true })).toHaveCount(0);
    /* La sección Alertas de Worker ya no existe: las alertas están en el aviso de la caja. */
    await expect(main.getByRole("link", { name: "Ver todas las alertas" })).toHaveCount(0);
  });

  test("la tarjeta de tarifas dice, por servicio, lo que paga el cliente y desde cuándo", async ({ page }) => {
    /* Decisión del 24/11/2026: el trabajador contesta delante del cliente sin empezar una operación. */
    const tarjeta = page.getByRole("region", { name: "Tarifas vigentes" });
    const giro = tarjeta.getByRole("region", { name: "Tarifa de Enviar giro" });
    await expect(giro.getByText("La paga el remitente, al enviar.", { exact: false })).toBeVisible();

    const usd = giro.getByRole("listitem", { name: "Tarifa en USD" });
    await expect(usd.getByText(/^Desde /)).toBeVisible();
    /* El mínimo va arriba; cada tramo dice hasta dónde llega, incluido. */
    await expect(usd.getByText("Hasta 100,00")).toBeVisible();
    await expect(usd.getByText("3,00 USD")).toBeVisible();
    await expect(usd.getByText("Hasta 500,00")).toBeVisible();
    await expect(usd.getByText("Más de 500,00")).toBeVisible();
    await expect(usd.getByText("1,00 USD + 2 %")).toBeVisible();
    await expect(giro.getByRole("listitem")).toHaveCount(3);

    /* La libra está en la caja, pero PuntoCash no le ha puesto tarifa de giros. */
    await expect(giro.getByText("No se envía en GBP: PuntoCash no le ha puesto tarifa.")).toBeVisible();
    await expect(tarjeta.getByText("Sin tarifa: Cambio de moneda, Remesas, Cobrar giro.", { exact: false })).toBeVisible();
  });

  test("los accesos rápidos son los servicios que la sede presta, más el catálogo", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByText("Accesos rápidos")).toBeVisible();

    for (const label of ["Cambio de moneda", "Remesas", "Giros"]) {
      await expect(main.getByRole("link", { name: label })).toBeVisible();
    }
    /* Un servicio que el producto todavía no ofrece no es un acceso rápido. */
    await expect(main.getByRole("link", { name: "Inserción de efectivo" })).toHaveCount(0);
    await expect(main.getByRole("link", { name: "Ver todos los servicios" })).toBeVisible();
  });

  test("muestra las últimas operaciones de esta caja, con su estado", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByText("Operaciones recientes")).toBeVisible();
    await expect(main.getByRole("cell", { name: "María Rodríguez" })).toBeVisible();
    await expect(main.getByRole("cell", { name: "Carlos Gómez" })).toBeVisible();
    await expect(main.getByRole("cell", { name: /^PC-\d{6}-\d{6}$/ })).toHaveCount(2);
    // Status is text, not colour alone (§20).
    await expect(main.getByText("Completada").first()).toBeVisible();
  });

  test("formats operation amounts as amount, then currency", async ({ page }) => {
    const main = page.getByRole("main");
    for (const amount of ["50.000,00 CUP", "2.500,00 CUP"]) {
      await expect(main.getByRole("cell", { name: amount, exact: true })).toBeVisible();
    }
    await expect(page.getByText("CUP 50.000,00")).toHaveCount(0);
  });

  test("no inventa avisos: «efectivo bajo» no existe mientras nadie fije su umbral", async ({ page }) => {
    await expect(page.getByRole("main").getByText("Mi caja")).toBeVisible();
    await expect(page.getByText(/Efectivo bajo|Nivel bajo/)).toHaveCount(0);
  });
});

test.describe("worker home navigation", () => {
  /** Every link out of the home screen must land somewhere real. */
  const destinations = [
    { name: "Ver caja", path: "/worker/caja" },
    { name: "Ver todas las operaciones", path: "/worker/operaciones" },
    { name: "Ver todos los servicios", path: "/worker/nueva-operacion" },
    { name: "Cambio de moneda", path: "/worker/nueva-operacion/cambio-moneda" },
    { name: "Giros", path: "/worker/nueva-operacion/giros" },
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
    // El shell de `/worker` vive detrás de la puerta de vinculación, que es un
    // componente de cliente: solo existe tras la hidratación (Worker FRD §2.1).
    // Sin esperarlo, una lectura sincrónica del DOM mide una página vacía.
    await page.getByRole("main").waitFor();

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
      // El shell de `/worker` solo existe tras la hidratación (ver `tests/README.md`):
      // medir antes mide una página vacía, y la aserción pasaría en falso.
      await page.getByRole("main").waitFor();

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

test("a verified access lands on the worker home", async ({ page, puesto }) => {
  await page.goto("/worker/login");
  await page.getByLabel("Usuario o correo electrónico").fill(puesto.identifier);
  await page.getByLabel("Contraseña", { exact: true }).fill("puntocash");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  // Credentials alone do not open a session: the second factor is obligatory
  // for every sign-in [R13]. `123456` is the mock's accepted code.
  await expect(page).toHaveURL(/\/worker\/verificacion$/);
  await page.getByLabel("Código de verificación").fill("123456");

  // The sixth digit submits on its own; the button is the manual equivalent.
  await expect(page).toHaveURL(/\/worker\/inicio$/);
  await expect(page.getByRole("heading", { name: "Hola, Juan" })).toBeVisible();
});

test.describe("Tasas en Inicio · monedas que no se cambian", () => {
  test.use({ monedas: ["CUP", "USD", "CHF"] });

  test("una moneda de la caja sin tasa sale aparte, con el porqué", async ({ page }) => {
    await page.goto("/worker/inicio");
    const lista = page.getByRole("list", { name: "Monedas que no se cambian hoy" });
    await expect(lista).toContainText("CHF");
    await expect(lista).toContainText("Tu sede no le ha puesto tasa");
    await expect(lista).not.toContainText("USD");
  });

  test("las rutas viejas de Tasas y Alertas ya no existen", async ({ page }) => {
    for (const ruta of ["/worker/tasas", "/worker/alertas"]) {
      const r = await page.goto(ruta);
      expect(r?.status()).toBe(404);
    }
  });
});

test.describe("en una sede sin Giros", () => {
  test.use({ servicios: ["cambio-moneda", "remesas"], giros: [] });

  test("no hay tarjeta de tarifas: ningún servicio de la sede la lleva", async ({ page }) => {
    await page.goto("/worker/inicio");
    await expect(page.getByRole("main").getByText("Tasas vigentes")).toBeVisible();
    await expect(page.getByRole("region", { name: "Tarifas vigentes" })).toBeHidden();
  });
});
