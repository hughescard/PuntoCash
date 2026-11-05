import { test, expect } from "./worker-fixture";
import type { Page } from "@playwright/test";

import { esperarFondeoVivo, rellenar } from "./worker-helpers";

/**
 * Worker Caja — **Abrir jornada** (`/worker/caja/fondeo-inicial`), apertura a
 * ciegas (decisión del 5/11/2026).
 *
 * Se cuenta lo que hay en la caja sin ver lo que dejó el cierre anterior;
 * después se compara, y cada diferencia pide un motivo compatible con su
 * signo. La primera jornada de una caja no tiene con qué comparar.
 *
 * Cada prueba opera su propio puesto (`worker-fixture.ts`). Por defecto la
 * caja tiene habilitadas CUP, USD, EUR y GBP y nunca se ha abierto.
 */

test.use({ monedas: ["CUP", "USD", "EUR", "GBP"] });

const CUATRO = { CUP: "200000", USD: "4250", EUR: "1185", GBP: "0" };

async function contar(page: Page, amounts: Record<string, string>) {
  await page.goto("/worker/caja/fondeo-inicial");
  await esperarFondeoVivo(page);
  for (const [currency, value] of Object.entries(amounts)) {
    await rellenar(page.getByLabel(`Efectivo contado en ${currency}`), value);
  }
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Confirmar conteo" }).click();
  await expect(page.getByRole("heading", { name: "Revisión de la apertura" })).toBeVisible();
}

async function abrir(page: Page, amounts: Record<string, string> = CUATRO) {
  await contar(page, amounts);
  await page.getByRole("button", { name: "Confirmar y abrir caja" }).click();
  await expect(page.getByRole("heading", { name: "Caja abierta correctamente" })).toBeVisible();
}

test.describe("abrir jornada — conteo", () => {
  test("presenta la pantalla y llega desde la acción de Caja", async ({ page }) => {
    await page.goto("/worker/caja");
    await page.getByRole("link", { name: /Abrir jornada/ }).click();
    await expect(page).toHaveURL(/\/worker\/caja\/fondeo-inicial$/);
    await expect(page.getByRole("heading", { name: "Abrir jornada" })).toBeVisible();
    await expect(page.getByText("Pendiente de apertura")).toBeVisible();
    await expect(page.getByText("Se registrará al confirmar")).toBeVisible();
    await expect(page.getByText("Juan Pérez").first()).toBeVisible();
  });

  test("Volver a Caja y Cancelar vuelven a Caja", async ({ page }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    await page.getByRole("link", { name: "Volver a Caja" }).click();
    await expect(page).toHaveURL(/\/worker\/caja$/);
    await page.goto("/worker/caja/fondeo-inicial");
    await page.getByRole("link", { name: "Cancelar" }).click();
    await expect(page).toHaveURL(/\/worker\/caja$/);
  });

  test("pide contar todas las monedas de la caja, con banderas SVG", async ({ page }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    for (const currency of ["CUP", "USD", "EUR", "GBP"]) {
      await expect(page.getByLabel(`Efectivo contado en ${currency}`)).toHaveCount(1);
    }
    for (const flag of await page.locator("svg[data-currency-flag]").all()) {
      await expect(flag).toHaveAttribute("aria-hidden", "true");
    }
  });

  test("una moneda sin contar no deja seguir: si no hay efectivo, se escribe 0", async ({ page }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    await esperarFondeoVivo(page);
    await rellenar(page.getByLabel("Efectivo contado en CUP"), "1000");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Cuenta esta moneda. Si no hay efectivo, escribe 0.").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Revisión de la apertura" })).toHaveCount(0);
  });

  test("rechaza un importe inválido en su campo", async ({ page }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    await esperarFondeoVivo(page);
    await rellenar(page.getByLabel("Efectivo contado en USD"), "abc");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByLabel("Efectivo contado en USD")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Introduce un monto válido.")).toBeVisible();
  });

  test("«Añádela a la caja» lleva a Añadir moneda", async ({ page }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    await page.getByRole("link", { name: /Añádela a la caja/ }).click();
    await expect(page).toHaveURL(/\/worker\/caja\/anadir-moneda\?returnTo=fondeo-inicial$/);
    await expect(page.getByRole("heading", { name: "Añadir moneda" })).toBeVisible();
  });
});

