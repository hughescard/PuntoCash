import { test, expect } from "@playwright/test";

import { cotizar, cotizarParaRecibir, type TasaVigente } from "../src/features/exchange/cotizacion";

const TASAS: TasaVigente[] = [
  { code: "USD", compra: 318, venta: 326 },
  { code: "EUR", compra: 342, venta: 354 },
];

test.describe("cotizarParaRecibir", () => {
  test("da lo mínimo que hay que entregar para llegar a lo que se quiere recibir", () => {
    const r = cotizarParaRecibir(TASAS, "USD", "CUP", 31_800);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.destinationAmount).toBeGreaterThanOrEqual(31_800);
    /* Un paso menos ya no llegaría. */
    const menos = cotizar(TASAS, "USD", "CUP", Math.round((r.value.sourceAmount - 0.01) * 100) / 100);
    expect(menos.ok && menos.value.destinationAmount >= 31_800).toBe(false);
  });

  test("el importe a entregar es múltiplo del paso pedido", () => {
    const r = cotizarParaRecibir(TASAS, "CUP", "USD", 100, 5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Math.round(r.value.sourceAmount * 100) % 500).toBe(0);
    expect(r.value.destinationAmount).toBeGreaterThanOrEqual(100);
  });

  test("rechaza un importe que no es positivo", () => {
    expect(cotizarParaRecibir(TASAS, "USD", "CUP", 0)).toEqual({ ok: false, reason: "importe-invalido" });
    expect(cotizarParaRecibir(TASAS, "USD", "CUP", -5)).toEqual({ ok: false, reason: "importe-invalido" });
  });

  test("entre dos monedas extranjeras pasa por pesos", () => {
    const r = cotizarParaRecibir(TASAS, "USD", "EUR", 100);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.destinationAmount).toBeGreaterThanOrEqual(100);
  });
});
