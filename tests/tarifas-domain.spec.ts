import { expect, test } from "@playwright/test";

import { GLOBAL_SCOPE, operatorScope } from "../src/features/network/scope";
import { denominacionesDe, retirarDenominacion } from "../src/features/network/denominaciones";
import {
  calcularTarifa,
  cotizarGiro,
  definirTarifaDeGiro,
  GUARDA_DE_TARIFAS,
  redondearAlAlza,
  redondeoQuePesa,
  retiroQueImpideLaTarifa,
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

test("la tarifa se redondea al alza, al múltiplo de la denominación más pequeña", () => {
  expect(redondearAlAlza(2.9124, 0.01)).toBe(2.92);
  expect(redondearAlAlza(2.92, 0.01)).toBe(2.92);
  expect(redondearAlAlza(29.2, 1)).toBe(30);
  expect(redondearAlAlza(23.6654, 5)).toBe(25);
  expect(redondearAlAlza(25, 5)).toBe(25);

  const usd = { tramos: TRAMOS };
  /* 1 + 2 % de 123,45 = 3,469 → 3,47. */
  expect(calcularTarifa(usd, 123.45, 0.01)).toEqual({ tramo: 1, fijo: 1, porcentaje: 2, exacta: 3.469, cobrada: 3.47 });
  /* Sin céntimos ni monedas: el mismo giro paga 5. */
  expect(calcularTarifa(usd, 123.45, 5).cobrada).toBe(5);
  /* 1,5 % de 1.000 = 15, que ya es múltiplo de 5. */
  expect(calcularTarifa(usd, 1000, 5).cobrada).toBe(15);
});

test("se avisa del tramo en el que el redondeo pesa más que el porcentaje", () => {
  const t = { minimo: 10, tramos: [T(null, 0, 3)] };
  expect(redondeoQuePesa(t, 0, 0.01)).toBeNull();
  expect(redondeoQuePesa(t, 0, 5)).toEqual({ giro: 10, exacta: 0.3, cobrada: 5 });
  /* Un tramo solo con fijo no tiene porcentaje que redondear. */
  expect(redondeoQuePesa({ minimo: 10, tramos: [T(null, 5, 0)] }, 0, 5)).toBeNull();
});

test("no se retira una denominación si la tarifa de giros deja de poder cobrarse", () => {
  /* Con solo billetes de 5 y 10, el fijo de 3 y el de 1 del dólar no se pagan. */
  expect(GUARDA_DE_TARIFAS.impide("USD", [5, 10])).toEqual(["el fijo del tramo 1", "el fijo del tramo 2"]);
  expect(GUARDA_DE_TARIFAS.impide("USD", [])).toHaveLength(1);
  expect(GUARDA_DE_TARIFAS.impide("USD", [0.01, 1])).toBeNull();
  /* Sin tarifa, nada lo impide. */
  expect(GUARDA_DE_TARIFAS.impide("GBP", [50])).toBeNull();

  /* El peso cubano: sin el billete de 1 el más pequeño es el de 3, y el mínimo de 1.000 no se paga. */
  expect(retiroQueImpideLaTarifa("CUP", 1)).toEqual(["el giro mínimo", "el límite del tramo 1", "el límite del tramo 2", "el fijo del tramo 2"]);
  expect(retirarDenominacion(GLOBAL_SCOPE, "CUP", 1, new Date(), GUARDA_DE_TARIFAS)).toEqual({ ok: false, reason: "la-usa-una-tarifa" });
  expect(denominacionesDe("CUP").some((d) => d.valor === 1)).toBe(true);
  /* Retirar una que no es la más pequeña no cambia nada. */
  expect(retiroQueImpideLaTarifa("CUP", 1000)).toBeNull();
});

test.describe("cotizar un giro", () => {
  const usd = { minimo: 10, tramos: TRAMOS };

  test("«que llegue un importe» suma la tarifa; «enviar un importe» la descuenta, y cuestan lo mismo", () => {
    const llegar = cotizarGiro(usd, 0.01, "llegar", 100);
    expect(llegar).toMatchObject({ ok: true, value: { giro: 100, total: 103, vuelto: 0 } });
    const enviar = cotizarGiro(usd, 0.01, "enviar", 103);
    expect(enviar).toMatchObject({ ok: true, value: { giro: 100, total: 103, vuelto: 0 } });
    /* 1 + 2 % redondeado al alza: con 104 llegan 100,98 y no sobra nada. */
    expect(cotizarGiro(usd, 0.01, "enviar", 104)).toMatchObject({ ok: true, value: { giro: 100.98, total: 104, vuelto: 0 } });
  });

  test("por debajo del mínimo dice cuánto tendría que entregar el cliente", () => {
    expect(cotizarGiro(usd, 0.01, "llegar", 5)).toEqual({ ok: false, reason: "bajo-minimo", minimo: 10, entregaMinima: 13 });
    expect(cotizarGiro(usd, 0.01, "enviar", 12)).toEqual({ ok: false, reason: "bajo-minimo", minimo: 10, entregaMinima: 13 });
    expect(cotizarGiro(usd, 0.01, "enviar", 13)).toMatchObject({ ok: true, value: { giro: 10 } });
  });

  test("un importe que no se puede pagar con lo que circula no se cotiza", () => {
    expect(cotizarGiro(usd, 0.01, "llegar", 10.005)).toEqual({ ok: false, reason: "no-pagable", menor: 0.01 });
    expect(cotizarGiro(usd, 0, "llegar", 0)).toEqual({ ok: false, reason: "importe-invalido" });
  });

  test("con una denominación grande, el giro y la tarifa van de 5 en 5", () => {
    const t = { minimo: 10, tramos: [T(null, 0, 3)] };
    expect(cotizarGiro(t, 5, "llegar", 30)).toMatchObject({ ok: true, value: { giro: 30, total: 35 } });
    expect(cotizarGiro(t, 5, "enviar", 45)).toMatchObject({ ok: true, value: { giro: 40, total: 45, vuelto: 0 } });
    expect(cotizarGiro(t, 5, "enviar", 37)).toEqual({ ok: false, reason: "no-pagable", menor: 5 });
  });

  test("el vuelto que deja un salto entre tramos dice cuánto costaría el giro siguiente", () => {
    const t = { minimo: 10, tramos: [T(100, 0, 1), T(null, 10, 0)] };
    expect(cotizarGiro(t, 0.01, "enviar", 105)).toMatchObject({
      ok: true,
      value: { giro: 100, total: 101, vuelto: 4, siguiente: { giro: 100.01, total: 110.01 } },
    });
  });

  test("si un tramo superior sale más barato, se envía el giro mayor", () => {
    const t = { minimo: 10, tramos: [T(100, 10, 0), T(null, 0, 1)] };
    /* Con 105: en el primer tramo llegarían 95; en el segundo, 103,96. */
    expect(cotizarGiro(t, 0.01, "enviar", 105)).toMatchObject({ ok: true, value: { giro: 103.96 } });
  });
});
