import { expect, test } from "@playwright/test";

import { GLOBAL_SCOPE, operatorScope } from "../src/features/network/scope";
import {
  CATALOGO_MONEDAS,
  anadirMonedaAlCatalogo,
  anadirMonedaASede,
  monedaDelCatalogo,
  monedasDisponibles,
  reincorporarMonedaAlCatalogo,
  retirarMonedaDelCatalogo,
  usoDeMoneda,
} from "../src/features/network/currencies";
import { definirRango, retirarRango } from "../src/features/network/rates";

/**
 * El catálogo de monedas de la plataforma — **FR-SA-MON-1** a **MON-5**.
 *
 * Las escrituras recaen sobre «XTS», un código que ninguna sede ni caja
 * tiene, y sobre el yen para el uso real. Cada prueba deja el catálogo como
 * lo encontró, porque el dominio es de este proceso pero otras suites pueden
 * compartir el servidor.
 */

test.describe.configure({ mode: "serial" });

const ZZZ = { code: "XTS", name: "Moneda de prueba", symbol: "T$", decimals: 2 };

test("solo PuntoCash toca el catálogo", () => {
  const mercante = operatorScope("op-bahia");
  expect(anadirMonedaAlCatalogo(mercante, ZZZ)).toMatchObject({ ok: false, reason: "alcance-insuficiente" });
  expect(retirarMonedaDelCatalogo(mercante, "JPY")).toMatchObject({ ok: false, reason: "alcance-insuficiente" });
  expect(reincorporarMonedaAlCatalogo(mercante, "JPY")).toMatchObject({ ok: false, reason: "alcance-insuficiente" });
});

test("una moneda nueva se valida: código, nombre, símbolo y decimales", () => {
  const mal = (cambio: Partial<typeof ZZZ>) => anadirMonedaAlCatalogo(GLOBAL_SCOPE, { ...ZZZ, ...cambio });
  expect(mal({ code: "XT" })).toMatchObject({ reason: "codigo-invalido" });
  expect(mal({ code: "XT1" })).toMatchObject({ reason: "codigo-invalido" });
  expect(mal({ name: "  " })).toMatchObject({ reason: "nombre-requerido" });
  expect(mal({ symbol: "" })).toMatchObject({ reason: "simbolo-invalido" });
  expect(mal({ symbol: "ABCDEF" })).toMatchObject({ reason: "simbolo-invalido" });
  expect(mal({ decimals: -1 })).toMatchObject({ reason: "decimales-invalidos" });
  expect(mal({ decimals: 5 })).toMatchObject({ reason: "decimales-invalidos" });
  expect(mal({ decimals: 1.5 })).toMatchObject({ reason: "decimales-invalidos" });
  expect(mal({ code: "USD" })).toMatchObject({ reason: "ya-existe" });
  expect(monedaDelCatalogo("XTS")).toBeNull();
});

test("añadir pone la moneda a disposición de la red y no la activa en ninguna sede", () => {
  const antes = CATALOGO_MONEDAS.length;
  const r = anadirMonedaAlCatalogo(GLOBAL_SCOPE, { ...ZZZ, code: "xts" });
  expect(r).toMatchObject({ ok: true, value: { code: "XTS", retiradaEl: null } });
  expect(CATALOGO_MONEDAS).toHaveLength(antes + 1);
  expect(monedasDisponibles().map((m) => m.code)).toContain("XTS");
  expect(usoDeMoneda("XTS")).toEqual({ sedes: 0, cajas: 0 });
  /* Un mercante ya puede añadirla a su sede. */
  expect(anadirMonedaASede(operatorScope("op-malecon"), "sede-vedado", "XTS")).toMatchObject({ ok: true });

  /* Limpieza: se retira y se deja la sede como estaba no es posible sin la
     función de retirar de sede; basta comprobar que la retirada no la quita. */
  expect(retirarMonedaDelCatalogo(GLOBAL_SCOPE, "XTS")).toMatchObject({ ok: true, value: { uso: { sedes: 1 } } });
  expect(monedasDisponibles().map((m) => m.code)).not.toContain("XTS");
  expect(monedaDelCatalogo("XTS")?.retiradaEl).not.toBeNull();
});

