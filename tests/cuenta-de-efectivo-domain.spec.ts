import { expect, test } from "@playwright/test";

import { filasDeUnPago, salidasDeUnPago } from "../src/app/worker/(app)/operaciones/[codigo]/cuenta-de-efectivo";

/**
 * La cuenta del efectivo de un pago (19/11/2026): lo que se debía, lo que
 * quedó a favor de la casa, lo pagado en CUP en lugar de la moneda y lo que
 * se entregó, con lo que salió de la caja por moneda.
 */

test("si se entregó justo lo debido, basta una fila y una salida", () => {
  const debido = { amount: 100, currency: "USD" };
  expect(filasDeUnPago(debido, "Importe del giro", undefined, "Entregado al beneficiario")).toEqual([
    { etiqueta: "Importe del giro", valor: "100,00 USD" },
  ]);
  expect(salidasDeUnPago(debido, undefined)).toEqual([{ sentido: "salida", money: debido }]);
});

test("con redondeo y parte pagada en CUP, la cuenta cuadra fila a fila", () => {
  const debido = { amount: 100, currency: "USD" };
  const l = {
    aFavorDeLaCasa: [
      { currency: "USD", importe: 0.5, motivo: "redondeo" as const },
      { currency: "CUP", importe: 0.4, motivo: "redondeo" as const },
    ],
    enCup: { importe: 6_800, equivale: { currency: "USD", importe: 20 } },
  };
  const filas = filasDeUnPago(debido, "Importe del giro", l, "Entregado al beneficiario");
  expect(filas.map((f) => [f.etiqueta, f.valor])).toEqual([
    ["Importe del giro", "100,00 USD"],
    ["Redondeo a favor de la casa", "−0,50 USD"],
    ["Pagado en CUP por falta de billetes", "−20,00 USD"],
    ["Redondeo a favor de la casa en CUP", "0,40 CUP"],
    ["Entregado al beneficiario en USD", "79,50 USD"],
    ["Entregado al beneficiario en CUP", "6.800,00 CUP"],
  ]);
  expect(filas[2]?.detalle).toBe("En su lugar, 6.800,00 CUP");
  expect(salidasDeUnPago(debido, l).map((m) => m.money)).toEqual([
    { amount: 79.5, currency: "USD" },
    { amount: 6_800, currency: "CUP" },
  ]);
});