test.describe("abrir jornada — primera jornada de la caja", () => {
  test("no compara con nada y no pide motivos", async ({ page }) => {
    await contar(page, CUATRO);
    await expect(page.getByText(/Es la primera jornada de esta caja/)).toBeVisible();
    await expect(page.getByText("Coincide")).toHaveCount(0);
    await expect(page.getByLabel(/Motivo de la diferencia/)).toHaveCount(0);
  });

  test("al continuar avisa de que los valores no podrán cambiarse; «Seguir contando» vuelve al conteo", async ({ page }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    await esperarFondeoVivo(page);
    for (const [currency, value] of Object.entries(CUATRO)) await rellenar(page.getByLabel(`Efectivo contado en ${currency}`), value);
    await page.getByRole("button", { name: "Continuar" }).click();
    const aviso = page.getByRole("dialog");
    await expect(aviso.getByRole("heading", { name: "Los valores introducidos no podrán ser cambiados" })).toBeVisible();
    await expect(aviso.getByText("4.250,00")).toBeVisible();
    await aviso.getByRole("button", { name: "Seguir contando" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByLabel("Efectivo contado en USD")).toHaveValue("4250");
  });

  test("un conteo declarado no se repite: salir y volver lleva a su revisión", async ({ page }) => {
    await contar(page, CUATRO);
    await expect(page.getByRole("button", { name: "Volver a contar" })).toHaveCount(0);
    await page.goto("/worker/caja");
    await page.goto("/worker/caja/fondeo-inicial");
    await expect(page.getByRole("heading", { name: "Revisión de la apertura" })).toBeVisible();
    await expect(page.getByLabel("Efectivo contado en USD")).toHaveCount(0);
    await expect(page.getByText("4.250,00 USD")).toBeVisible();
  });

  test("confirmar abre la jornada con lo contado y un Fondeo inicial por moneda con efectivo", async ({ page }) => {
    await abrir(page);
    await expect(page.getByText("Fecha y hora de apertura").filter({ visible: true })).toBeVisible();
    await page.getByRole("link", { name: "Ir a Caja" }).click();
    await expect(page).toHaveURL(/\/worker\/caja$/);

    const saldos = page.getByRole("table").first();
    await expect(saldos.getByRole("cell", { name: "200.000,00" })).toBeVisible();
    await expect(saldos.getByRole("cell", { name: "4.250,00" })).toBeVisible();
    await expect(saldos.getByRole("cell", { name: "1.185,00" })).toBeVisible();

    /* GBP se contó en cero: no es un hecho de efectivo y no deja movimiento. */
    const libro = page.getByRole("table").last();
    await expect(libro.getByRole("row").filter({ hasText: "Fondeo inicial" })).toHaveCount(3);
    await expect(libro.getByRole("row").filter({ hasText: "GBP" })).toHaveCount(0);
  });

  test("Imprimir comprobante usa la impresión del navegador", async ({ page }) => {
    await abrir(page);
    await page.evaluate(() => {
      (window as unknown as { __printed: number }).__printed = 0;
      window.print = () => {
        (window as unknown as { __printed: number }).__printed += 1;
      };
    });
    await page.getByRole("button", { name: "Imprimir comprobante" }).click();
    expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
  });

  test("con la jornada abierta, la pantalla ya no deja abrir otra", async ({ page }) => {
    await abrir(page);
    await page.goto("/worker/caja/fondeo-inicial");
    await expect(page.getByText("La caja ya está abierta")).toBeVisible();
    await expect(page.getByLabel("Efectivo contado en CUP")).toHaveCount(0);
  });
});

test.describe("abrir jornada — con totales, tras un cierre", () => {
  test.use({ fondos: { CUP: 100_000, USD: 500 }, monedas: [], cerrada: true });

  test("enseña lo entregado al cierre y lo trae escrito como recibido", async ({ page }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    await expect(page.getByText("Entregado", { exact: true })).toBeVisible();
    await expect(page.getByText("100.000,00 CUP")).toBeVisible();
    await expect(page.getByText("500,00 USD")).toBeVisible();
    await expect(page.getByLabel("Efectivo contado en CUP")).toHaveValue("100000,00");
    await expect(page.getByLabel("Efectivo contado en USD")).toHaveValue("500,00");
  });

  test("aceptar lo entregado abre sin diferencias", async ({ page }) => {
    await page.goto("/worker/caja/fondeo-inicial");
    await esperarFondeoVivo(page);
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("dialog").getByText(/desde ahí el efectivo es tu responsabilidad/)).toBeVisible();
    await page.getByRole("button", { name: "Confirmar conteo" }).click();
    await expect(page.getByText("Coincide")).toHaveCount(2);
    await page.getByRole("button", { name: "Confirmar y abrir caja" }).click();
    await expect(page.getByRole("heading", { name: "Caja abierta correctamente" })).toBeVisible();
  });

  test("lo que coincide se dice; una diferencia pide motivo compatible con su signo", async ({ page }) => {
    await contar(page, { CUP: "100000", USD: "400" });
    await expect(page.getByText("Coincide")).toBeVisible();
    await expect(page.getByText("−100,00 USD")).toBeVisible();

    /* Un faltante no se explica como reposición ni como sobrante. */
    await page.getByLabel("Motivo de la diferencia en USD").click();
    await expect(page.getByRole("option", { name: "Reposición de fondos" })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Sobrante detectado" })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Retiro de fondos" })).toBeVisible();
    await page.keyboard.press("Escape");

    /* Sin motivo no se abre. */
    await page.getByRole("button", { name: "Confirmar y abrir caja" }).click();
    await expect(page.getByText("Indica el motivo de la diferencia.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Caja abierta correctamente" })).toHaveCount(0);
  });

  test("«Otro» exige observaciones", async ({ page }) => {
    await contar(page, { CUP: "100000", USD: "600" });
    await page.getByLabel("Motivo de la diferencia en USD").click();
    await page.getByRole("option", { name: "Otro" }).click();
    await page.getByRole("button", { name: "Confirmar y abrir caja" }).click();
    await expect(page.getByText("Con «Otro», explica la diferencia en las observaciones.")).toBeVisible();
  });

  test("con el motivo, la jornada abre y avisa de que la diferencia va a aprobación", async ({ page }) => {
    await contar(page, { CUP: "100000", USD: "600" });
    await expect(page.getByText("Cada diferencia llega al administrador de la sede para su aprobación.")).toBeVisible();
    await page.getByLabel("Motivo de la diferencia en USD").click();
    await page.getByRole("option", { name: "Reposición de fondos" }).click();
    await page.getByRole("button", { name: "Confirmar y abrir caja" }).click();
    await expect(page.getByRole("heading", { name: "Caja abierta correctamente" })).toBeVisible();
    await page.getByRole("link", { name: "Ir a Caja" }).click();
    await expect(page.getByRole("table").first().getByRole("cell", { name: "600,00" })).toBeVisible();
  });
});

test.describe("abrir jornada — layout", () => {
  for (const width of [1440, 1280]) {
    test(`fits without page-level horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/worker/caja/fondeo-inicial");
      await page.getByRole("main").waitFor();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
      ).toBe(false);
    });
  }

  test("zero console errors across the full flow", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await abrir(page);
    expect(errors).toEqual([]);
  });
});
