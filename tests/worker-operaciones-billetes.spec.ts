import { test, expect } from "./worker-fixture";
import { type Page } from "@playwright/test";

import { marcarBilletes, onScreen } from "./worker-helpers";

/*
 * Operaciones con billetes y vuelto (bloque 4): lo que ve el trabajador en el
 * paso «Efectivo» del cambio de moneda y lo que queda en el comprobante y el
 * detalle.
 */
test.use({ conCambio: true, fondos: { CUP: 500_000, USD: 3_850, EUR: 2_120 } });

const DOCUMENTO = "90010112345";

async function empezar(page: Page, monto: string) {
  await page.goto("/worker/caja");
  await page.getByRole("link", { name: "Nueva operación" }).click();
  await page.getByRole("link", { name: /Cambio de moneda/ }).click();
  const campo = page.getByLabel("Monto a entregar");
  await campo.fill(monto);
  await campo.blur();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Número de documento").fill(DOCUMENTO);
  await page.getByRole("button", { name: "Buscar cliente" }).click();
  await page.getByRole("button", { name: /Seleccionar cliente y continuar/ }).click();
  await expect(page.getByRole("heading", { name: "Billetes con los que paga el cliente" })).toBeVisible();
}

test.describe("Cambio con vuelto", () => {
  test("si el cliente paga con un billete mayor, la caja propone el vuelto y queda en el comprobante", async ({ page }) => {
    await empezar(page, "150");
    await marcarBilletes(page, "Billetes del cliente de USD", 200);

    await expect(page.getByText("Los billetes cuadran.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("region", { name: "Vuelto de USD" })).toBeVisible();

    await page.getByRole("button", { name: "Continuar a revisión" }).click();
    await expect(page.getByRole("heading", { name: "Billetes de la operación" })).toBeVisible();
    await page.getByRole("button", { name: "Confirmar cambio" }).click();

    await expect(onScreen(page, "Vuelto al cliente").first()).toBeVisible({ timeout: 10_000 });
    await expect(onScreen(page, "50,00 USD").first()).toBeVisible();
  });

  test("con billetes que no alcanzan no se puede continuar", async ({ page }) => {
    await empezar(page, "150");
    await marcarBilletes(page, "Billetes del cliente de USD", 100);

    await expect(page.getByText("Los billetes cuadran.")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continuar a revisión" })).toBeDisabled();
  });

  test("el vuelto aparece en el detalle de la operación", async ({ page }) => {
    await empezar(page, "150");
    await marcarBilletes(page, "Billetes del cliente de USD", 200);
    await expect(page.getByText("Los billetes cuadran.")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Continuar a revisión" }).click();
    await page.getByRole("button", { name: "Confirmar cambio" }).click();
    await expect(onScreen(page, "Vuelto al cliente").first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole("link", { name: "Ver detalle" }).click();
    await expect(page.getByRole("heading", { name: /^Operación PC-/ })).toBeVisible();
    /* El vuelto es una fila de la cuenta del cambio (19/11/2026), no una tarjeta aparte. */
    await expect(page.getByRole("heading", { name: "Movimientos de caja" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cómo se movió el efectivo" })).toHaveCount(0);
    await expect(onScreen(page, "Entregó el cliente").first()).toBeVisible();
    await expect(onScreen(page, "−50,00 USD").first()).toBeVisible();
  });
});

test.describe("Recibir un importe", () => {
  test("el trabajador dice cuánto quiere recibir el cliente y el sistema calcula lo que entrega", async ({ page }) => {
    await page.goto("/worker/caja");
    await page.getByRole("link", { name: "Nueva operación" }).click();
    await page.getByRole("link", { name: /Cambio de moneda/ }).click();
    await page.getByText("Recibir un importe").click();

    const recibir = page.getByLabel("Monto a recibir", { exact: true });
    await recibir.fill("31800");
    await recibir.blur();

    const entregar = page.getByLabel("Monto a entregar (calculado)");
    await expect(entregar).not.toHaveValue("");
    await expect(entregar).not.toHaveValue("0,00");
  });
});

test.describe("Aceptar otro importe", () => {
  test.use({ conCambio: true, fondos: { CUP: 500_000, EUR: 100 } });

  test("al aceptarlo, lo que el cliente había marcado se borra: se marca de nuevo para el importe nuevo", async ({ page }) => {
    await page.goto("/worker/caja");
    await page.getByRole("link", { name: "Nueva operación" }).click();
    await page.getByRole("link", { name: /Cambio de moneda/ }).click();
    await page.getByLabel("Moneda origen").click();
    await page.getByRole("option", { name: /^CUP/ }).click();
    await page.getByLabel("Moneda destino").click();
    await page.getByRole("option", { name: /^EUR/ }).click();
    const campo = page.getByLabel("Monto a entregar");
    await campo.fill("100000");
    await campo.blur();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByLabel("Número de documento").fill(DOCUMENTO);
    await page.getByRole("button", { name: "Buscar cliente" }).click();
    await page.getByRole("button", { name: /Seleccionar cliente y continuar/ }).click();
    await expect(page.getByRole("heading", { name: "Billetes con los que paga el cliente" })).toBeVisible();
    await marcarBilletes(page, "Billetes del cliente de CUP", 100_000);

    await page.getByRole("button", { name: /^Cambiar .* y entregar/ }).click();
    await expect(page.getByText("Los billetes cuadran.")).toHaveCount(0);
    for (const c of await page.getByRole("region", { name: "Billetes del cliente de CUP" }).getByRole("textbox").all()) {
      await expect(c).toHaveValue("");
    }
    await expect(page.getByRole("button", { name: "Continuar a revisión" })).toBeDisabled();
  });
});
