import { test, expect, type Page } from "@playwright/test";

/**
 * Worker Nueva operación — Giros — Cobrar giro
 * (/worker/nueva-operacion/giros/cobrar), plus the /giros operation selector
 * that now stands in front of both Giro operations.
 *
 * Código → Revisar giro → Confirmar entrega → Resultado. "Giro no encontrado"
 * is an error state of the código screen, not a screen of its own.
 *
 * `abrirJornada` and the payout mutate a client-side, in-memory module — a
 * hard navigation (`page.goto`) re-fetches a fresh server render and loses
 * that state, so every test that needs an open jornada or a just-created
 * operation reaches it by clicking links, never by `page.goto` afterwards.
 */

function onScreen(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true });
}

async function openJornada(page: Page, fondos: Record<string, string> = { CUP: "50000" }) {
  await page.goto("/worker/caja/fondeo-inicial");
  for (const [currency, value] of Object.entries(fondos)) {
    await page.getByLabel(`Fondo inicial en ${currency}`).fill(value);
  }
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Confirmar y abrir caja" }).click();
  await expect(page.getByRole("heading", { name: "Caja abierta correctamente" })).toBeVisible({
    timeout: 5000,
  });
  await page.getByRole("link", { name: "Ir a Caja" }).click();
}

async function goToSelector(page: Page) {
  await page.getByRole("link", { name: "Nueva operación" }).click();
  await page.getByRole("link", { name: /Giros/ }).click();
  await expect(page.getByRole("heading", { name: "Giros" })).toBeVisible();
}

async function goToCobrar(page: Page, fondos?: Record<string, string>) {
  await openJornada(page, fondos);
  await goToSelector(page);
  await page.getByRole("link", { name: /Cobrar giro/ }).click();
  await expect(page.getByRole("heading", { name: "Cobrar giro" })).toBeVisible();
}

async function search(page: Page, code: string) {
  await page.getByLabel("Código del giro").fill(code);
  await page.getByRole("button", { name: "Buscar giro" }).click();
}

async function reviewGiro(page: Page, code: string) {
  await search(page, code);
  await expect(page.getByRole("heading", { name: "Revisar giro" })).toBeVisible({ timeout: 5000 });
}

/** The Caja balances table shows the amount alone; the currency is its own cell. */
async function expectCupBalance(page: Page, amount: string) {
  const balances = page.getByRole("table").first();
  await expect(balances.locator("tbody tr").filter({ hasText: "CUP" })).toContainText(amount);
}

/** Operation-code prefix of the two seeded historical Giro records. */
const SEEDED_GIRO_CODE_PREFIX = "PC-260818-";

/** Exact, so the shell link never collides with the result screen's "Ir a Operaciones". */
async function goToOperaciones(page: Page) {
  await page.getByRole("link", { name: "Operaciones", exact: true }).click();
  await expect(page).toHaveURL(/\/worker\/operaciones$/);
}

/* -------------------------------------------------------------------------
 * The /giros operation selector
 * ---------------------------------------------------------------------- */

