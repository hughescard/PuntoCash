import { expect, test } from "@playwright/test";

import { GLOBAL_SCOPE, operatorScope } from "../src/features/network/scope";
import {
  definirTarifaDeGiro,
  esPagable,
  inicioDeTramo,
  menorDenominacion,
  resumenDeTarifa,
  retirarTarifaDeGiro,
  seEnvianGirosEn,
  tarifaDeGiro,
  TARIFA_POR_SERVICIO,
  tramoDe,
  validarTarifaDeGiro,
  type TramoDeTarifa,
} from "../src/features/network/tarifas";

/**
 * Tarifas de giros: la política de cada moneda (giro mínimo y tramos), quién
 * la escribe y qué se valida. Las escrituras recaen sobre el **franco suizo**,
 * que no tiene tarifa sembrada; la prueba lo deja como estaba.
 */

const T = (hasta: number | null, fijo: number, porcentaje: number): TramoDeTarifa => ({ hasta, fijo, porcentaje });
const TRAMOS = [T(100, 3, 0), T(500, 1, 2), T(null, 0, 1.5)];

test("solo los giros llevan tarifa; cambio de moneda y remesas no", () => {
  expect(TARIFA_POR_SERVICIO["cambio-moneda"]?.tipo).toBe("sin-tarifa");
  expect(TARIFA_POR_SERVICIO["remesas"]?.tipo).toBe("sin-tarifa");
  expect(TARIFA_POR_SERVICIO["giros"]?.tipo).toBe("por-tramos");
});

test("la siembra: peso, dólar y euro tienen tarifa; las demás monedas, no", () => {
  expect(seEnvianGirosEn("CUP")).toBe(true);
  expect(seEnvianGirosEn("USD")).toBe(true);
  expect(seEnvianGirosEn("EUR")).toBe(true);
  expect(seEnvianGirosEn("GBP")).toBe(false);
  expect(tarifaDeGiro("USD")).toMatchObject({ minimo: 10, tramos: TRAMOS });
});

test("el límite superior va incluido en su tramo, y el último no tiene techo", () => {
  const t = { tramos: TRAMOS };
  expect(tramoDe(t, 10)).toEqual(TRAMOS[0]);
  expect(tramoDe(t, 100)).toEqual(TRAMOS[0]);
  expect(tramoDe(t, 100.01)).toEqual(TRAMOS[1]);
  expect(tramoDe(t, 500)).toEqual(TRAMOS[1]);
  expect(tramoDe(t, 1_000_000)).toEqual(TRAMOS[2]);
  expect(inicioDeTramo({ minimo: 10, tramos: TRAMOS }, 0)).toEqual({ desde: 10, incluido: true });
  expect(inicioDeTramo({ minimo: 10, tramos: TRAMOS }, 1)).toEqual({ desde: 100, incluido: false });
});

test("los importes tienen que poder pagarse con la denominación más pequeña", () => {
  expect(menorDenominacion("CUP")).toBe(1);
  expect(menorDenominacion("USD")).toBe(0.01);
  expect(esPagable(10.5, 1)).toBe(false);
  expect(esPagable(10, 1)).toBe(true);
  expect(esPagable(2.35, 0.05)).toBe(true);
  expect(esPagable(2.37, 0.05)).toBe(false);
  expect(validarTarifaDeGiro(1, 1000.5, [T(null, 10, 0)])).toEqual({ reason: "minimo-no-pagable" });
  expect(validarTarifaDeGiro(1, 1000, [T(5000.5, 10, 0), T(null, 10, 0)])).toEqual({ reason: "limite-no-pagable", tramo: 0 });
  expect(validarTarifaDeGiro(1, 1000, [T(null, 10.5, 0)])).toEqual({ reason: "fijo-no-pagable", tramo: 0 });
});

test("los tramos van en orden, sin huecos, y solo el último va sin límite", () => {
  expect(validarTarifaDeGiro(0.01, 10, TRAMOS)).toBeNull();
  expect(validarTarifaDeGiro(0.01, 10, [T(null, 3, 0)])).toBeNull();
  expect(validarTarifaDeGiro(0.01, 10, [])).toEqual({ reason: "sin-tramos" });
  /* El primer límite tiene que superar el mínimo. */
  expect(validarTarifaDeGiro(0.01, 10, [T(10, 3, 0), T(null, 1, 0)])).toEqual({ reason: "limite-no-creciente", tramo: 0 });
  expect(validarTarifaDeGiro(0.01, 10, [T(500, 3, 0), T(100, 1, 0), T(null, 1, 0)])).toEqual({ reason: "limite-no-creciente", tramo: 1 });
  expect(validarTarifaDeGiro(0.01, 10, [T(100, 3, 0), T(500, 1, 0)])).toEqual({ reason: "ultimo-con-limite", tramo: 1 });
  expect(validarTarifaDeGiro(0.01, 10, [T(null, 3, 0), T(null, 1, 0)])).toEqual({ reason: "limite-invalido", tramo: 0 });
});

