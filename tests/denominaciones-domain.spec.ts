import { test, expect } from "@playwright/test";

import {
  desglosarDeMayorAMenor,
  desglosarFondo,
  esPosible,
  formatoDeDenominacion,
  proponerEntrega,
  restar,
  sumar,
  totalDe,
} from "@/features/caja/billetes";
import {
  anadirDenominacion,
  denominacionesDe,
  reincorporarDenominacion,
  retirarDenominacion,
  todasLasDenominaciones,
} from "@/features/network/denominaciones";
import { existenciasEnCajasAbiertas, inventarioParaMostrar, jornadasDeSede } from "@/features/network/jornadas";
import { GLOBAL_SCOPE } from "@/features/network/scope";
import { SEDES } from "@/features/network/sedes";

/**
 * La base de las denominaciones: el catálogo de billetes y monedas de cada
 * divisa, las cuentas con desgloses, y el inventario por denominación que
 * cada caja lleva desde la siembra.
 */

const USD = [100, 50, 20, 10, 5, 2, 1].map((valor) => ({ valor, tipo: "billete" as const }));

test.describe("Billetes", () => {
  test("suma, resta y total con céntimos sin errores de coma flotante", () => {
    const a = { "2000": 2, "25": 3 }; // 2 × 20 y 3 × 0,25
    const b = { "2000": -1, "10": 4 };
    expect(totalDe(a)).toBe(40.75);
    expect(sumar(a, b)).toEqual({ "2000": 1, "25": 3, "10": 4 });
    expect(restar(a, a)).toEqual({});
    expect(esPosible({ "2000": 1 })).toBe(true);
    expect(esPosible({ "2000": -1 })).toBe(false);
  });

  test("desglose de mayor a menor, con lo que no se puede formar aparte", () => {
    expect(desglosarDeMayorAMenor(187, USD)).toEqual({ billetes: { "10000": 1, "5000": 1, "2000": 1, "1000": 1, "500": 1, "200": 1 }, resto: 0 });
    expect(desglosarDeMayorAMenor(3.5, USD).resto).toBe(0.5);
  });

  test("un fondo sembrado tiene de todas, más valor en las grandes, y cuadra", () => {
    const { billetes, resto } = desglosarFondo(1000, USD);
    expect(resto).toBe(0);
    expect(totalDe(billetes)).toBe(1000);
    for (const d of USD) expect(billetes[String(d.valor * 100)] ?? 0).toBeGreaterThan(0);
    expect(billetes["100"]! * 1).toBeLessThan(billetes["10000"]! * 100);
  });

  test("la propuesta de entrega es exacta, con lo que hay, y si no se puede lo dice", () => {
    const hay = { "5000": 2, "2000": 1, "1000": 3 }; // 2 × 50, 1 × 20, 3 × 10
    const p = proponerEntrega(80, hay)!;
    expect(totalDe(p)).toBe(80);
    expect(esPosible(restar(hay, p))).toBe(true);
    /* Con 50 + 20 + 10 en vez de 50 + 10 + 10 + 10: menos billetes. */
    expect(p).toEqual({ "5000": 1, "2000": 1, "1000": 1 });
    expect(proponerEntrega(15, hay)).toBeNull();
    expect(proponerEntrega(200, hay)).toBeNull();
  });

  test("una denominación se escribe como está impresa", () => {
    expect(formatoDeDenominacion(20)).toBe("20");
    expect(formatoDeDenominacion(0.25)).toBe("0,25");
    expect(formatoDeDenominacion(100000)).toBe("100.000");
  });
});

test.describe("Catálogo de denominaciones", () => {
  test("solo PuntoCash lo cambia; se añade, se retira y se reincorpora", () => {
    const operador = { kind: "operator" as const, operatorId: "op-1" };
    expect(anadirDenominacion(operador, "GBP", { valor: 100, tipo: "billete" })).toEqual({ ok: false, reason: "alcance-insuficiente" });

    expect(anadirDenominacion(GLOBAL_SCOPE, "GBP", { valor: 0, tipo: "billete" })).toEqual({ ok: false, reason: "valor-invalido" });
    expect(anadirDenominacion(GLOBAL_SCOPE, "GBP", { valor: 1.005, tipo: "moneda" })).toEqual({ ok: false, reason: "demasiados-decimales" });
    expect(anadirDenominacion(GLOBAL_SCOPE, "GBP", { valor: 20, tipo: "billete" })).toEqual({ ok: false, reason: "ya-existe" });

    expect(anadirDenominacion(GLOBAL_SCOPE, "GBP", { valor: 100, tipo: "billete" }).ok).toBe(true);
    expect(denominacionesDe("GBP")[0]).toEqual({ valor: 100, tipo: "billete" });

    expect(retirarDenominacion(GLOBAL_SCOPE, "GBP", 100).ok).toBe(true);
    expect(denominacionesDe("GBP").some((d) => d.valor === 100)).toBe(false);
    expect(todasLasDenominaciones("GBP").find((d) => d.valor === 100)?.retiradaEl).not.toBeNull();
    expect(retirarDenominacion(GLOBAL_SCOPE, "GBP", 100)).toEqual({ ok: false, reason: "ya-retirada" });
    expect(anadirDenominacion(GLOBAL_SCOPE, "GBP", { valor: 100, tipo: "billete" })).toEqual({ ok: false, reason: "esta-retirada" });

    expect(reincorporarDenominacion(GLOBAL_SCOPE, "GBP", 100).ok).toBe(true);
    expect(reincorporarDenominacion(GLOBAL_SCOPE, "GBP", 100)).toEqual({ ok: false, reason: "no-esta-retirada" });
    expect(retirarDenominacion(GLOBAL_SCOPE, "GBP", 7)).toEqual({ ok: false, reason: "no-existe" });
  });

  test("una moneda sin denominaciones no tiene ninguna activa", () => {
    expect(denominacionesDe("XXX")).toEqual([]);
  });
});

test.describe("Inventario sembrado", () => {
  test("cada caja de la siembra tiene billetes de verdad, nunca negativos, y cuadra con su saldo", () => {
    /* Las de días anteriores: las de hoy las tocan otras pruebas de dominio con
       movimientos que aún no llevan billetes. */
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const jornadas = SEDES.flatMap((s) => jornadasDeSede(s.id)).filter((j) => new Date(j.openedAt) < hoy && j.estado === "cerrada");
    let filas = 0;
    let sinDesglosar = 0;
    for (const j of jornadas) {
      for (const r of inventarioParaMostrar(j)) {
        filas++;
        expect(esPosible(r.billetes), `${j.id} ${r.currency}`).toBe(true);
        expect(Math.round((totalDe(r.billetes) + r.sinDesglosar) * 100)).toBe(Math.round(r.saldo * 100));
        if (r.sinDesglosar !== 0) sinDesglosar++;
      }
    }
    expect(filas).toBeGreaterThan(30);
    /* Lo sembrado se desglosa casi todo; queda algún resto antiguo. */
    expect(sinDesglosar / filas).toBeLessThan(0.05);
  });

  test("se sabe cuántas unidades de cada denominación hay en las cajas abiertas", () => {
    const usd = existenciasEnCajasAbiertas("USD");
    expect(usd.get("10000")?.cajas ?? 0).toBeGreaterThan(0);
    expect(usd.get("10000")?.unidades ?? 0).toBeGreaterThan(0);
  });
});