test.describe("Giros — operation selector", () => {
  test("offers both operations at the same level and launches neither", async ({ page }) => {
    await page.goto("/worker/nueva-operacion/giros");

    await expect(page.getByRole("heading", { name: "Giros", level: 1 })).toBeVisible();
    await expect(page.getByText("Selecciona la operación que deseas realizar.")).toBeVisible();

    const enviar = page.getByRole("link", { name: /Enviar giro/ });
    const cobrar = page.getByRole("link", { name: /Cobrar giro/ });
    await expect(enviar).toBeVisible();
    await expect(cobrar).toBeVisible();
    await expect(
      onScreen(page, "Registrar un nuevo giro para que otra persona pueda cobrarlo."),
    ).toBeVisible();
    await expect(
      onScreen(page, "Entregar un giro existente al beneficiario mediante su código."),
    ).toBeVisible();

    // Neither flow is auto-entered: no form and no code field on this screen.
    await expect(page.getByRole("heading", { name: "Remitente" })).toHaveCount(0);
    await expect(page.getByLabel("Código del giro")).toHaveCount(0);
  });

  test("does not expose balances, metrics or any list of existing giros", async ({ page }) => {
    await page.goto("/worker/nueva-operacion/giros");

    await expect(page.locator("table")).toHaveCount(0);
    for (const forbidden of [
      /Giros pendientes/i,
      /Giros recientes/i,
      /Últimos giros/i,
      /Buscar por/i,
      /Saldo/i,
    ]) {
      await expect(onScreen(page, forbidden)).toHaveCount(0);
    }
  });

  test("stays on /giros — it never redirects to Enviar giro", async ({ page }) => {
    await page.goto("/worker/nueva-operacion/giros");
    await expect(page).toHaveURL(/\/worker\/nueva-operacion\/giros$/);
  });

  test("each card leads to its own route", async ({ page }) => {
    await page.goto("/worker/nueva-operacion/giros");
    await page.getByRole("link", { name: /Cobrar giro/ }).click();
    await expect(page).toHaveURL(/\/worker\/nueva-operacion\/giros\/cobrar$/);

    await page.goto("/worker/nueva-operacion/giros");
    await page.getByRole("link", { name: /Enviar giro/ }).click();
    await expect(page).toHaveURL(/\/worker\/nueva-operacion\/giros\/enviar$/);
  });

  test("offers a way back to Nueva operación", async ({ page }) => {
    await page.goto("/worker/nueva-operacion/giros");
    await page.getByRole("link", { name: /Volver a Nueva operación/ }).click();
    await expect(page).toHaveURL(/\/worker\/nueva-operacion$/);
  });
});

/* -------------------------------------------------------------------------
 * Step 1 — Código
 * ---------------------------------------------------------------------- */

test.describe("Cobrar giro — jornada gate", () => {
  test("a closed Caja blocks the flow before any lookup is possible", async ({ page }) => {
    await page.goto("/worker/nueva-operacion/giros/cobrar");
    await expect(onScreen(page, "Caja cerrada")).toBeVisible();
    await expect(onScreen(page, "Debes abrir una jornada antes de cobrar un giro.")).toBeVisible();
    await expect(page.getByLabel("Código del giro")).toHaveCount(0);

    await page.getByRole("link", { name: "Ir a Caja" }).click();
    await expect(page).toHaveURL(/\/worker\/caja$/);
  });
});

test.describe("Cobrar giro — código", () => {
  test.beforeEach(async ({ page }) => {
    await goToCobrar(page);
  });

  test("renders the approved código screen", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Cobrar giro", level: 1 })).toBeVisible();
    await expect(
      onScreen(page, "Solicita al beneficiario el código del giro para continuar."),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Código del giro" })).toBeVisible();
    await expect(
      onScreen(page, "Introduce el código proporcionado por el beneficiario para localizar el giro."),
    ).toBeVisible();
    await expect(
      onScreen(page, "El código debe ser proporcionado directamente por el beneficiario."),
    ).toBeVisible();
    await expect(page.getByLabel("Código del giro")).toHaveAttribute(
      "placeholder",
      "Ej. TR-260901-000245",
    );
  });

  test("shows the Caja context strip", async ({ page }) => {
    await expect(onScreen(page, "Caja 03").first()).toBeVisible();
    await expect(onScreen(page, "Juan Pérez").first()).toBeVisible();
    await expect(onScreen(page, "Abierta")).toBeVisible();
    await expect(onScreen(page, "Monedas habilitadas")).toBeVisible();
  });

  test("lists the payout validations and the expected giro shape", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Validaciones del pago" })).toBeVisible();
    await expect(onScreen(page, "El código debe corresponder a un giro válido")).toBeVisible();
    await expect(onScreen(page, "La identidad del beneficiario debe coincidir")).toBeVisible();
    await expect(onScreen(page, "La caja debe tener la moneda habilitada")).toBeVisible();
    await expect(onScreen(page, "La caja debe contar con saldo suficiente")).toBeVisible();

    await expect(onScreen(page, "Estado esperado")).toBeVisible();
    await expect(onScreen(page, "Giro interprovincial")).toBeVisible();
    await expect(onScreen(page, "Recogida")).toBeVisible();
    await expect(onScreen(page, "Salida de efectivo")).toBeVisible();
  });

  test("Buscar giro stays disabled until a code is entered", async ({ page }) => {
    const button = page.getByRole("button", { name: "Buscar giro" });
    await expect(button).toBeDisabled();
    await page.getByLabel("Código del giro").fill("TR-260901-000245");
    await expect(button).toBeEnabled();
  });

  test("offers no search, no autocomplete, no suggestions and no list of giros", async ({ page }) => {
    // Code-only by construction: exactly one text input on the screen.
    await expect(page.locator("input:not([type=hidden])")).toHaveCount(1);
    await expect(page.getByLabel("Código del giro")).toHaveAttribute("autocomplete", "off");
    await expect(page.locator("datalist")).toHaveCount(0);
    await expect(page.locator("table")).toHaveCount(0);

    for (const forbidden of [
      /Buscar por nombre/i,
      /Buscar por documento/i,
      /Buscar por teléfono/i,
      /Búsquedas recientes/i,
      /Giros pendientes/i,
      /Giros recientes/i,
      /Provincia de destino/i,
    ]) {
      await expect(onScreen(page, forbidden)).toHaveCount(0);
    }
  });

  test("returns to the Giros selector, not to Enviar giro", async ({ page }) => {
    await page.getByRole("link", { name: /Volver a Giros/ }).click();
    await expect(page).toHaveURL(/\/worker\/nueva-operacion\/giros$/);
    await expect(onScreen(page, "Selecciona la operación que deseas realizar.")).toBeVisible();
  });
});

