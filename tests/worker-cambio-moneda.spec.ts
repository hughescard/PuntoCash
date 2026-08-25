import { test, expect, type Page } from "@playwright/test";

/**
 * Cambio de moneda — the first complete PuntoCash operation.
 *
 * Quotes come from the mock provider and clients from the mock repository, both
 * deterministic. The seeded client is Carlos Pérez Rodríguez (CI 90010112345)
 * and the register holds 2.120,00 EUR, so 1.000,00 USD → 920,00 EUR is the
 * happy path and anything above ~2.304,00 USD exhausts the register.
 */

const FLOW = "/worker/nueva-operacion/cambio-moneda";
const SEEDED_DOCUMENT = "90010112345";

async function setAmount(page: Page, value: string) {
  const amount = page.getByLabel("Monto a entregar");
  await amount.fill(value);
  await amount.blur();
}

/** Step 1 → Step 2. */
async function goToCliente(page: Page) {
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Buscar cliente" })).toBeVisible();
}

/** Step 2 → Step 3, selecting the seeded client. */
async function goToRevision(page: Page) {
  await page.getByLabel("Número de documento").fill(SEEDED_DOCUMENT);
  await page.getByRole("button", { name: "Buscar cliente" }).click();
  await page.getByRole("button", { name: /Seleccionar cliente y continuar/ }).click();
  await expect(page.getByRole("button", { name: "Confirmar cambio" })).toBeVisible();
}

test.describe("step 1 · cambio", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FLOW);
  });

  test("renders the flow with step 1 current and the quote calculated", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Cambio de moneda", level: 1 })).toBeVisible();
    await expect(page.getByText("Define el cambio que realizará el cliente.")).toBeVisible();

    // Stepper marks the current step without relying on colour.
    const current = page.locator('li[aria-current="step"]');
    await expect(current).toContainText("Cambio");

    // Sidebar still marks the catalog section, inside the shell.
    await expect(
      page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", {
        name: "Nueva operación",
      }),
    ).toHaveAttribute("aria-current", "page");

    await expect(page.getByLabel("Monto a recibir (calculado)")).toHaveValue("920,00");
    await expect(page.getByText("1 USD = 0,9200 EUR").first()).toBeVisible();
  });

  test("uses SVG flags and never emoji", async ({ page }) => {
    await expect(page.locator("svg[data-currency-flag]").first()).toBeVisible();

    const text = await page.getByRole("main").innerText();
    expect(/[\u{1F1E6}-\u{1F1FF}]/u.test(text)).toBe(false);
  });

  test("uses the canonical money order, amount before currency", async ({ page }) => {
    const summary = page.getByRole("main");
    await expect(summary.getByText("1.000,00 USD").first()).toBeVisible();
    await expect(summary.getByText("920,00 EUR").first()).toBeVisible();
    await expect(page.getByText("USD 1.000,00")).toHaveCount(0);
  });

  test("recalculates when the amount changes", async ({ page }) => {
    await setAmount(page, "2000");
    await expect(page.getByLabel("Monto a recibir (calculado)")).toHaveValue("1.840,00");
  });

  test("swapping exchanges both sides and re-quotes", async ({ page }) => {
    await page.getByRole("button", { name: /Intercambiar monedas/ }).click();

    await expect(page.getByLabel("Moneda origen")).toContainText("EUR");
    await expect(page.getByLabel("Moneda destino")).toContainText("USD");
    await expect(page.getByText(/1 EUR = 1,0870 USD/).first()).toBeVisible();
  });

  test("never allows the same currency on both sides", async ({ page }) => {
    // Choosing the destination's currency as source swaps rather than collides.
    await page.getByLabel("Moneda origen").click();
    await page.getByRole("option", { name: /EUR/ }).click();

    await expect(page.getByLabel("Moneda origen")).toContainText("EUR");
    await expect(page.getByLabel("Moneda destino")).not.toContainText("EUR");
  });

  for (const [value, message] of [
    ["", "Introduce el monto a entregar."],
    ["0", "El monto debe ser mayor que cero."],
  ] as const) {
    test(`rejects the amount "${value}" with a specific message`, async ({ page }) => {
      await setAmount(page, value);

      await expect(page.getByText(message)).toBeVisible();
      await expect(page.getByRole("button", { name: "Continuar", exact: true })).toBeDisabled();
    });
  }

  test("blocks continuing when the register cannot cover the payout", async ({ page }) => {
    await setAmount(page, "9000");

    await expect(page.getByText("Fondos insuficientes en caja").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar", exact: true })).toBeDisabled();
  });

  test("allows continuing when funds are sufficient", async ({ page }) => {
    await expect(page.getByText("Fondos suficientes").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar", exact: true })).toBeEnabled();
  });
});

