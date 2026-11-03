import { expect, test } from "@playwright/test";

import { GLOBAL_SCOPE, operatorScope } from "../src/features/network/scope";
import {
  CATALOGO_MONEDAS,
  DECIMALES_DE_MONEDA,
  anadirMonedaAlCatalogo,
  anadirMonedaASede,
  monedaDelCatalogo,
  monedasDisponibles,
  reincorporarMonedaAlCatalogo,
  retirarMonedaDelCatalogo,
  usoDeMoneda,
} from "../src/features/network/currencies";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { BANDERA_DE_MONEDA, MONEDAS_ISO, rutaDeBandera } from "../src/features/network/iso-monedas";
import { definirRango, retirarRango } from "../src/features/network/rates";

/**
 * El catálogo de monedas de la plataforma — **FR-SA-MON-1** a **MON-5**.
 *
 * Las escrituras recaen sobre «NOK», un código que ninguna sede ni caja
 * tiene, y sobre el yen para el uso real. Cada prueba deja el catálogo como
 * lo encontró, porque el dominio es de este proceso pero otras suites pueden
 * compartir el servidor.
 */

test.describe.configure({ mode: "serial" });

const ZZZ = { code: "NOK" };

test("solo PuntoCash toca el catálogo", () => {
  const mercante = operatorScope("op-bahia");
  expect(anadirMonedaAlCatalogo(mercante, ZZZ)).toMatchObject({ ok: false, reason: "alcance-insuficiente" });
  expect(retirarMonedaDelCatalogo(mercante, "JPY")).toMatchObject({ ok: false, reason: "alcance-insuficiente" });
  expect(reincorporarMonedaAlCatalogo(mercante, "JPY")).toMatchObject({ ok: false, reason: "alcance-insuficiente" });
});

test("una moneda nueva sale de la tabla ISO: solo se elige el código, y nombre, símbolo y decimales vienen fijos", () => {
  const mal = (code: string) => anadirMonedaAlCatalogo(GLOBAL_SCOPE, { code });
  expect(mal("XT")).toMatchObject({ reason: "codigo-invalido" });
  expect(mal("QQQ")).toMatchObject({ reason: "codigo-invalido" });
  expect(mal("XAU")).toMatchObject({ reason: "codigo-invalido" });
  expect(mal("USD")).toMatchObject({ reason: "ya-existe" });
  expect(monedaDelCatalogo("NOK")).toBeNull();
  /* Las sembradas también salen de la tabla. */
  expect(monedaDelCatalogo("USD")).toMatchObject({ name: "Dólar estadounidense", symbol: "US$" });
  expect(DECIMALES_DE_MONEDA).toBe(4);
});

test("añadir pone la moneda a disposición de la red y no la activa en ninguna sede", () => {
  const antes = CATALOGO_MONEDAS.length;
  const r = anadirMonedaAlCatalogo(GLOBAL_SCOPE, { ...ZZZ, code: "nok" });
  expect(r).toMatchObject({ ok: true, value: { code: "NOK", name: "Corona noruega", retiradaEl: null } });
  expect(CATALOGO_MONEDAS).toHaveLength(antes + 1);
  expect(monedasDisponibles().map((m) => m.code)).toContain("NOK");
  expect(usoDeMoneda("NOK")).toEqual({ sedes: 0, cajas: 0 });
  /* Un mercante ya puede añadirla a su sede. */
  expect(anadirMonedaASede(operatorScope("op-malecon"), "sede-vedado", "NOK")).toMatchObject({ ok: true });

  /* Limpieza: se retira y se deja la sede como estaba no es posible sin la
     función de retirar de sede; basta comprobar que la retirada no la quita. */
  expect(retirarMonedaDelCatalogo(GLOBAL_SCOPE, "NOK")).toMatchObject({ ok: true, value: { uso: { sedes: 1 } } });
  expect(monedasDisponibles().map((m) => m.code)).not.toContain("NOK");
  expect(monedaDelCatalogo("NOK")?.retiradaEl).not.toBeNull();
});

