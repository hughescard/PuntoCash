import { expect, test } from "@playwright/test";

import { GLOBAL_SCOPE, operatorScope } from "../src/features/network/scope";
import {
  avisosDeTarifa,
  darPorVistoAvisoDeTarifa,
  definirTarifaDeGiro,
  retirarTarifaDeGiro,
  tarifaDeGiro,
  type TramoDeTarifa,
} from "../src/features/network/tarifas";

/**
 * Avisos de tarifa a las sedes (decisión del 24/11/2026): lo que PuntoCash
 * hace con la tarifa de giros de una moneda se cuenta a cada sede que envía
 * giros en ella, hasta que alguien de la empresa lo da por visto.
 *
 * Monedas de la prueba, que ninguna otra toca en este proceso:
 *   · **CHF**, solo en Vedado (Malecón).
 *   · **CAD**, en Obispo (Malecón) y en Trinidad (Bahía).
 *   · **USD**, que se cambia y se deja como estaba.
 */

const T = (hasta: number | null, fijo: number, porcentaje: number): TramoDeTarifa => ({ hasta, fijo, porcentaje });
const MALECON = operatorScope("op-malecon");
const BAHIA = operatorScope("op-bahia");
const definir = (moneda: string, minimo: number, tramos: readonly TramoDeTarifa[], motivo?: string) =>
  definirTarifaDeGiro(GLOBAL_SCOPE, { moneda, minimo, tramos, autor: "Prueba", ...(motivo ? { motivo } : {}) });
const avisoDe = (sedeId: string, moneda: string) => avisosDeTarifa(sedeId).find((a) => a.moneda === moneda);

test("definir una tarifa avisa solo a las sedes que envían giros en esa moneda", () => {
  expect(definir("CHF", 10, [T(null, 2, 0)]).ok).toBe(true);
  try {
    expect(avisoDe("sede-vedado", "CHF")).toMatchObject({ tipo: "definida", anterior: null });
    /* Obispo es de la misma empresa, pero no maneja francos suizos. */
    expect(avisoDe("sede-habana-vieja", "CHF")).toBeUndefined();

    expect(darPorVistoAvisoDeTarifa(MALECON, ["sede-vedado"], "CHF")).toEqual({ ok: true, vistos: 1 });
    expect(avisoDe("sede-vedado", "CHF")).toBeUndefined();
    /* Verlo otra vez no es un error: otro de la empresa se adelantó. */
    expect(darPorVistoAvisoDeTarifa(MALECON, ["sede-vedado"], "CHF")).toEqual({ ok: true, vistos: 0 });
  } finally {
    retirarTarifaDeGiro(GLOBAL_SCOPE, "CHF", "Limpieza de la prueba");
    darPorVistoAvisoDeTarifa(MALECON, ["sede-vedado"], "CHF");
  }
});

test("retirar la tarifa avisa de que ya no se envían giros, con la tarifa que se conocía", () => {
  definir("CHF", 10, [T(null, 2, 0)]);
  darPorVistoAvisoDeTarifa(MALECON, ["sede-vedado"], "CHF");
  try {
    expect(retirarTarifaDeGiro(GLOBAL_SCOPE, "CHF", "Prueba de avisos").ok).toBe(true);
    expect(avisoDe("sede-vedado", "CHF")).toMatchObject({ tipo: "retirada", anterior: { minimo: 10 } });
  } finally {
    darPorVistoAvisoDeTarifa(MALECON, ["sede-vedado"], "CHF");
  }
});

test("si al final la sede queda como la conocía, no hay nada que contar", () => {
  /* Se define y se retira sin que nadie lo vea. */
  definir("CHF", 10, [T(null, 2, 0)]);
  retirarTarifaDeGiro(GLOBAL_SCOPE, "CHF", "Prueba de avisos");
  expect(avisoDe("sede-vedado", "CHF")).toBeUndefined();

  /* Se cambia el dólar y se deshace el cambio. */
  const usd = tarifaDeGiro("USD")!;
  definir("USD", usd.minimo, [T(100, 4, 0), ...usd.tramos.slice(1)], "Prueba de avisos");
  expect(avisoDe("sede-vedado", "USD")).toMatchObject({ tipo: "cambiada", anterior: { tramos: usd.tramos } });
  definir("USD", usd.minimo, usd.tramos, "Prueba de avisos: se deshace");
  expect(avisoDe("sede-vedado", "USD")).toBeUndefined();
  expect(avisoDe("sede-holguin", "USD")).toBeUndefined();
});

test("dos cambios seguidos sin ver se comparan contra lo que la sede conocía", () => {
  definir("CAD", 10, [T(null, 2, 0)]);
  try {
    definir("CAD", 10, [T(null, 3, 0)], "Segundo cambio");
    /* Para Obispo sigue siendo una tarifa nueva: no tenía ninguna. */
    expect(avisoDe("sede-habana-vieja", "CAD")).toMatchObject({ tipo: "definida", anterior: null });
  } finally {
    retirarTarifaDeGiro(GLOBAL_SCOPE, "CAD", "Limpieza de la prueba");
  }
  /* Definida y retirada sin verla: nada que contar. */
  expect(avisoDe("sede-habana-vieja", "CAD")).toBeUndefined();
  expect(avisoDe("sede-trinidad", "CAD")).toBeUndefined();
});

test("cada empresa da por vistos los de sus sedes, y PuntoCash no da por visto nada", () => {
  definir("CAD", 10, [T(null, 2, 0)]);
  try {
    expect(darPorVistoAvisoDeTarifa(GLOBAL_SCOPE, ["sede-habana-vieja"], "CAD")).toEqual({
      ok: false,
      reason: "alcance-global-prohibido",
    });
    /* Trinidad no es de Malecón: se rechaza entero, sin tocar Obispo. */
    expect(darPorVistoAvisoDeTarifa(MALECON, ["sede-habana-vieja", "sede-trinidad"], "CAD")).toEqual({
      ok: false,
      reason: "fuera-de-alcance",
    });
    expect(avisoDe("sede-habana-vieja", "CAD")).toBeDefined();

    darPorVistoAvisoDeTarifa(MALECON, ["sede-habana-vieja"], "CAD");
    expect(avisoDe("sede-habana-vieja", "CAD")).toBeUndefined();
    /* El de Bahía sigue en pie hasta que lo vea alguien de Bahía. */
    expect(avisoDe("sede-trinidad", "CAD")).toBeDefined();
    darPorVistoAvisoDeTarifa(BAHIA, ["sede-trinidad"], "CAD");
    expect(avisoDe("sede-trinidad", "CAD")).toBeUndefined();
  } finally {
    retirarTarifaDeGiro(GLOBAL_SCOPE, "CAD", "Limpieza de la prueba");
    darPorVistoAvisoDeTarifa(MALECON, ["sede-habana-vieja"], "CAD");
    darPorVistoAvisoDeTarifa(BAHIA, ["sede-trinidad"], "CAD");
  }
});