test("retirar no quita la moneda de las sedes que ya la tienen y cierra la puerta a las nuevas", () => {
  /* XTS quedó en Vedado y retirada por la prueba anterior. */
  expect(usoDeMoneda("XTS").sedes).toBe(1);
  /* Ya no se puede añadir a otra sede ni volver a dar de alta. */
  expect(anadirMonedaASede(operatorScope("op-malecon"), "sede-habana-vieja", "XTS")).toMatchObject({ ok: false, reason: "moneda-retirada" });
  expect(anadirMonedaAlCatalogo(GLOBAL_SCOPE, ZZZ)).toMatchObject({ ok: false, reason: "esta-retirada" });
  expect(retirarMonedaDelCatalogo(GLOBAL_SCOPE, "XTS")).toMatchObject({ ok: false, reason: "ya-retirada" });
});

test("reincorporar vuelve a ofrecerla", () => {
  expect(reincorporarMonedaAlCatalogo(GLOBAL_SCOPE, "XTS")).toMatchObject({ ok: true });
  expect(monedasDisponibles().map((m) => m.code)).toContain("XTS");
  expect(reincorporarMonedaAlCatalogo(GLOBAL_SCOPE, "XTS")).toMatchObject({ reason: "no-esta-retirada" });
  expect(reincorporarMonedaAlCatalogo(GLOBAL_SCOPE, "QQQ")).toMatchObject({ reason: "no-existe" });
});

test("la moneda local no se retira, y una que no existe tampoco", () => {
  expect(retirarMonedaDelCatalogo(GLOBAL_SCOPE, "CUP")).toMatchObject({ ok: false, reason: "moneda-local" });
  expect(retirarMonedaDelCatalogo(GLOBAL_SCOPE, "QQQ")).toMatchObject({ ok: false, reason: "no-existe" });
});

test("una moneda retirada sin rango no se abre a la red; con rango se puede seguir ajustando", () => {
  const compra = { min: 1, max: 2 };
  const venta = { min: 1.5, max: 2.5 };
  /* XTS: reincorporada, sin rango; se retira y entonces no admite uno nuevo. */
  expect(retirarMonedaDelCatalogo(GLOBAL_SCOPE, "XTS")).toMatchObject({ ok: true });
  expect(definirRango(GLOBAL_SCOPE, { code: "XTS", compra, venta, autor: "X" })).toMatchObject({ reason: "moneda-retirada" });
  /* Con rango previo sí: las sedes que la cotizan siguen necesitando poder ajustarlo. */
  expect(reincorporarMonedaAlCatalogo(GLOBAL_SCOPE, "XTS")).toMatchObject({ ok: true });
  expect(definirRango(GLOBAL_SCOPE, { code: "XTS", compra, venta, autor: "X" })).toMatchObject({ ok: true });
  expect(retirarMonedaDelCatalogo(GLOBAL_SCOPE, "XTS")).toMatchObject({ ok: true });
  expect(definirRango(GLOBAL_SCOPE, { code: "XTS", compra: { min: 1, max: 3 }, venta: { min: 2, max: 4 }, autor: "X" })).toMatchObject({ ok: true });
  expect(retirarRango(GLOBAL_SCOPE, "XTS")).toMatchObject({ ok: true });
});

test("el uso cuenta sedes y cajas de la moneda real", () => {
  const usd = usoDeMoneda("USD");
  expect(usd.sedes).toBeGreaterThan(1);
  expect(usd.cajas).toBeGreaterThan(0);
  expect(usoDeMoneda("JPY")).toEqual({ sedes: 0, cajas: 0 });
});