test("un tramo cobra algo: fijo, porcentaje o los dos, nunca ninguno", () => {
  expect(validarTarifaDeGiro(0.01, 10, [T(null, 0, 0)])).toEqual({ reason: "tramo-sin-tarifa", tramo: 0 });
  expect(validarTarifaDeGiro(0.01, 10, [T(null, 0, 2)])).toBeNull();
  expect(validarTarifaDeGiro(0.01, 10, [T(null, 2, 0)])).toBeNull();
  expect(validarTarifaDeGiro(0.01, 10, [T(null, 2, 3)])).toBeNull();
  expect(validarTarifaDeGiro(0.01, 10, [T(null, -1, 3)])).toEqual({ reason: "fijo-invalido", tramo: 0 });
  expect(validarTarifaDeGiro(0.01, 10, [T(null, 0, 100)])).toEqual({ reason: "porcentaje-invalido", tramo: 0 });
  expect(validarTarifaDeGiro(0.01, 10, [T(null, 0, 1.255)])).toEqual({ reason: "porcentaje-invalido", tramo: 0 });
  expect(validarTarifaDeGiro(0.01, 0, [T(null, 1, 0)])).toEqual({ reason: "minimo-invalido" });
});

test("solo PuntoCash escribe tarifas", () => {
  expect(definirTarifaDeGiro(operatorScope("op-bahia"), { moneda: "CHF", minimo: 10, tramos: TRAMOS, autor: "X" })).toEqual({
    ok: false,
    error: { reason: "alcance-insuficiente" },
  });
  expect(retirarTarifaDeGiro(operatorScope("op-bahia"), "USD", "Motivo suficientemente largo")).toEqual({
    ok: false,
    error: { reason: "alcance-insuficiente" },
  });
});

test("definir, cambiar con motivo y retirar la tarifa del franco suizo", () => {
  expect(seEnvianGirosEn("CHF")).toBe(false);
  expect(menorDenominacion("CHF")).toBe(0.05);

  const r = definirTarifaDeGiro(GLOBAL_SCOPE, { moneda: "CHF", minimo: 10, tramos: TRAMOS, autor: "Elena Marrero Fonseca" });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value.anterior).toBeNull();
  expect(seEnvianGirosEn("CHF")).toBe(true);

  /* Cambiar la que ya existe pide motivo. */
  const otra = [T(200, 4, 0), T(null, 0, 1)];
  expect(definirTarifaDeGiro(GLOBAL_SCOPE, { moneda: "CHF", minimo: 20, tramos: otra, autor: "E" })).toEqual({
    ok: false,
    error: { reason: "motivo-requerido" },
  });
  const c = definirTarifaDeGiro(GLOBAL_SCOPE, { moneda: "CHF", minimo: 20, tramos: otra, autor: "E", motivo: "Ajuste de tarifas de noviembre" });
  expect(c.ok).toBe(true);
  if (c.ok) expect(c.value.anterior?.minimo).toBe(10);
  expect(tarifaDeGiro("CHF")).toMatchObject({ minimo: 20, tramos: otra });

  /* Lo que devuelve es una copia: tocarla no cambia la política. */
  const leida = tarifaDeGiro("CHF")!;
  (leida.tramos as TramoDeTarifa[])[0]!.fijo = 999;
  expect(tarifaDeGiro("CHF")?.tramos[0]?.fijo).toBe(4);

  expect(retirarTarifaDeGiro(GLOBAL_SCOPE, "CHF", "corto")).toEqual({ ok: false, error: { reason: "motivo-requerido" } });
  expect(retirarTarifaDeGiro(GLOBAL_SCOPE, "CHF", "Dejamos de enviar giros en francos").ok).toBe(true);
  expect(seEnvianGirosEn("CHF")).toBe(false);
  expect(retirarTarifaDeGiro(GLOBAL_SCOPE, "CHF", "Dejamos de enviar giros en francos")).toEqual({ ok: false, error: { reason: "sin-tarifa" } });
});

test("una moneda que no está en el catálogo no lleva tarifa", () => {
  expect(definirTarifaDeGiro(GLOBAL_SCOPE, { moneda: "XYZ", minimo: 10, tramos: TRAMOS, autor: "E" })).toEqual({
    ok: false,
    error: { reason: "moneda-desconocida" },
  });
});

test("la auditoría lee la política en una línea", () => {
  const cifra = (v: number) => String(v);
  expect(resumenDeTarifa({ minimo: 10, tramos: TRAMOS }, cifra)).toBe(
    "Mínimo 10 · de 10 a 100: 3 · más de 100 hasta 500: 1 + 2 % · más de 500: 1,5 %",
  );
});
