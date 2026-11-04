import { expect, test } from "@playwright/test";

import { calcularReporteDeRed, CORTES_RED, COLUMNA_SEDES } from "../src/app/super-admin/(app)/reportes/calculo";
import { GLOBAL_SCOPE } from "../src/features/network/scope";
import { redEnAlcance } from "../src/features/network/scoped-reads";
import { registrarOperacionSembrada, type OperacionDeRed } from "../src/features/network/operaciones";

/**
 * El cálculo del reporte de la red: cada corte suma el total y cada operación
 * cuenta para el operador de su fecha, no para el de hoy.
 *
 * La prueba inyecta operaciones en Miramar —sede que cambió de mercante el
 * 30 de junio— en el proceso de la prueba; no toca el servidor de desarrollo.
 */

const AHORA = new Date("2026-11-02T15:00:00Z");

function sumaDe(filas: { volumen: Record<string, number> }[], moneda: string): number {
  return filas.reduce((s, f) => s + (f.volumen[moneda] ?? 0), 0);
}

test("cada corte suma el total, por defecto y a 30 días", () => {
  for (const params of [{}, { desde: "2026-10-03", hasta: "2026-11-02" }]) {
    const r = calcularReporteDeRed(params, AHORA);
    expect(r.total.operaciones).toBeGreaterThan(0);
    for (const corte of CORTES_RED) {
      const filas = r.cortes[corte];
      expect(filas.reduce((s, f) => s + f.operaciones, 0), `operaciones del corte ${corte}`).toBe(r.total.operaciones);
      for (const m of r.monedas) {
        expect(sumaDe(filas, m), `${m} en ${corte}`).toBeCloseTo(r.total.volumen[m] ?? 0, 6);
      }
    }
  }
});

test("la operación cuenta para el mercante de su fecha y Sedes cuenta las del periodo", () => {
  const red = redEnAlcance(GLOBAL_SCOPE);
  const plantilla = red.operaciones("sede-miramar")[0] as OperacionDeRed | undefined;
  expect(plantilla, "Miramar necesita al menos una operación sembrada como plantilla").toBeTruthy();

  const nueva = (codigo: string, fechaHora: string, amount: number): OperacionDeRed => ({
    ...plantilla!,
    codigo,
    fechaHora,
    servicio: "Cambio de moneda",
    estado: "Completada",
    amount: { kind: "single", money: { amount, currency: "USD" } },
  });
  const params = { desde: "2026-06-01", hasta: "2026-07-31" };
  const antes = calcularReporteDeRed(params, AHORA);
  const fila = (r: typeof antes, id: string) => r.cortes.operador.find((f) => f.key === id);

  registrarOperacionSembrada(nueva("TEST-RED-1", "2026-06-10T15:00:00Z", 100));
  registrarOperacionSembrada(nueva("TEST-RED-2", "2026-07-10T15:00:00Z", 40));
  const despues = calcularReporteDeRed(params, AHORA);

  const delta = (id: string) => (fila(despues, id)?.operaciones ?? 0) - (fila(antes, id)?.operaciones ?? 0);
  const deltaUsd = (id: string) => (fila(despues, id)?.volumen.USD ?? 0) - (fila(antes, id)?.volumen.USD ?? 0);
  /* Antes del 30 de junio Miramar era de Atlántico; después, de Caribe. */
  expect(delta("op-atlantico")).toBe(1);
  expect(deltaUsd("op-atlantico")).toBeCloseTo(100, 6);
  expect(delta("op-caribe")).toBe(1);
  expect(deltaUsd("op-caribe")).toBeCloseTo(40, 6);
  expect(despues.total.operaciones).toBe(antes.total.operaciones + 2);

  /* Los dos administraron Miramar en el periodo: la cuenta de sedes lo incluye. */
  expect(fila(despues, "op-atlantico")?.volumen[COLUMNA_SEDES]).toBeGreaterThanOrEqual(1);
  expect(fila(despues, "op-caribe")?.volumen[COLUMNA_SEDES]).toBeGreaterThanOrEqual(1);
  /* Nada quedó sin dueño. */
  expect(despues.cortes.operador.some((f) => f.key === "sin-operador")).toBe(false);
});

test("por sede administrada divide operaciones y volumen, y deja Sedes sin dividir", () => {
  const r = calcularReporteDeRed({}, AHORA);
  for (const f of r.operadorPorSede) {
    const total = r.cortes.operador.find((t) => t.key === f.key)!;
    const sedes = total.volumen[COLUMNA_SEDES]!;
    expect(sedes).toBeGreaterThan(0);
    expect(f.volumen[COLUMNA_SEDES]).toBe(sedes);
    expect(f.operaciones).toBeCloseTo(total.operaciones / sedes, 9);
    for (const m of r.monedas) expect(f.volumen[m] ?? 0).toBeCloseTo((total.volumen[m] ?? 0) / sedes, 6);
  }
});