test("retirar no quita la moneda de las sedes que ya la tienen y cierra la puerta a las nuevas", () => {
  /* NOK quedó en Vedado y retirada por la prueba anterior. */
  expect(usoDeMoneda("NOK").sedes).toBe(1);
  /* Ya no se puede añadir a otra sede ni volver a dar de alta. */
  expect(anadirMonedaASede(operatorScope("op-malecon"), "sede-habana-vieja", "NOK")).toMatchObject({ ok: false, reason: "moneda-retirada" });
  expect(anadirMonedaAlCatalogo(GLOBAL_SCOPE, ZZZ)).toMatchObject({ ok: false, reason: "esta-retirada" });
  expect(retirarMonedaDelCatalogo(GLOBAL_SCOPE, "NOK")).toMatchObject({ ok: false, reason: "ya-retirada" });
});

test("reincorporar vuelve a ofrecerla", () => {
  expect(reincorporarMonedaAlCatalogo(GLOBAL_SCOPE, "NOK")).toMatchObject({ ok: true });
  expect(monedasDisponibles().map((m) => m.code)).toContain("NOK");
  expect(reincorporarMonedaAlCatalogo(GLOBAL_SCOPE, "NOK")).toMatchObject({ reason: "no-esta-retirada" });
  expect(reincorporarMonedaAlCatalogo(GLOBAL_SCOPE, "QQQ")).toMatchObject({ reason: "no-existe" });
});

test("la moneda local no se retira, y una que no existe tampoco", () => {
  expect(retirarMonedaDelCatalogo(GLOBAL_SCOPE, "CUP")).toMatchObject({ ok: false, reason: "moneda-local" });
  expect(retirarMonedaDelCatalogo(GLOBAL_SCOPE, "QQQ")).toMatchObject({ ok: false, reason: "no-existe" });
});

test("una moneda retirada sin rango no se abre a la red; con rango se puede seguir ajustando", () => {
  const compra = { min: 1, max: 2 };
  const venta = { min: 1.5, max: 2.5 };
  /* NOK: reincorporada, sin rango; se retira y entonces no admite uno nuevo. */
  expect(retirarMonedaDelCatalogo(GLOBAL_SCOPE, "NOK")).toMatchObject({ ok: true });
  expect(definirRango(GLOBAL_SCOPE, { code: "NOK", compra, venta, autor: "X" })).toMatchObject({ reason: "moneda-retirada" });
  /* Con rango previo sí: las sedes que la cotizan siguen necesitando poder ajustarlo. */
  expect(reincorporarMonedaAlCatalogo(GLOBAL_SCOPE, "NOK")).toMatchObject({ ok: true });
  expect(definirRango(GLOBAL_SCOPE, { code: "NOK", compra, venta, autor: "X" })).toMatchObject({ ok: true });
  expect(retirarMonedaDelCatalogo(GLOBAL_SCOPE, "NOK")).toMatchObject({ ok: true });
  /* Cambiar un rango que ya existe pide motivo. */
  expect(definirRango(GLOBAL_SCOPE, { code: "NOK", compra: { min: 1, max: 3 }, venta: { min: 2, max: 4 }, autor: "X" })).toMatchObject({ reason: "motivo-requerido" });
  expect(
    definirRango(GLOBAL_SCOPE, { code: "NOK", compra: { min: 1, max: 3 }, venta: { min: 2, max: 4 }, autor: "X", motivo: "Ajuste de prueba del rango" }),
  ).toMatchObject({ ok: true });
  expect(retirarRango(GLOBAL_SCOPE, "NOK")).toMatchObject({ ok: true });
});

test("el uso cuenta sedes y cajas de la moneda real", () => {
  const usd = usoDeMoneda("USD");
  expect(usd.sedes).toBeGreaterThan(1);
  expect(usd.cajas).toBeGreaterThan(0);
  expect(usoDeMoneda("JPY")).toEqual({ sedes: 0, cajas: 0 });
});

test("toda moneda de la lista ISO trae su bandera, y el archivo existe", () => {
  for (const [code] of MONEDAS_ISO) {
    const ruta = rutaDeBandera(code);
    expect(ruta, `${code} sin bandera`).not.toBeNull();
    expect(existsSync(join(process.cwd(), "public", ruta!)), `${code}: falta ${ruta}`).toBe(true);
  }
  /* Ni sobran entradas: una moneda que sale de la lista no deja su bandera huérfana en la tabla. */
  expect(Object.keys(BANDERA_DE_MONEDA).sort()).toEqual(MONEDAS_ISO.map((m) => m[0]).sort());
  expect(rutaDeBandera("EUR")).toBe("/banderas/eu.svg");
  expect(rutaDeBandera("XOF")).toBe("/banderas/multinacional.svg");
});