/* -------------------------------------------------------------------------
 * "Giro no encontrado" — an error state of the código screen
 * ---------------------------------------------------------------------- */

test.describe("Cobrar giro — Giro no encontrado", () => {
  test.beforeEach(async ({ page }) => {
    await goToCobrar(page);
  });

  test("an unknown code keeps the worker on the código screen with an inline error", async ({ page }) => {
    await search(page, "TR-260901-999999");

    await expect(onScreen(page, "Giro no encontrado")).toBeVisible({ timeout: 5000 });
    await expect(
      onScreen(page, "Verifica el código con el beneficiario e inténtalo nuevamente."),
    ).toBeVisible();
    // Still the same screen — not a separate workflow.
    await expect(page.getByRole("heading", { name: "Cobrar giro", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Código del giro")).toHaveValue("TR-260901-999999");
    await expect(page.getByLabel("Código del giro")).toHaveAttribute("aria-invalid", "true");
  });

  test("a reference is not a payout credential and is rejected identically", async ({ page }) => {
    // REF-GIRO-245 is the reference of a real, READY giro.
    await search(page, "REF-GIRO-245");

    await expect(onScreen(page, "Giro no encontrado")).toBeVisible({ timeout: 5000 });
    // Nothing about the underlying giro leaks — no beneficiary, no amount.
    await expect(onScreen(page, "María Pérez García")).toHaveCount(0);
    await expect(onScreen(page, /2\.500,00/)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Revisar giro" })).toHaveCount(0);
  });

  test("a code belonging to another kind of service is rejected identically", async ({ page }) => {
    await search(page, "TR-REMESA-01");

    await expect(onScreen(page, "Giro no encontrado")).toBeVisible({ timeout: 5000 });
    // The message must not reveal that a remittance exists behind this code.
    await expect(onScreen(page, /remesa/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Revisar giro" })).toHaveCount(0);
  });

  test("editing the code clears the error, and a valid code then works", async ({ page }) => {
    await search(page, "TR-260901-999999");
    await expect(onScreen(page, "Giro no encontrado")).toBeVisible({ timeout: 5000 });

    await page.getByLabel("Código del giro").fill("TR-260901-000245");
    await expect(onScreen(page, "Giro no encontrado")).toHaveCount(0);

    await page.getByRole("button", { name: "Buscar giro" }).click();
    await expect(page.getByRole("heading", { name: "Revisar giro" })).toBeVisible({ timeout: 5000 });
  });
});

/* -------------------------------------------------------------------------
 * Step 2 — Revisar giro
 * ---------------------------------------------------------------------- */

test.describe("Cobrar giro — Revisar giro", () => {
  test.beforeEach(async ({ page }) => {
    await goToCobrar(page);
    await reviewGiro(page, "TR-260901-000245");
  });

  test("shows the giro and the beneficiary exactly as approved", async ({ page }) => {
    await expect(
      onScreen(page, "Verifica los datos del giro y la identidad del beneficiario antes de continuar."),
    ).toBeVisible();

    await expect(page.getByRole("heading", { name: "Datos del giro" })).toBeVisible();
    await expect(onScreen(page, "TR-260901-000245")).toBeVisible();
    await expect(onScreen(page, "2.500,00 CUP")).toBeVisible();
    await expect(onScreen(page, "CUP · Peso cubano")).toBeVisible();
    await expect(onScreen(page, "Recogida")).toBeVisible();
    await expect(onScreen(page, "REF-GIRO-245")).toBeVisible();
    await expect(onScreen(page, "Lista para pago")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Beneficiario" })).toBeVisible();
    await expect(onScreen(page, "María Pérez García")).toBeVisible();
    await expect(onScreen(page, "85010112345")).toBeVisible();
    await expect(onScreen(page, "+53 5 678 1234")).toBeVisible();
    await expect(onScreen(page, "Calle 23 #456")).toBeVisible();
    await expect(onScreen(page, "La Habana / Plaza de la Revolución")).toBeVisible();
  });

  test("shows the currency flag next to the amount", async ({ page }) => {
    const amount = page.locator("dd", { hasText: "2.500,00 CUP" }).first();
    await expect(amount.locator("svg")).toHaveCount(1);
  });

  test("renders the identity-verification warning", async ({ page }) => {
    await expect(onScreen(page, "Verificación de identidad")).toBeVisible();
    await expect(
      onScreen(page, /Solicita el documento de identidad del beneficiario/),
    ).toBeVisible();
  });

  test("never shows the raw API enums as labels", async ({ page }) => {
    await expect(onScreen(page, "READY")).toHaveCount(0);
    await expect(onScreen(page, "pickup")).toHaveCount(0);
  });

  test("does not expose internal ids or provider metadata", async ({ page }) => {
    await expect(onScreen(page, /srv-transfer/)).toHaveCount(0);
    await expect(
      onScreen(page, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/),
    ).toHaveCount(0);
  });

  test("Volver returns to the código screen", async ({ page }) => {
    await page.getByRole("button", { name: /Volver a Cobrar giro/ }).click();
    await expect(page.getByRole("heading", { name: "Cobrar giro", level: 1 })).toBeVisible();
  });

  test("Cancelar leaves the flow for the Giros selector", async ({ page }) => {
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page).toHaveURL(/\/worker\/nueva-operacion\/giros$/);
  });

  test("Continuar a confirmar reaches the confirmation screen", async ({ page }) => {
    await page.getByRole("button", { name: "Continuar a confirmar" }).click();
    await expect(page.getByRole("heading", { name: "Confirmar entrega del giro" })).toBeVisible();
  });
});

test.describe("Cobrar giro — blocked payouts", () => {
  test("a giro that is not READY cannot continue", async ({ page }) => {
    await goToCobrar(page);
    await reviewGiro(page, "TR-TRANSITO-01");

    await expect(onScreen(page, "En tránsito")).toBeVisible();
    await expect(onScreen(page, "Este giro no está disponible para pago.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar a confirmar" })).toBeDisabled();
  });

  test("a COMPLETED giro can be looked up but never paid again", async ({ page }) => {
    await goToCobrar(page);
    await reviewGiro(page, "TR-COMPLETADO-01");

    // Exact: the code "TR-COMPLETADO-01" is itself a substring match.
    await expect(page.getByText("Completado", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar a confirmar" })).toBeDisabled();
  });

  test("a currency the Caja has not enabled blocks the payout", async ({ page }) => {
    await goToCobrar(page);
    await reviewGiro(page, "TR-MONEDA-NO");

    await expect(onScreen(page, "CHF no está habilitada en esta caja.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar a confirmar" })).toBeDisabled();
  });

  test("an insufficient balance blocks the payout and states what is available", async ({ page }) => {
    await goToCobrar(page);
    await reviewGiro(page, "TR-SIN-FONDOS");

    await expect(
      onScreen(page, "La caja no dispone de suficiente CUP para entregar este giro."),
    ).toBeVisible();
    await expect(onScreen(page, /Disponible: 50\.000,00 CUP/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar a confirmar" })).toBeDisabled();
  });

  test("no alternative currency, conversion or split payment is offered", async ({ page }) => {
    await goToCobrar(page);
    await reviewGiro(page, "TR-SIN-FONDOS");

    for (const forbidden of [
      /Pagar en otra moneda/i,
      /Convertir/i,
      /Tipo de cambio/i,
      /Pago parcial/i,
      /Dividir/i,
    ]) {
      await expect(onScreen(page, forbidden)).toHaveCount(0);
    }
  });
});

/* -------------------------------------------------------------------------
 * Step 3 — Confirmar entrega del giro
 * ---------------------------------------------------------------------- */

test.describe("Cobrar giro — Confirmar entrega", () => {
  test.beforeEach(async ({ page }) => {
    await goToCobrar(page);
    await reviewGiro(page, "TR-260901-000245");
    await page.getByRole("button", { name: "Continuar a confirmar" }).click();
    await expect(page.getByRole("heading", { name: "Confirmar entrega del giro" })).toBeVisible();
  });

  test("summarises the delivery and warns that the action is irreversible", async ({ page }) => {
    await expect(onScreen(page, "Confirma la entrega del efectivo al beneficiario.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Resumen de entrega" })).toBeVisible();

    await expect(onScreen(page, "TR-260901-000245")).toBeVisible();
    await expect(onScreen(page, "María Pérez García")).toBeVisible();
    await expect(onScreen(page, "85010112345")).toBeVisible();
    await expect(onScreen(page, "2.500,00 CUP")).toBeVisible();
    await expect(onScreen(page, "CUP · Peso cubano")).toBeVisible();
    await expect(onScreen(page, "Caja 03").first()).toBeVisible();

    await expect(onScreen(page, "Acción irreversible")).toBeVisible();
    await expect(onScreen(page, /El giro quedará marcado como completado\./)).toBeVisible();
  });

  test("Volver returns to Revisar giro with the giro intact", async ({ page }) => {
    await page.getByRole("button", { name: /Volver a Revisar giro/ }).click();
    await expect(page.getByRole("heading", { name: "Revisar giro" })).toBeVisible();
    await expect(onScreen(page, "TR-260901-000245")).toBeVisible();
  });

  test("Cancelar leaves the flow without paying", async ({ page }) => {
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page).toHaveURL(/\/worker\/nueva-operacion\/giros$/);

    // No Caja movement was recorded — the balance is untouched.
    await page.getByRole("link", { name: "Caja" }).click();
    await expectCupBalance(page, "50.000,00");
  });
});

test.describe("Cobrar giro — external failures", () => {
  async function confirmPayout(page: Page, code: string) {
    await goToCobrar(page);
    await reviewGiro(page, code);
    await page.getByRole("button", { name: "Continuar a confirmar" }).click();
    await page.getByRole("button", { name: "Confirmar entrega" }).click();
  }

  test("a 409 keeps the worker on the confirmation screen with no Caja impact", async ({ page }) => {
    await confirmPayout(page, "TR-CONFLICTO-09");

    await expect(onScreen(page, "El giro ya no está disponible para pago.")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("heading", { name: "Giro entregado correctamente" })).toHaveCount(0);

    await page.getByRole("link", { name: "Caja" }).click();
    await expectCupBalance(page, "50.000,00");
    // Seeded history contributes its own Giro movements (all carrying seeded
    // operation codes), so "no Caja impact" is expressed as: every Giro row
    // present belongs to that seeded history, none to this session.
    await expect(
      page
        .getByRole("table")
        .nth(1)
        .locator("tbody tr")
        .filter({ hasText: "Giros" })
        .filter({ hasNotText: SEEDED_GIRO_CODE_PREFIX }),
    ).toHaveCount(0);
  });

  test("a failed completion shows an error and records nothing", async ({ page }) => {
    // History already carries seeded Giro operations, so "nothing recorded"
    // means the count did not grow — not that no giro exists at all. Read the
    // baseline first; `confirmPayout` starts with a hard navigation of its
    // own, which resets the client-side module state anyway.
    await page.goto("/worker/operaciones");
    const giroRows = page.locator("tbody tr").filter({ hasText: "Giros" });
    const before = await giroRows.count();
    expect(before).toBeGreaterThan(0);

    await confirmPayout(page, "TR-FALLA-EXT");

    await expect(
      onScreen(page, "No se pudo completar el giro. Intenta nuevamente o solicita asistencia."),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Giro entregado correctamente" })).toHaveCount(0);

    await goToOperaciones(page);
    await expect(giroRows).toHaveCount(before);
  });
});

/* -------------------------------------------------------------------------
 * Step 4 — Resultado, and what the payout left behind
 * ---------------------------------------------------------------------- */

test.describe("Cobrar giro — payout completed", () => {
  test.beforeEach(async ({ page }) => {
    await goToCobrar(page);
    await reviewGiro(page, "TR-260901-000245");
    await page.getByRole("button", { name: "Continuar a confirmar" }).click();
    await page.getByRole("button", { name: "Confirmar entrega" }).click();
    await expect(page.getByRole("heading", { name: "Giro entregado correctamente" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows the approved success screen", async ({ page }) => {
    await expect(onScreen(page, "El giro ha sido completado y entregado al beneficiario.")).toBeVisible();
    await expect(onScreen(page, "TR-260901-000245")).toBeVisible();
    await expect(onScreen(page, "María Pérez García")).toBeVisible();
    await expect(onScreen(page, "85010112345")).toBeVisible();
    await expect(onScreen(page, "2.500,00 CUP")).toBeVisible();
    await expect(onScreen(page, "CUP · Peso cubano")).toBeVisible();
    // Scoped to the receipt: the shell header names the same Caja and worker.
    // Scoped to the screen: the shell header names the same Caja and worker,
    // and the print-only receipt repeats both.
    const summary = page.getByRole("main");
    await expect(summary.getByText("Caja 03").filter({ visible: true })).toBeVisible();
    await expect(summary.getByText("Juan Pérez").filter({ visible: true })).toBeVisible();
    await expect(
      onScreen(page, "El giro fue entregado correctamente y registrado en PuntoCash."),
    ).toBeVisible();
  });

  test("offers printing and a way to Operaciones, and no UUIDs", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Imprimir comprobante/ })).toBeVisible();
    await expect(onScreen(page, /srv-transfer/)).toHaveCount(0);

    await page.getByRole("link", { name: /Ir a Operaciones/ }).click();
    await expect(page).toHaveURL(/\/worker\/operaciones$/);
  });

  test("records exactly one commercial Salida linked to the payout operation", async ({ page }) => {
    // Seeded history already carries Giro movements, so the assertion is
    // anchored to THIS payout's operation code: the newest Giro operation.
    await goToOperaciones(page);
    const code = (
      await page
        .locator("tbody tr")
        .filter({ hasText: "Giros" })
        .first()
        .locator("td")
        .first()
        .innerText()
    ).trim();
    expect(code).toMatch(/^PC-\d{6}-\d{6}$/);

    await page.getByRole("link", { name: "Caja" }).click();
    const rows = page.getByRole("table").nth(1).locator("tbody tr").filter({ hasText: code });
    await expect(rows).toHaveCount(1);

    const row = rows.first();
    await expect(row).toContainText("Giros");
    await expect(row).toContainText("Salida");
    await expect(row).toContainText("−2.500,00");
    // Commercial movements route through their Operation Detail — they carry
    // an operation code and no "Ver detalle" action of their own.
    await expect(row.getByRole("link", { name: "Ver detalle" })).toHaveCount(0);

    // saldoAntes → saldoDespués = saldoAntes − importe.
    await expectCupBalance(page, "47.500,00");
  });

  test("registers one payout operation whose client is the beneficiary", async ({ page }) => {
    await goToOperaciones(page);

    const row = page
      .locator("tbody tr")
      .filter({ hasText: "Giros" })
      .first();
    await expect(row).toContainText("María Pérez García");
    await expect(row).toContainText("Completada");
    await expect(row).toContainText("2.500,00");
  });

  test("the payout Operation Detail shows the giro and the cash impact", async ({ page }) => {
    await goToOperaciones(page);
    await page
      .locator("tbody tr")
      .filter({ hasText: "Giros" })
      .first()
      .getByRole("link", { name: "Ver detalle" })
      .click();

    await expect(page.getByRole("heading", { name: "Detalle de operación" })).toBeVisible();
    await expect(onScreen(page, "Giro cobrado")).toBeVisible();
    await expect(onScreen(page, "María Pérez García").first()).toBeVisible();
    await expect(onScreen(page, "2.500,00 CUP").first()).toBeVisible();
    // Raw discriminators never surface as labels.
    await expect(onScreen(page, "payout")).toHaveCount(0);
    await expect(onScreen(page, "COMPLETED")).toHaveCount(0);
  });
});

/* -------------------------------------------------------------------------
 * Enviar → Cobrar, end to end
 * ---------------------------------------------------------------------- */

test.describe("Enviar giro then Cobrar giro", () => {
  test("a giro registered in this session is payable by its own code", async ({ page }) => {
    await openJornada(page, { CUP: "50000" });
    await goToSelector(page);
    await page.getByRole("link", { name: /Enviar giro/ }).click();

    await page.locator("#giro-remitente-numero-documento").fill("90010112345");
    await page.locator("#giro-remitente-nombre").fill("Carlos");
    await page.locator("#giro-remitente-primer-apellido").fill("Pérez");
    await page.locator("#giro-remitente-segundo-apellido").fill("Rodríguez");
    await page.locator("#giro-remitente-fecha-nacimiento").fill("1985-01-01");
    await page.locator("#giro-remitente-telefono").fill("+53 5 123 4567");

    await page.locator("#giro-beneficiario-nombre").fill("Ana Beltrán Soto");
    await page.locator("#giro-beneficiario-telefono").fill("+53 5 111 2222");
    await page.locator("#giro-beneficiario-direccion").fill("Calle 10 #20");
    await page.locator("#giro-beneficiario-documento").fill("90010112345");
    await page.getByLabel("Provincia").click();
    await page.getByRole("option", { name: "La Habana" }).click();
    await page.getByLabel("Municipio").click();
    await page.getByRole("option", { name: "Plaza de la Revolución" }).click();

    await page.getByRole("button", { name: /Moneda: / }).click();
    await page.getByRole("option", { name: /CUP/ }).click();
    await page.locator("#giro-importe").fill("1000");

    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Continuar a confirmar" }).click();
    await page.getByRole("button", { name: "Confirmar envío" }).click();
    await expect(page.getByRole("heading", { name: "Giro registrado correctamente" })).toBeVisible({
      timeout: 10_000,
    });

    const giroCode = (
      await page.locator("dd").filter({ hasText: /^TR-/ }).first().innerText()
    ).trim();

    await page.getByRole("link", { name: "Nueva operación" }).click();
    await page.getByRole("link", { name: /Giros/ }).click();
    await page.getByRole("link", { name: /Cobrar giro/ }).click();
    await reviewGiro(page, giroCode);

    await expect(onScreen(page, "Ana Beltrán Soto")).toBeVisible();
    await expect(onScreen(page, "1.000,00 CUP")).toBeVisible();
    await expect(onScreen(page, "Lista para pago")).toBeVisible();
  });
});