test.describe("step 2 · cliente", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FLOW);
    await goToCliente(page);
  });

  test("becomes the current step and keeps the quote in view", async ({ page }) => {
    await expect(page.locator('li[aria-current="step"]')).toContainText("Cliente");
    await expect(page.getByText("Identifica al cliente para continuar.")).toBeVisible();

    // The side summary carries the committed numbers (§14).
    await expect(page.getByText("1.000,00 USD").first()).toBeVisible();
    await expect(page.getByText("1.200,00 EUR").first()).toBeVisible();
  });

  test("finds the seeded client and shows them read-only", async ({ page }) => {
    await page.getByLabel("Número de documento").fill(SEEDED_DOCUMENT);
    await page.getByRole("button", { name: "Buscar cliente" }).click();

    await expect(page.getByText("Cliente encontrado")).toBeVisible();
    await expect(page.getByText("Carlos Pérez Rodríguez")).toBeVisible();
    // Timezone-safe calendar date, not the previous day.
    await expect(page.getByText("1 ene 1990")).toBeVisible();

    // Workers select clients; they never edit them (§12).
    await expect(page.getByRole("button", { name: /Editar/ })).toHaveCount(0);
  });

  test("an unknown document offers registration with exactly the base KYC set", async ({
    page,
  }) => {
    await page.getByLabel("Número de documento").fill("00000000000");
    await page.getByRole("button", { name: "Buscar cliente" }).click();

    await expect(page.getByText("Cliente no encontrado")).toBeVisible();
    await page.getByRole("button", { name: "Registrar nuevo cliente" }).click();

    const labels = await page.$$eval("form label", (els) =>
      els.map((el) => el.textContent?.replace("*", "").trim() ?? ""),
    );
    expect(labels).toEqual([
      "Tipo de documento",
      "Número de documento",
      "Nombre",
      "Primer apellido",
      "Segundo apellido",
      "Fecha de nacimiento",
      "Teléfono",
      "Nacionalidad",
    ]);
    // Address is decorative in the references and is not approved KYC (§12).
    expect(labels).not.toContain("Dirección");
  });

  test("registers a new client and continues with them", async ({ page }) => {
    await page.getByLabel("Número de documento").fill("99887766554");
    await page.getByRole("button", { name: "Buscar cliente" }).click();
    await page.getByRole("button", { name: "Registrar nuevo cliente" }).click();

    await page.getByLabel("Nombre").fill("Ana");
    await page.getByLabel("Primer apellido").fill("Torres");
    await page.getByLabel("Segundo apellido").fill("Lima");
    await page.getByLabel("Fecha de nacimiento").fill("1992-05-04");
    await page.getByLabel("Teléfono").fill("+53 5 999 0000");
    await page.getByRole("button", { name: "Registrar y continuar" }).click();

    await expect(page.getByRole("button", { name: "Confirmar cambio" })).toBeVisible();
    await expect(page.getByText("Ana Torres Lima").first()).toBeVisible();
  });

  test("the simulated scan locates a registered document", async ({ page }) => {
    await page.getByRole("button", { name: /Escanear QR/ }).click();
    // The UI must not pretend a real scan happened (§11).
    await expect(page.getByText("Lector no disponible en esta versión")).toBeVisible();

    await page.getByRole("button", { name: /Simular documento registrado/ }).click();
    await expect(page.getByText("Carlos Pérez Rodríguez")).toBeVisible();
  });

  test("the simulated scan of an unknown document offers registration", async ({ page }) => {
    await page.getByRole("button", { name: /Escanear QR/ }).click();
    await page.getByRole("button", { name: /Simular documento no registrado/ }).click();

    await expect(page.getByText("Cliente no encontrado")).toBeVisible();
  });
});

