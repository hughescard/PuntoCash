import { test, expect, type Page } from "@playwright/test";

/**
 * Worker Operaciones — specialized historical detail for
 * "Giros" (/worker/operaciones/[codigo]).
 *
 * Covers both local actions: a giro SENT at this branch (`send`) and a giro
 * PAID OUT at this branch (`payout`). Everything on these screens comes from
 * the stored operation snapshot — the detail never calls the transfer
 * provider, so a giro whose external status changed later must still read as
 * it did when the operation was committed.
 *
 * The operations these tests read are created in-session by the Giros flows,
 * which mutate a client-side module — so every navigation after the first one
 * is a link click, never `page.goto`.
 */

function onScreen(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true });
}

async function openJornada(page: Page) {
  await page.goto("/worker/caja/fondeo-inicial");
  await page.getByLabel("Fondo inicial en CUP").fill("50000");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Confirmar y abrir caja" }).click();
  await expect(page.getByRole("heading", { name: "Caja abierta correctamente" })).toBeVisible({
    timeout: 5000,
  });
  await page.getByRole("link", { name: "Ir a Caja" }).click();
}

async function goToGiros(page: Page) {
  await page.getByRole("link", { name: "Nueva operación" }).click();
  await page.getByRole("link", { name: /Giros/ }).click();
}

/** Registers a giro of 2.500,00 CUP and returns to Operaciones. Returns its Giro code. */
async function sendGiro(page: Page): Promise<string> {
  await goToGiros(page);
  await page.getByRole("link", { name: /Enviar giro/ }).click();
  await expect(page.getByRole("heading", { name: "Giros" })).toBeVisible();

  await page.locator("#giro-remitente-numero-documento").fill("85010112345");
  await page.locator("#giro-remitente-nombre").fill("Carlos");
  await page.locator("#giro-remitente-primer-apellido").fill("Pérez");
  await page.locator("#giro-remitente-segundo-apellido").fill("Rodríguez");
  await page.locator("#giro-remitente-fecha-nacimiento").fill("1985-01-01");
  await page.locator("#giro-remitente-telefono").fill("+53 5 123 4567");

  await page.locator("#giro-beneficiario-nombre").fill("María Pérez García");
  await page.locator("#giro-beneficiario-telefono").fill("+53 5 678 1234");
  await page.locator("#giro-beneficiario-direccion").fill("Calle 23 #456");
  await page.locator("#giro-beneficiario-documento").fill("85010112345");
  await page.getByLabel("Provincia").click();
  await page.getByRole("option", { name: "La Habana" }).click();
  await page.getByLabel("Municipio").click();
  await page.getByRole("option", { name: "Plaza de la Revolución" }).click();

  await page.getByRole("button", { name: /Moneda: / }).click();
  await page.getByRole("option", { name: /CUP/ }).click();
  await page.locator("#giro-importe").fill("2500");

  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar a confirmar" }).click();
  await page.getByRole("button", { name: "Confirmar envío" }).click();
  await expect(page.getByRole("heading", { name: "Giro registrado correctamente" })).toBeVisible({
    timeout: 10_000,
  });

  const code = (await page.locator("dd").filter({ hasText: /^TR-/ }).first().innerText()).trim();
  await page.getByRole("link", { name: /Ir a Operaciones/ }).click();
  return code;
}

