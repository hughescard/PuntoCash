import { expect, test } from "@playwright/test";

import { contextoDe } from "@/features/network/caja-operativa";
import { operadorVigente } from "@/features/network/assignments";
import { operatorScope } from "@/features/network/scope";
import { jornadaAbiertaDeCaja } from "@/features/network/jornadas";
import { crearPuestoDePrueba } from "@/features/network/puesto-de-prueba";
import {
  alertasActivas,
  alertasParaElTrabajador,
  definirReglas,
  historialDeJornada,
  reglasVigentes,
  tituloDeAlerta,
} from "@/features/network/alertas";

function puesto() {
  const p = crearPuestoDePrueba({ fondos: { CUP: 500_000, USD: 520 }, conCambio: true, monedas: ["CUP", "USD"] });
  if (!p.ok) throw new Error(p.error);
  const scope = operatorScope(operadorVigente(p.value.sedeId)!);
  const c = contextoDe({ workerId: p.value.workerId, terminalId: p.value.terminalId });
  if (!c.ok) throw new Error(c.reason);
  const j = () => jornadaAbiertaDeCaja(p.value.registerId)!;
  return { p: p.value, scope, ctx: c.value, j };
}

test.describe("Alertas de caja", () => {
  test("una sede sin reglas no tiene alertas", () => {
    const { p, j } = puesto();
    expect(reglasVigentes(p.sedeId)).toEqual([]);
    expect(alertasActivas(j())).toEqual([]);
  });

  test("efectivo bajo y alto se encienden al cruzar el límite y el trabajador los lee sin cifras", () => {
    const { p, scope, j } = puesto();
    const r = definirReglas(scope, p.sedeId, [
      { currency: "USD", minimo: 600, maximo: null, billetesMinimos: {} },
      { currency: "CUP", minimo: null, maximo: 400_000, billetesMinimos: {} },
    ]);
    expect(r).toMatchObject({ ok: true, value: { cambiaron: true } });

    const activas = alertasActivas(j());
    expect(activas.map((a) => a.clave).sort()).toEqual(["efectivo-alto:CUP", "efectivo-bajo:USD"]);

    const paraElTrabajador = alertasParaElTrabajador(j());
    expect(paraElTrabajador.map((a) => a.texto).sort()).toEqual(["Efectivo alto en CUP", "Efectivo bajo en USD"]);
    expect(JSON.stringify(paraElTrabajador)).not.toMatch(/\d/);
  });

  test("pocos billetes de una denominación, con el título de billete o de moneda", () => {
    const { p, scope, j } = puesto();
    definirReglas(scope, p.sedeId, [{ currency: "USD", minimo: null, maximo: null, billetesMinimos: { "10000": 1000, "25": 1000 } }]);
    const textos = alertasActivas(j()).map(tituloDeAlerta).sort();
    expect(textos).toEqual(["Quedan pocas monedas de 0,25 USD", "Quedan pocos billetes de 100 USD"]);
  });

  test("al cambiar las reglas, la alerta se apaga y el historial conserva su tramo", () => {
    const { p, scope, j } = puesto();
    definirReglas(scope, p.sedeId, [{ currency: "USD", minimo: 600, maximo: null, billetesMinimos: {} }], new Date(Date.now() + 1_000));
    expect(alertasActivas(j(), new Date(Date.now() + 1_500))).toHaveLength(1);
    expect(historialDeJornada(j()).filter((t) => t.hasta === null)).toHaveLength(1);

    definirReglas(scope, p.sedeId, [{ currency: "USD", minimo: 100, maximo: null, billetesMinimos: {} }], new Date(Date.now() + 2_000));
    expect(alertasActivas(j(), new Date(Date.now() + 3_000))).toEqual([]);
    const tramos = historialDeJornada(j());
    expect(tramos).toHaveLength(1);
    expect(tramos[0]).toMatchObject({ clave: "efectivo-bajo:USD" });
    expect(tramos[0]!.hasta).not.toBeNull();
  });

  test("las reglas se validan: mínimo mayor que máximo, importes negativos y cantidades no enteras", () => {
    const { p, scope } = puesto();
    expect(definirReglas(scope, p.sedeId, [{ currency: "USD", minimo: 900, maximo: 100, billetesMinimos: {} }])).toMatchObject({ ok: false, reason: "minimo-mayor-que-maximo" });
    expect(definirReglas(scope, p.sedeId, [{ currency: "USD", minimo: -1, maximo: null, billetesMinimos: {} }])).toMatchObject({ ok: false, reason: "importe-invalido" });
    expect(definirReglas(scope, p.sedeId, [{ currency: "USD", minimo: null, maximo: null, billetesMinimos: { "10000": 1.5 } }])).toMatchObject({ ok: false, reason: "cantidad-invalida" });
    /* Lo que no cambia, no abre una versión nueva. */
    expect(definirReglas(scope, p.sedeId, [])).toMatchObject({ ok: true, value: { cambiaron: false } });
  });

  test("una sede ajena no se puede configurar", () => {
    const { scope } = puesto();
    expect(definirReglas(scope, "sede-que-no-existe", [])).toMatchObject({ ok: false, reason: "fuera-de-alcance" });
  });
});
