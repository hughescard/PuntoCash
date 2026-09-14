import { test, expect, type Page } from "@playwright/test";

/**
 * Worker Nueva operación — Giros — Enviar giro
 * (/worker/nueva-operacion/giros/enviar, also reachable at the bare
 * /worker/nueva-operacion/giros the service card links to).
 *
 * Registrar giro → Revisar giro → Confirmar envío → Resultado. Cobrar giro
 * is the sibling operation and has its own spec; nothing here offers a
 * transfer list or a delivery-method selector.
 *
 * `abrirJornada`/`confirmGiro` mutate a client-side, in-memory module — a
 * hard navigation (`page.goto`) re-fetches a fresh server render and loses
 * that state, so every test that needs an open jornada or a just-created
 * operation reaches it by clicking links, never by `page.goto` after the
 * first one.
 */

function onScreen(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true });
}

async function openJornada(page: Page, fondos: Record<string, string> = { EUR: "1200" }) {
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

async function goToGiros(page: Page) {
  await page.getByRole("link", { name: "Nueva operación" }).click();
  await page.getByRole("link", { name: /Giros/ }).click();
  // The service slug is an operation selector now — Enviar giro is one of
  // two equal-level operations behind it, never auto-launched.
  await page.getByRole("link", { name: /Enviar giro/ }).click();
  await expect(page.getByRole("heading", { name: "Giros" })).toBeVisible();
}

async function openJornadaAndGoToGiros(page: Page, fondos?: Record<string, string>) {
  await openJornada(page, fondos);
  await goToGiros(page);
}

interface FillOverrides {
  currency?: string;
  amount?: string;
  beneficiaryName?: string;
  province?: string;
  municipality?: string;
  secondSurname?: string;
  email?: string;
}

/** Fills every required field with a valid default, overridable per test. */
async function fillValidForm(page: Page, overrides: FillOverrides = {}) {
  await page.locator("#giro-remitente-numero-documento").fill("90010112345");
  await page.locator("#giro-remitente-nombre").fill("Carlos");
  await page.locator("#giro-remitente-primer-apellido").fill("Pérez");
  await page.locator("#giro-remitente-segundo-apellido").fill(overrides.secondSurname ?? "Rodríguez");
  await page.locator("#giro-remitente-fecha-nacimiento").fill("1985-01-01");
  await page.locator("#giro-remitente-telefono").fill("+53 5 123 4567");

  await page.locator("#giro-beneficiario-nombre").fill(overrides.beneficiaryName ?? "María López García");
  await page.locator("#giro-beneficiario-correo").fill(overrides.email ?? "maria.lopez@example.com");
  await page.locator("#giro-beneficiario-telefono").fill("+53 5 678 1234");
  await page.locator("#giro-beneficiario-direccion").fill("Calle 23 #456");
  await page.locator("#giro-beneficiario-documento").fill("85010112345");

  await page.getByLabel("Provincia").click();
  await page.getByRole("option", { name: overrides.province ?? "La Habana" }).click();
  await page.getByLabel("Municipio").click();
  await page.getByRole("option", { name: overrides.municipality ?? "Plaza de la Revolución" }).click();

  await page.getByRole("button", { name: /^Moneda:/ }).click();
  await page.getByRole("option", { name: new RegExp(`^${overrides.currency ?? "EUR"}`) }).click();
  await page.getByLabel("Importe a entregar").fill(overrides.amount ?? "500");
}

async function completeGiro(page: Page, overrides: FillOverrides = {}) {
  await fillValidForm(page, overrides);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Revisar giro" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar a confirmar" }).click();
  await expect(page.getByRole("heading", { name: "Confirmar envío de giro" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar envío" }).click();
  await expect(page.getByRole("heading", { name: "Giro registrado correctamente" })).toBeVisible({
    timeout: 5000,
  });
}

test.describe("Giros — service and routing", () => {
  test("is enabled in Nueva operación and its card leads to the operation selector", async ({ page }) => {
    await page.goto("/worker/nueva-operacion");
    const card = page.getByRole("link", { name: /Giros/ });
    await expect(card.getByText("Disponible")).toBeVisible();
    await card.click();

    // The slug no longer launches Enviar giro: it offers both operations.
    await expect(page).toHaveURL(/\/worker\/nueva-operacion\/giros$/);
    await expect(page.getByText("Selecciona la operación que deseas realizar.")).toBeVisible();

    await page.getByRole("link", { name: /Enviar giro/ }).click();
    await expect(page).toHaveURL(/\/worker\/nueva-operacion\/giros\/enviar$/);
    // No jornada is open in this fresh test, so Enviar giro's own blocked
    // state renders — still proof the card lands inside Enviar giro.
    await expect(page.getByText("Debes abrir una jornada antes de registrar un giro.")).toBeVisible();
  });

  test("direct route without an open jornada shows the blocked state", async ({ page }) => {
    await page.goto("/worker/nueva-operacion/giros/enviar");
    await expect(page.getByText("Caja cerrada")).toBeVisible();
    await expect(page.getByText("Debes abrir una jornada antes de registrar un giro.")).toBeVisible();
    await page.getByRole("link", { name: "Ir a Caja" }).click();
    await expect(page).toHaveURL(/\/worker\/caja$/);
  });

  test("renders once a jornada is open", async ({ page }) => {
    await openJornadaAndGoToGiros(page);
    await expect(page.getByText("Registra un giro para que el beneficiario lo cobre en otra provincia.")).toBeVisible();
  });
});

test.describe("Registrar giro — form", () => {
  test.beforeEach(async ({ page }) => {
    await openJornadaAndGoToGiros(page);
  });

  test("renders the Remitente, Beneficiario and Datos del giro sections", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Remitente" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Beneficiario" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Datos del giro" })).toBeVisible();
  });

  test("shows the context strip with real jornada state, not a hardcoded currency count", async ({ page }) => {
    await expect(page.getByText("Caja 03").first()).toBeVisible();
    await expect(page.getByText("Juan Pérez").first()).toBeVisible();
    await expect(page.getByText("Abierta")).toBeVisible();
    await expect(page.getByText("Monedas habilitadas")).toBeVisible();
    await expect(page.getByText("4", { exact: true }).first()).toBeVisible();
  });

  test("Segundo apellido is required", async ({ page }) => {
    await fillValidForm(page, { secondSurname: "" });
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  test("beneficiary email is optional, but must be a valid email when provided", async ({ page }) => {
    await fillValidForm(page, { email: "not-an-email" });
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await page.locator("#giro-beneficiario-correo").fill("maria.lopez@example.com");
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  test("beneficiary email can be left blank", async ({ page }) => {
    await fillValidForm(page, { email: "" });
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  test("Provincia and Municipio come from the fixed catalog, and changing Province clears an incompatible Municipality", async ({
    page,
  }) => {
    await page.getByLabel("Provincia").click();
    await page.getByRole("option", { name: "La Habana" }).click();
    await page.getByLabel("Municipio").click();
    await page.getByRole("option", { name: "Plaza de la Revolución" }).click();

    await page.getByLabel("Provincia").click();
    await page.getByRole("option", { name: "Matanzas" }).click();

    // The now-incompatible municipality selection was cleared: the trigger
    // no longer reads "Plaza de la Revolución", and its own options list is
    // Matanzas', not La Habana's.
    await expect(page.getByLabel("Municipio")).not.toHaveText("Plaza de la Revolución");
    await page.getByLabel("Municipio").click();
    await expect(page.getByRole("option", { name: "Plaza de la Revolución" })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Cárdenas" })).toBeVisible();
  });

  test("Municipio stays disabled until a Provincia is chosen", async ({ page }) => {
    await expect(page.getByLabel("Municipio")).toBeDisabled();
  });

  test("Método de entrega shows Recogida as a read-only value, not an editable control", async ({
    page,
  }) => {
    // "Recogida" legitimately appears twice at once: the read-only value in
    // the form and its live echo in the Resumen del giro panel (§27).
    await expect(page.getByText("Recogida").first()).toBeVisible();
    await expect(page.getByRole("combobox", { name: /Método de entrega/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Método de entrega/i })).toHaveCount(0);
  });

  test("Moneda only offers currencies currently enabled in Caja", async ({ page }) => {
    await page.getByRole("button", { name: /^Moneda:/ }).click();
    for (const currency of ["EUR"]) {
      await expect(page.getByRole("option", { name: new RegExp(`^${currency}`) })).toBeVisible();
    }
    // CAD is a real catalog currency but was never enabled for this Caja.
    await expect(page.getByRole("option", { name: /^CAD/ })).toHaveCount(0);
  });

  test("a currency at a 0,00 Caja balance is still selectable (this operation is an Entrada)", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /^Moneda:/ }).click();
    // GBP is enabled for Caja 03 by default at 0,00 — still offered.
    await expect(page.getByRole("option", { name: /^GBP/ })).toBeVisible();
  });

  test("Importe a entregar is required and validated as money", async ({ page }) => {
    await fillValidForm(page, { amount: "" });
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  test("Resumen del giro updates live with beneficiary, province/municipality, currency, amount and Entrada de efectivo", async ({
    page,
  }) => {
    await fillValidForm(page);
    const summary = page.locator("dl").filter({ hasText: "Impacto en caja" });
    await expect(summary.getByText("María López García")).toBeVisible();
    await expect(summary.getByText("La Habana / Plaza de la Revolución")).toBeVisible();
    await expect(summary.getByText("Recogida")).toBeVisible();
    await expect(summary.getByText("500 EUR")).toBeVisible();
    await expect(summary.getByText("Entrada de efectivo")).toBeVisible();
  });

  test("Continuar stays disabled until the whole form is valid", async ({ page }) => {
    const continuar = page.getByRole("button", { name: "Continuar" });
    await expect(continuar).toBeDisabled();
    await fillValidForm(page);
    await expect(continuar).toBeEnabled();
  });
});

test.describe("Revisar giro", () => {
  test.beforeEach(async ({ page }) => {
    await openJornadaAndGoToGiros(page);
    await fillValidForm(page);
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("heading", { name: "Revisar giro" })).toBeVisible();
  });

  test("shows sender, beneficiary, giro data and Caja, with province/municipality as readable labels", async ({
    page,
  }) => {
    await expect(page.getByText("Carlos Pérez Rodríguez")).toBeVisible();
    await expect(page.getByText("CI · 90010112345")).toBeVisible();
    await expect(page.getByText("María López García")).toBeVisible();
    await expect(page.getByText("La Habana / Plaza de la Revolución")).toBeVisible();
    await expect(page.getByText("Recogida")).toBeVisible();
    await expect(page.getByText("EUR · Euro")).toBeVisible();
    await expect(page.getByText("500,00 EUR")).toBeVisible();
    await expect(page.getByText("Caja 03").first()).toBeVisible();
    await expect(page.getByText("Entrada de efectivo")).toBeVisible();
  });

  test("shows the Verificación de datos warning", async ({ page }) => {
    await expect(page.getByText("Verificación de datos")).toBeVisible();
  });

  test("no external transfer exists yet at this step", async ({ page }) => {
    // Reaching this step must not have touched Operaciones.
    await page.getByRole("button", { name: "Cancelar" }).click();
    // Cancel from a dirty flow opens the abandonment dialog rather than navigating directly.
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Sí, cancelar giro" }).click();
    await expect(page).toHaveURL(/\/worker\/nueva-operacion$/);
  });

  test('"Volver a Giros" preserves the draft', async ({ page }) => {
    await page.getByRole("button", { name: "Volver a Giros" }).click();
    await expect(page.getByRole("heading", { name: "Revisar giro" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Giros" })).toBeVisible();
    await expect(page.locator("#giro-remitente-nombre")).toHaveValue("Carlos");
    await expect(page.locator("#giro-beneficiario-nombre")).toHaveValue("María López García");
    await expect(page.getByLabel("Importe a entregar")).toHaveValue("500");
  });
});

test.describe("Confirmar envío", () => {
  test.beforeEach(async ({ page }) => {
    await openJornadaAndGoToGiros(page);
    await fillValidForm(page);
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Continuar a confirmar" }).click();
    await expect(page.getByRole("heading", { name: "Confirmar envío de giro" })).toBeVisible();
  });

  test("renders the approved confirmation summary", async ({ page }) => {
    await expect(page.getByText("Resumen de confirmación")).toBeVisible();
    await expect(page.getByText("Carlos Pérez Rodríguez")).toBeVisible();
    await expect(page.getByText("María López García")).toBeVisible();
    await expect(page.getByText("85010112345")).toBeVisible();
    await expect(page.getByText("La Habana / Plaza de la Revolución")).toBeVisible();
    await expect(page.getByText("Recogida")).toBeVisible();
    await expect(page.getByText("EUR · Euro")).toBeVisible();
    await expect(page.getByText("500,00 EUR")).toBeVisible();
    await expect(page.getByText("Caja 03").first()).toBeVisible();
  });

  test("shows the Acción irreversible warning", async ({ page }) => {
    await expect(page.getByText("Acción irreversible")).toBeVisible();
  });

  test("no transfer exists before Confirmar envío is pressed", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Giro registrado correctamente" })).toHaveCount(0);
  });

  test("Confirmar envío is disabled while submitting, preventing a double submission", async ({
    page,
  }) => {
    const confirmar = page.getByRole("button", { name: "Confirmar envío" });
    await confirmar.click();
    // Immediately re-querying by the original name should not find a second,
    // independently clickable button — the same one now reads "Confirmando…".
    await expect(page.getByRole("button", { name: "Confirmando…" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Giro registrado correctamente" })).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("External failure", () => {
  test("provider failure creates no operation, no Caja movement, no balance change, and no success screen", async ({
    page,
  }) => {
    await openJornadaAndGoToGiros(page);
    await fillValidForm(page, { beneficiaryName: "Falla Externa" });
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Continuar a confirmar" }).click();
    await page.getByRole("button", { name: "Confirmar envío" }).click();

    await expect(page.getByText("No se pudo registrar el giro. Intenta nuevamente o solicita asistencia.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Giro registrado correctamente" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Confirmar envío de giro" })).toBeVisible();

    // The confirm screen has no "Ir a Caja" action — reach Caja via the shell's own nav.
    await page.getByRole("link", { name: "Caja" }).click();
    const table = page.getByRole("table").first();
    await expect(table.locator("tr", { hasText: "EUR" })).toContainText("1.200,00");
  });
});

test.describe("Success — Caja, Operaciones and result", () => {
  test("confirming creates one commercial Entrada linked to the operation code", async ({ page }) => {
    await openJornadaAndGoToGiros(page);
    await completeGiro(page);

    // The result screen has no "Ir a Caja" action either — same shell nav.
    await page.getByRole("link", { name: "Caja" }).click();
    const table = page.getByRole("table").first();
    await expect(table.locator("tr", { hasText: "EUR" })).toContainText("1.700,00");

    const movementsTable = page.getByRole("table").nth(1);
    const row = movementsTable.locator("tbody tr").filter({ hasText: "Giros" }).first();
    await expect(row).toContainText("Entrada");
    await expect(row).toContainText("+500,00");
    await expect(row.getByRole("link", { name: "Ver detalle" })).toHaveCount(0);
  });

  test("the new operation appears in Operaciones with the sender as Cliente", async ({ page }) => {
    await openJornadaAndGoToGiros(page);
    await completeGiro(page);

    await page.getByRole("link", { name: "Ir a Operaciones" }).click();
    const table = page.getByRole("table");
    const row = table.locator("tbody tr").filter({ hasText: "Giros" }).first();
    await expect(row).toContainText("Carlos Pérez Rodríguez");
    await expect(row).toContainText("500,00 EUR");
    await expect(row).toContainText("Completada");
  });

  test("Operation Detail resolves to the specialized Giro detail", async ({ page }) => {
    await openJornadaAndGoToGiros(page);
    await completeGiro(page);
    await page.getByRole("link", { name: "Ir a Operaciones" }).click();

    const table = page.getByRole("table");
    const giroRow = table.locator("tbody tr").filter({ hasText: "Giros" }).first();
    await giroRow.getByRole("link", { name: "Ver detalle" }).click();

    // The generic fallback no longer answers for giros — see
    // `worker-operacion-detalle-giro.spec.ts` for the full detail contract.
    await expect(page.getByRole("heading", { name: "Detalle de operación" })).toBeVisible();
    await expect(onScreen(page, "Giro enviado")).toBeVisible();
    await expect(onScreen(page, "Carlos Pérez Rodríguez")).toBeVisible();
    await expect(onScreen(page, "Giros").first()).toBeVisible();
    await expect(onScreen(page, "500,00 EUR").first()).toBeVisible();
    await expect(onScreen(page, "Detalle del servicio")).toHaveCount(0);
  });

  test("Result screen shows both codes, sender, beneficiary and canonical timestamp", async ({ page }) => {
    await openJornadaAndGoToGiros(page);
    await completeGiro(page);

    await expect(onScreen(page, "Código de operación")).toBeVisible();
    await expect(onScreen(page, /^PC-\d{6}-\d{6}$/).first()).toBeVisible();
    await expect(onScreen(page, "Código del giro")).toBeVisible();
    await expect(onScreen(page, /^TR-/).first()).toBeVisible();
    await expect(onScreen(page, "Carlos Pérez Rodríguez")).toBeVisible();
    await expect(onScreen(page, "María López García").first()).toBeVisible();
    await expect(onScreen(page, "85010112345").first()).toBeVisible();
    await expect(onScreen(page, "500,00 EUR").first()).toBeVisible();
    await expect(onScreen(page, "Recogida").first()).toBeVisible();
    await expect(onScreen(page, /\d{2}\/\d{2}\/\d{4} · \d{2}:\d{2}/).first()).toBeVisible();
  });

  test('"Imprimir comprobante" triggers the existing browser-print mechanism', async ({ page }) => {
    await openJornadaAndGoToGiros(page);
    await completeGiro(page);

    let printed = false;
    await page.exposeFunction("__notifyPrint", () => {
      printed = true;
    });
    await page.evaluate(() => {
      window.print = () => (window as unknown as { __notifyPrint: () => void }).__notifyPrint();
    });
    await page.getByRole("button", { name: "Imprimir comprobante" }).click();
    expect(printed).toBe(true);
  });

  test("does not auto-redirect away from the result screen", async ({ page }) => {
    await openJornadaAndGoToGiros(page);
    await completeGiro(page);
    await page.waitForTimeout(800);
    await expect(page.getByText("Giro registrado correctamente")).toBeVisible();
  });
});

test.describe("Cancellation and back navigation", () => {
  test("Cancelar on Step 1 with an untouched form exits without a confirmation dialog", async ({
    page,
  }) => {
    await openJornadaAndGoToGiros(page);
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page).toHaveURL(/\/worker\/nueva-operacion$/);
  });

  test("Cancelar on Step 1 with entered data shows the abandonment dialog and discards nothing until confirmed", async ({
    page,
  }) => {
    await openJornadaAndGoToGiros(page);
    await page.locator("#giro-remitente-nombre").fill("Carlos");
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Seguir registrando" }).click();
    await expect(page.locator("#giro-remitente-nombre")).toHaveValue("Carlos");
  });
});

test.describe("Scope protection", () => {
  test("no delivery-method selector, no delivery/transfer option, no bank-account field, no fee/exchange-rate UI", async ({
    page,
  }) => {
    await openJornadaAndGoToGiros(page);
    await expect(page.getByText("Entrega", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Transferencia", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/cuenta bancaria/i)).toHaveCount(0);
    await expect(page.getByText(/comisión|tasa de cambio|tipo de cambio/i)).toHaveCount(0);
  });
});

test.describe("Giros — layout", () => {
  for (const width of [1440, 1280]) {
    test(`fits without page-level horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openJornadaAndGoToGiros(page);
      await fillValidForm(page);

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);
    });
  }

  test("zero console errors through the full successful flow", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await openJornadaAndGoToGiros(page);
    await completeGiro(page);
    await page.getByRole("link", { name: "Ir a Operaciones" }).click();

    expect(errors).toEqual([]);
  });
});
