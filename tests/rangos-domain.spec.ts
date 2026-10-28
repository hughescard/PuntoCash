import { expect, test } from "@playwright/test";

import { GLOBAL_SCOPE, operatorScope } from "../src/features/network/scope";
import {
  definirRango,
  motivoFueraDeVigor,
  rangoDe,
  retirarRango,
  simularRango,
  tasaDe,
  validarRango,
} from "../src/features/network/rates";

/**
 * Los rangos de PuntoCash: definir, ajustar las tasas que quedan fuera y
 * retirar. Todo sobre el dólar canadiense, que no tiene rango y solo Trinidad
 * tiene tasa guardada (228 / 236); la prueba lo deja sin rango al terminar,
 * como estaba.
 */

const compra = { min: 200, max: 220 };
const venta = { min: 210, max: 230 };

test("un rango tiene que ser coherente", () => {
  expect(validarRango({ min: 0, max: 10 }, { min: 5, max: 20 })).toBe("valor-invalido");
  expect(validarRango({ min: 10, max: 10 }, { min: 15, max: 20 })).toBe("minimo-mayor");
  /* Compra mínima por encima de la venta mínima. */
  expect(validarRango({ min: 16, max: 18 }, { min: 15, max: 20 })).toBe("rango-incoherente");
  /* Compra máxima por encima de la venta máxima. */
  expect(validarRango({ min: 10, max: 21 }, { min: 15, max: 20 })).toBe("rango-incoherente");
  expect(validarRango(compra, venta)).toBeNull();
});

test("solo PuntoCash define rangos, y nunca el de la moneda local", () => {
  expect(definirRango(operatorScope("op-bahia"), { code: "CAD", compra, venta, autor: "X" })).toMatchObject({ reason: "alcance-insuficiente" });
  expect(definirRango(GLOBAL_SCOPE, { code: "CUP", compra, venta, autor: "X" })).toMatchObject({ reason: "moneda-local" });
});

test("definir un rango fija al límite las tasas que quedan fuera, las marca, y retirarlo no las borra", () => {
  expect(rangoDe("CAD")).toBeNull();
  expect(motivoFueraDeVigor("sede-trinidad", "CAD")).toBe("sin-rango");

  const simulado = simularRango("CAD", compra, venta);
  expect(simulado).toEqual([
    expect.objectContaining({ sedeId: "sede-trinidad", antes: { compra: 228, venta: 236 }, despues: { compra: 220, venta: 230 } }),
  ]);

  const r = definirRango(GLOBAL_SCOPE, { code: "CAD", compra, venta, autor: "Elena Marrero Fonseca" });
  expect(r).toMatchObject({ ok: true });
  expect(rangoDe("CAD")).toMatchObject({ compra, venta, updatedBy: "Elena Marrero Fonseca" });
  const t = tasaDe("sede-trinidad", "CAD")!;
  expect(t).toMatchObject({ compra: 220, venta: 230, updatedBy: "PuntoCash" });
  expect(t.fijadaAlLimite?.anterior).toEqual({ compra: 228, venta: 236 });
  /* Ya cotizable en Trinidad (tiene Cambio de moneda y la moneda en su lista). */
  expect(motivoFueraDeVigor("sede-trinidad", "CAD")).toBeNull();

  expect(retirarRango(GLOBAL_SCOPE, "CAD")).toMatchObject({ ok: true });
  expect(rangoDe("CAD")).toBeNull();
  expect(tasaDe("sede-trinidad", "CAD")).not.toBeNull();
  expect(motivoFueraDeVigor("sede-trinidad", "CAD")).toBe("sin-rango");
  expect(retirarRango(GLOBAL_SCOPE, "CAD")).toMatchObject({ reason: "sin-rango" });
});