/** Pays out the giro with the given code and returns to Operaciones. */
async function payoutGiro(page: Page, code: string) {
  await goToGiros(page);
  await page.getByRole("link", { name: /Cobrar giro/ }).click();
  await page.getByLabel("Código del giro").fill(code);
  await page.getByRole("button", { name: "Buscar giro" }).click();
  await expect(page.getByRole("heading", { name: "Revisar giro" })).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: "Continuar a confirmar" }).click();
  await page.getByRole("button", { name: "Confirmar entrega" }).click();
  await expect(page.getByRole("heading", { name: "Giro entregado correctamente" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("link", { name: /Ir a Operaciones/ }).click();
}

/** Opens the detail of the newest Giro operation in the list. */
async function openNewestGiroDetail(page: Page) {
  await page
    .locator("tbody tr")
    .filter({ hasText: "Giros" })
    .first()
    .getByRole("link", { name: "Ver detalle" })
    .click();
  await expect(page.getByRole("heading", { name: "Detalle de operación" })).toBeVisible({
    timeout: 10_000,
  });
}

/* -------------------------------------------------------------------------
 * SEND — "Giro enviado"
 * ---------------------------------------------------------------------- */

test.describe("Operation Detail — giro enviado", () => {
  test.beforeEach(async ({ page }) => {
    await openJornada(page);
    await sendGiro(page);
    await openNewestGiroDetail(page);
  });

  test("renders the specialized send detail, not the generic fallback", async ({ page }) => {
    await expect(onScreen(page, "Giro enviado")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Remitente" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Giro", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Beneficiario" })).toBeVisible();
    await expect(onScreen(page, "Datos del giro")).toBeVisible();

    // The generic service/cash cards must no longer appear for a giro.
    await expect(onScreen(page, "Detalle del servicio")).toHaveCount(0);
    await expect(onScreen(page, "Estado de caja")).toHaveCount(0);
  });

  test("shows the sender as recorded, including the historical birth date", async ({ page }) => {
    await expect(onScreen(page, "Carlos Pérez Rodríguez")).toBeVisible();
    await expect(onScreen(page, "CI · 85010112345")).toBeVisible();
    await expect(onScreen(page, "01/01/1985")).toBeVisible();
    await expect(onScreen(page, "+53 5 123 4567")).toBeVisible();
    await expect(onScreen(page, "Cubana")).toBeVisible();
  });

  test("identifies the operation as an Envío with its common provenance", async ({ page }) => {
    await expect(onScreen(page, "Giros").first()).toBeVisible();
    await expect(onScreen(page, "Envío")).toBeVisible();
    await expect(onScreen(page, "Juan Pérez").first()).toBeVisible();
    await expect(onScreen(page, "Caja 03").first()).toBeVisible();
    await expect(onScreen(page, /PC-\d{6}-\d{6}/).first()).toBeVisible();
  });

  test("shows the giro and its beneficiary with localized labels", async ({ page }) => {
    await expect(onScreen(page, /^TR-/).first()).toBeVisible();
    await expect(onScreen(page, "Recogida")).toBeVisible();
    await expect(onScreen(page, "Importe enviado")).toBeVisible();
    await expect(onScreen(page, "2.500,00 CUP").first()).toBeVisible();
    await expect(onScreen(page, "CUP · Peso cubano").first()).toBeVisible();
    await expect(onScreen(page, "Lista para pago")).toBeVisible();

    await expect(onScreen(page, "María Pérez García")).toBeVisible();
    await expect(onScreen(page, "85010112345").first()).toBeVisible();
    await expect(onScreen(page, "Calle 23 #456")).toBeVisible();
    await expect(onScreen(page, "La Habana · Plaza de la Revolución")).toBeVisible();
  });

  test("shows the historical cash entry, not a live balance", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Movimiento de efectivo" })).toBeVisible();
    await expect(onScreen(page, "Saldo anterior")).toBeVisible();
    await expect(onScreen(page, "50.000,00 CUP")).toBeVisible();
    await expect(onScreen(page, "Entrada — Giro")).toBeVisible();
    await expect(onScreen(page, "+2.500,00 CUP")).toBeVisible();
    await expect(onScreen(page, "Saldo resultante")).toBeVisible();
    await expect(onScreen(page, "52.500,00 CUP")).toBeVisible();
    await expect(onScreen(page, "Entrada").last()).toBeVisible();
  });

  test("shows no raw provider enums anywhere", async ({ page }) => {
    for (const raw of ["READY", "COMPLETED", "IN_TRANSIT", "pickup", "transfer"]) {
      await expect(onScreen(page, raw)).toHaveCount(0);
    }
    // The stored discriminator is never rendered either.
    await expect(onScreen(page, "payout")).toHaveCount(0);
    await expect(onScreen(page, "send")).toHaveCount(0);
  });

  test("offers no mutation action — it is a read-only historical record", async ({ page }) => {
    for (const action of [/Completar/i, /Cancelar/i, /Editar/i, /Reintentar/i, /Anular/i]) {
      await expect(page.getByRole("button", { name: action })).toHaveCount(0);
    }
  });

  test("keeps the existing comprobante print pattern", async ({ page }) => {
    // Exact: "Imprimir comprobante" is a substring match on the button.
    await expect(page.getByText("Comprobante", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(
      onScreen(page, "Puedes imprimir el detalle registrado de esta operación."),
    ).toBeVisible();

    let printed = false;
    await page.exposeFunction("__printed", () => {
      printed = true;
    });
    await page.evaluate(() => {
      window.print = () => {
        (window as unknown as { __printed: () => void }).__printed();
      };
    });
    await page.getByRole("button", { name: "Imprimir comprobante" }).click();
    expect(printed).toBe(true);

    // The print-only receipt is in the DOM but never on screen.
    const receipt = page.locator("section.print\\:block");
    await expect(receipt).toHaveCount(1);
    await expect(receipt).toBeHidden();
  });

  test("keeps the confidentiality note and the way back", async ({ page }) => {
    await expect(
      onScreen(page, /La información de esta operación está protegida/),
    ).toBeVisible();
    await page.getByRole("link", { name: /Volver a Operaciones/ }).click();
    await expect(page).toHaveURL(/\/worker\/operaciones$/);
  });
});

/* -------------------------------------------------------------------------
 * PAYOUT — "Giro cobrado"
 * ---------------------------------------------------------------------- */

test.describe("Operation Detail — giro cobrado", () => {
  test.beforeEach(async ({ page }) => {
    await openJornada(page);
    await goToGiros(page);
    await page.getByRole("link", { name: /Cobrar giro/ }).click();
    await page.getByLabel("Código del giro").fill("TR-260901-000245");
    await page.getByRole("button", { name: "Buscar giro" }).click();
    await expect(page.getByRole("heading", { name: "Revisar giro" })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Continuar a confirmar" }).click();
    await page.getByRole("button", { name: "Confirmar entrega" }).click();
    await expect(page.getByRole("heading", { name: "Giro entregado correctamente" })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("link", { name: /Ir a Operaciones/ }).click();
    await openNewestGiroDetail(page);
  });

  test("renders the specialized payout detail, not the generic fallback", async ({ page }) => {
    await expect(onScreen(page, "Giro cobrado")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Beneficiario" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Giro", exact: true })).toBeVisible();
    await expect(onScreen(page, "Resumen")).toBeVisible();

    await expect(onScreen(page, "Detalle del servicio")).toHaveCount(0);
    await expect(onScreen(page, "Estado de caja")).toHaveCount(0);
    // The counterparty of a payout is the beneficiary, never a "Remitente".
    await expect(page.getByRole("heading", { name: "Remitente" })).toHaveCount(0);
  });

  test("shows the beneficiary as the client of the operation", async ({ page }) => {
    await expect(onScreen(page, "María Pérez García").first()).toBeVisible();
    await expect(onScreen(page, "85010112345").first()).toBeVisible();
    await expect(onScreen(page, "+53 5 678 1234")).toBeVisible();
    await expect(onScreen(page, "La Habana · Plaza de la Revolución")).toBeVisible();
  });

  test("identifies the operation as a Cobro", async ({ page }) => {
    await expect(onScreen(page, "Cobro").first()).toBeVisible();
    await expect(onScreen(page, "Giros").first()).toBeVisible();
  });

  test("shows the giro with localized delivery method and status", async ({ page }) => {
    await expect(onScreen(page, "TR-260901-000245")).toBeVisible();
    await expect(onScreen(page, "REF-GIRO-245")).toBeVisible();
    await expect(onScreen(page, "Recogida")).toBeVisible();
    await expect(onScreen(page, "Importe entregado")).toBeVisible();
    await expect(onScreen(page, "2.500,00 CUP").first()).toBeVisible();
    await expect(onScreen(page, "Completado")).toBeVisible();
  });

  test("shows the historical cash exit", async ({ page }) => {
    await expect(onScreen(page, "Saldo anterior")).toBeVisible();
    await expect(onScreen(page, "50.000,00 CUP")).toBeVisible();
    await expect(onScreen(page, "Salida — Giro")).toBeVisible();
    await expect(onScreen(page, "−2.500,00 CUP")).toBeVisible();
    await expect(onScreen(page, "Saldo resultante")).toBeVisible();
    await expect(onScreen(page, "47.500,00 CUP")).toBeVisible();
    await expect(onScreen(page, "Salida").last()).toBeVisible();
  });

  test("shows no raw provider enums anywhere", async ({ page }) => {
    for (const raw of ["READY", "COMPLETED", "pickup", "payout"]) {
      await expect(onScreen(page, raw)).toHaveCount(0);
    }
  });
});

/* -------------------------------------------------------------------------
 * Historical, not live
 * ---------------------------------------------------------------------- */

test.describe("Operation Detail — giro history is frozen", () => {
  test("the send detail keeps its stored status after the giro is paid out elsewhere", async ({
    page,
  }) => {
    await openJornada(page);
    const code = await sendGiro(page);

    await openNewestGiroDetail(page);
    await expect(onScreen(page, "Lista para pago")).toBeVisible();
    await page.getByRole("link", { name: /Volver a Operaciones/ }).click();

    // Paying the same giro flips the external record to COMPLETED…
    await payoutGiro(page, code);
    await openNewestGiroDetail(page);
    await expect(onScreen(page, "Giro cobrado")).toBeVisible();
    await expect(onScreen(page, "Completado")).toBeVisible();
    await page.getByRole("link", { name: /Volver a Operaciones/ }).click();

    // …but the SEND operation still reads exactly as it was committed: the
    // detail renders its snapshot, it does not re-read the provider.
    await page
      .locator("tbody tr")
      .filter({ hasText: "Giros" })
      .nth(1)
      .getByRole("link", { name: "Ver detalle" })
      .click();
    await expect(onScreen(page, "Giro enviado")).toBeVisible();
    await expect(onScreen(page, "Lista para pago")).toBeVisible();
    await expect(onScreen(page, "Completado")).toHaveCount(0);
  });

  test("opening a giro detail performs no API request", async ({ page }) => {
    await openJornada(page);
    await sendGiro(page);

    const apiCalls: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (/\/api\/|\/services\/|transfers/.test(url)) apiCalls.push(url);
    });

    await openNewestGiroDetail(page);
    await expect(onScreen(page, "Giro enviado")).toBeVisible();
    expect(apiCalls).toEqual([]);
  });
});

/* -------------------------------------------------------------------------
 * Layout
 * ---------------------------------------------------------------------- */

for (const width of [1440, 1280] as const) {
  test.describe(`Operation Detail — giro layout at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("both giro details fit without page-level horizontal scroll", async ({ page }) => {
      await openJornada(page);
      await sendGiro(page);
      await openNewestGiroDetail(page);

      const overflows = async () =>
        page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
      expect(await overflows()).toBe(false);

      // `main` stays the only vertical scroller.
      expect(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= document.documentElement.clientHeight + 1,
        ),
      ).toBe(true);

      await page.getByRole("link", { name: /Volver a Operaciones/ }).click();
      await payoutGiro(page, "TR-260901-000245");
      await openNewestGiroDetail(page);
      expect(await overflows()).toBe(false);
    });
  });
}