test.describe("step 3 · revisión", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FLOW);
    await goToCliente(page);
    await goToRevision(page);
  });

  test("carries the client, the quote snapshot and the cash arithmetic", async ({ page }) => {
    await expect(page.locator('li[aria-current="step"]')).toContainText("Revisión");
    await expect(page.getByText("Carlos Pérez Rodríguez")).toBeVisible();

    const main = page.getByRole("main");
    await expect(main.getByText("1.000,00 USD").first()).toBeVisible();
    await expect(main.getByText("920,00 EUR").first()).toBeVisible();
    await expect(main.getByText("1 USD = 0,9200 EUR").first()).toBeVisible();

    // Before / deduction / after.
    await expect(main.getByText("2.120,00 EUR").first()).toBeVisible();
    await expect(main.getByText("− 920,00 EUR").first()).toBeVisible();
    await expect(main.getByText("1.200,00 EUR").first()).toBeVisible();
  });

  test("shows worker and register but allocates no code before confirmation", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByText("Juan Pérez").first()).toBeVisible();
    await expect(main.getByText("Caja 03").first()).toBeVisible();

    // The identifier is created by a successful confirmation, never earlier (§16).
    await expect(main.getByText(/PC-\d{6}-\d{6}/)).toHaveCount(0);
  });

  test("confirming shows a busy state and cannot be submitted twice", async ({ page }) => {
    const confirm = page.getByRole("button", { name: "Confirmar cambio" });
    await confirm.click();

    // While in flight the control reports busy and is no longer clickable.
    const busy = page.getByRole("button", { name: /Confirmando/ });
    await expect(busy).toHaveAttribute("aria-busy", "true");
    await expect(busy).toBeDisabled();

    await expect(page.getByText("Cambio realizado correctamente")).toBeVisible();
    // One confirmation, one operation: the result card carries a single code
    // (the print-only receipt repeats the same one off-screen).
    await expect(page.getByRole("main").getByText(/PC-\d{6}-\d{6}/).first()).toBeVisible();
  });
});

test.describe("flow action model", () => {
  /**
   * Exactly one action set per step, per the approved model:
   *   Step 1 — "Volver a Nueva operación" (top-left) + "Cancelar operación"
   *            (top-right) + "Continuar" (bottom-right). No bottom-left action.
   *   Step 2/3 — no top-left link; "Cancelar operación" (top-right) is the only
   *              escape hatch; "Volver" (bottom-left) returns one step.
   */
  test("step 1 shows a single Cancelar operación and no bottom Volver", async ({ page }) => {
    await page.goto(FLOW);

    await expect(page.getByRole("button", { name: "Cancelar operación" })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Volver a Nueva operación" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Volver", exact: true })).toHaveCount(0);
  });

  test("step 2 hides the top-left link and shows Volver + Cancelar", async ({ page }) => {
    await page.goto(FLOW);
    await goToCliente(page);

    await expect(page.getByRole("link", { name: "Volver a Nueva operación" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cancelar operación" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Volver", exact: true })).toBeVisible();
  });

  test("step 3 hides the top-left link and shows Volver + Cancelar", async ({ page }) => {
    await page.goto(FLOW);
    await goToCliente(page);
    await goToRevision(page);

    await expect(page.getByRole("link", { name: "Volver a Nueva operación" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cancelar operación" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Volver", exact: true })).toBeVisible();
  });
});

