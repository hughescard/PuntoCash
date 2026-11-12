import { test, expect } from "@playwright/test";

import { difiereDeLoDebido, entregadoAlCliente } from "../src/features/operations/entregado";

/*
 * Lo que el cliente se llevó de verdad (12/11/2026): lo que dicen «Cliente
 * recibe», «Importe entregado» y «Salió de caja».
 */
test.describe("Lo entregado al cliente", () => {
  test("sin liquidación es lo que se le debía", () => {
    const debido = { amount: 500, currency: "CUP" };
    expect(entregadoAlCliente(debido, undefined)).toEqual([debido]);
    expect(difiereDeLoDebido(debido, undefined)).toBe(false);
  });

  test("el redondeo a favor de la casa no sale de la caja", () => {
    const debido = { amount: 31_803.18, currency: "CUP" };
    const l = { aFavorDeLaCasa: [{ currency: "CUP", importe: 0.18, motivo: "redondeo" as const }] };
    expect(entregadoAlCliente(debido, l)).toEqual([{ amount: 31_803, currency: "CUP" }]);
    expect(difiereDeLoDebido(debido, l)).toBe(true);
  });

  test("la parte pagada en CUP se dice aparte, y su redondeo en CUP no toca la moneda", () => {
    const debido = { amount: 898.3, currency: "EUR" };
    const l = {
      enCup: { importe: 282_598, equivale: { currency: "EUR", importe: 798.3 } },
      aFavorDeLaCasa: [{ currency: "CUP", importe: 0.2, motivo: "redondeo" as const }],
    };
    expect(entregadoAlCliente(debido, l)).toEqual([
      { amount: 100, currency: "EUR" },
      { amount: 282_598, currency: "CUP" },
    ]);
  });

  test("el vuelto no cambia lo que se entrega", () => {
    const debido = { amount: 47_700, currency: "CUP" };
    expect(entregadoAlCliente(debido, { vuelto: { currency: "USD", importe: 50 } })).toEqual([debido]);
  });
});