test.describe("navigation and cancellation", () => {
  test("going back preserves everything already entered", async ({ page }) => {
    await page.goto(FLOW);
    await setAmount(page, "1500");
    await goToCliente(page);
    await goToRevision(page);

    await page.getByRole("button", { name: "Volver" }).click();
    await expect(page.getByText("Carlos Pérez Rodríguez")).toBeVisible();

    await page.getByRole("button", { name: "Volver" }).click();
    await expect(page.getByLabel("Monto a entregar")).toHaveValue("1.500,00");
    await expect(page.getByLabel("Monto a recibir (calculado)")).toHaveValue("1.380,00");
  });

  test("cancelling a started operation asks before discarding", async ({ page }) => {
    await page.goto(FLOW);
    await setAmount(page, "1500");

    await page.getByRole("button", { name: "Cancelar operación" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Se descartarán los datos introducidos");

    // Dismissing keeps the operation intact.
    await dialog.getByRole("button", { name: "Seguir con la operación" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByLabel("Monto a entregar")).toHaveValue("1.500,00");

    // Confirming returns to the catalog.
    await page.getByRole("button", { name: "Cancelar operación" }).first().click();
    await page.getByRole("button", { name: "Sí, cancelar operación" }).click();
    await expect(page).toHaveURL(/\/worker\/nueva-operacion$/);
  });
});

test.describe("result", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FLOW);
    await goToCliente(page);
    await goToRevision(page);
    await page.getByRole("button", { name: "Confirmar cambio" }).click();
    await expect(page.getByText("Cambio realizado correctamente")).toBeVisible();
  });

  test("reports the operation with the same figures that were reviewed", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByText(/PC-\d{6}-\d{6}/).first()).toBeVisible();
    await expect(main.getByText("Carlos Pérez Rodríguez").first()).toBeVisible();
    await expect(main.getByText("1.000,00 USD").first()).toBeVisible();
    await expect(main.getByText("920,00 EUR").first()).toBeVisible();
    await expect(main.getByText("1 USD = 0,9200 EUR").first()).toBeVisible();

    // A completed operation offers no way back into the flow (§19), and none
    // of the in-flow actions survive onto the result screen.
    await expect(page.getByRole("button", { name: "Volver" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cancelar operación" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Volver a Nueva operación" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Imprimir comprobante" })).toBeVisible();
  });

  test("shows the completion timestamp in the canonical PuntoCash format", async ({
    page,
  }) => {
    // dd/MM/yyyy · HH:mm — zero-padded day/month, four-digit year, 24-hour
    // time, joined with " · ". Not locale-driven "18/8/26, 12:13".
    // (The date-of-birth formatter is separate and already covered in the
    // step 2 test asserting "1 ene 1990" is unaffected by this change.)
    const timestampPattern = /\b\d{2}\/\d{2}\/\d{4} · \d{2}:\d{2}\b/;

    // The print-only receipt carries the same "Fecha y hora" label at all
    // times (just CSS-hidden until print media), so the visible one is
    // disambiguated by `:visible` rather than by role or DOM position.
    const label = page.getByText("Fecha y hora", { exact: true }).and(page.locator(":visible"));
    const value = label.locator("xpath=following-sibling::*[1]");
    await expect(value).toHaveText(timestampPattern);
  });

  test("the printable receipt uses the same canonical timestamp format", async ({
    page,
  }) => {
    // The receipt is `hidden print:block` — invisible in normal rendering,
    // shown only under print media — but reuses the exact same formatDateTime
    // call, so this exercises "wherever the operation displays its date/time".
    await page.emulateMedia({ media: "print" });

    const timestampPattern = /\b\d{2}\/\d{2}\/\d{4} · \d{2}:\d{2}\b/;
    const label = page.getByText("Fecha y hora", { exact: true }).and(page.locator(":visible"));
    const value = label.locator("xpath=following-sibling::*[1]");
    await expect(value).toHaveText(timestampPattern);
  });

  test("its detail link resolves instead of 404ing", async ({ page }) => {
    const code = (
      await page.getByRole("main").getByText(/PC-\d{6}-\d{6}/).first().innerText()
    ).trim();

    await page.getByRole("link", { name: "Ver detalle" }).click();
    await expect(page).toHaveURL(new RegExp(`/worker/operaciones/${code}$`));
    await expect(page.getByRole("heading", { name: `Operación ${code}` })).toBeVisible();
  });

  test("starting another operation returns to the catalog", async ({ page }) => {
    await page.getByRole("main").getByRole("link", { name: "Nueva operación" }).click();
    await expect(page).toHaveURL(/\/worker\/nueva-operacion$/);
  });
});

test.describe("shell", () => {
  for (const width of [1440, 1280]) {
    test(`stays within the shell at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(FLOW);
      await goToCliente(page);
      await goToRevision(page);

      const layout = await page.evaluate(() => {
        const main = document.querySelector("main")!;
        return {
          horizontalOverflow:
            document.documentElement.scrollWidth > document.documentElement.clientWidth,
          documentScrolls: document.documentElement.scrollHeight > window.innerHeight,
          headerTop: Math.round(document.querySelector("header")!.getBoundingClientRect().top),
          mainIsScroller: getComputedStyle(main).overflowY === "auto",
        };
      });

      expect(layout.horizontalOverflow).toBe(false);
      expect(layout.documentScrolls).toBe(false);
      expect(layout.headerTop).toBe(0);
      expect(layout.mainIsScroller).toBe(true);
    });
  }
});
