/**
 * DENOMINACIONES — qué billetes (y, si se usan, monedas metálicas) existen de
 * cada moneda del catálogo (decisión del 9/11/2026).
 *
 * Las define **PuntoCash (Super Admin) para toda la red**: ninguna sede elige.
 * La regulación obliga a que cada caja lleve cuántos billetes tiene de cada
 * denominación, y este catálogo es la lista de denominaciones posibles.
 *
 * Una denominación **retirada no se borra**: puede quedar en cajas que la
 * tienen y en movimientos pasados, y su valor tiene que poder mostrarse. Deja
 * de ofrecerse para registrar efectivo nuevo.
 *
 * Una moneda sin denominaciones vigentes no se puede contar ni operar en
 * efectivo.
 */

import { almacen } from "./almacen";
import { isGlobal, type Scope } from "./scope";
import type { Denominacion } from "@/features/caja/billetes";

export interface DenominacionDeCatalogo extends Denominacion {
  /** Cuándo se retiró, o `null` si se sigue aceptando. */
  retiradaEl: string | null;
}

const B = (...valores: number[]): DenominacionDeCatalogo[] => valores.map((valor) => ({ valor, tipo: "billete", retiradaEl: null }));
const M = (...valores: number[]): DenominacionDeCatalogo[] => valores.map((valor) => ({ valor, tipo: "moneda", retiradaEl: null }));

/** Las de arranque: billetes y monedas en circulación de cada moneda del catálogo. */
const SEMILLA: Record<string, DenominacionDeCatalogo[]> = {
  CUP: [...B(1, 3, 5, 10, 20, 50, 100, 200, 500, 1000)],
  USD: [...B(1, 2, 5, 10, 20, 50, 100), ...M(0.25, 0.1, 0.05, 0.01)],
  EUR: [...B(5, 10, 20, 50, 100, 200, 500), ...M(2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01)],
  GBP: [...B(5, 10, 20, 50), ...M(2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01)],
  CAD: [...B(5, 10, 20, 50, 100), ...M(2, 1, 0.25, 0.1, 0.05)],
  CHF: [...B(10, 20, 50, 100, 200, 1000), ...M(5, 2, 1, 0.5, 0.2, 0.1, 0.05)],
  MXN: [...B(20, 50, 100, 200, 500, 1000), ...M(10, 5, 2, 1, 0.5)],
  JPY: [...B(1000, 2000, 5000, 10000), ...M(500, 100, 50, 10, 5, 1)],
  AUD: [...B(5, 10, 20, 50, 100), ...M(2, 1, 0.5, 0.2, 0.1, 0.05)],
  COP: [...B(2000, 5000, 10000, 20000, 50000, 100000), ...M(1000, 500, 200, 100, 50)],
  CLP: [...B(1000, 2000, 5000, 10000, 20000), ...M(500, 100, 50, 10)],
};

const catalogo = almacen("denominaciones", () => {
  const m = new Map<string, DenominacionDeCatalogo[]>();
  for (const [code, lista] of Object.entries(SEMILLA)) m.set(code, lista.map((d) => ({ ...d })));
  return m;
});

const ordenar = (l: readonly DenominacionDeCatalogo[]) => [...l].sort((a, b) => b.valor - a.valor);

/** Todas, también las retiradas, de mayor a menor: para mostrar lo que ya hay. */
export function todasLasDenominaciones(code: string): readonly DenominacionDeCatalogo[] {
  return ordenar(catalogo.get(code) ?? []);
}

/** Las que se aceptan hoy, de mayor a menor: las que se pueden contar y entregar. */
export function denominacionesDe(code: string): readonly Denominacion[] {
  return todasLasDenominaciones(code)
    .filter((d) => !d.retiradaEl)
    .map(({ valor, tipo }) => ({ valor, tipo }));
}

export type DenominacionWriteDenial =
  | "alcance-insuficiente"
  | "valor-invalido"
  | "demasiados-decimales"
  | "ya-existe"
  | "esta-retirada"
  | "no-existe"
  | "ya-retirada"
  | "no-esta-retirada";

type Resultado<T> = { ok: true; value: T } | { ok: false; reason: DenominacionWriteDenial };

const buscar = (code: string, valor: number) => (catalogo.get(code) ?? []).find((d) => Math.round(d.valor * 100) === Math.round(valor * 100));

export function anadirDenominacion(
  scope: Scope,
  code: string,
  input: { valor: number; tipo: "billete" | "moneda" },
): Resultado<DenominacionDeCatalogo> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (!Number.isFinite(input.valor) || input.valor <= 0) return { ok: false, reason: "valor-invalido" };
  if (Math.abs(input.valor * 100 - Math.round(input.valor * 100)) > 1e-9) return { ok: false, reason: "demasiados-decimales" };
  const existente = buscar(code, input.valor);
  if (existente) return { ok: false, reason: existente.retiradaEl ? "esta-retirada" : "ya-existe" };
  const d: DenominacionDeCatalogo = { valor: input.valor, tipo: input.tipo, retiradaEl: null };
  catalogo.set(code, [...(catalogo.get(code) ?? []), d]);
  return { ok: true, value: d };
}

export function retirarDenominacion(scope: Scope, code: string, valor: number, now = new Date()): Resultado<DenominacionDeCatalogo> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  const d = buscar(code, valor);
  if (!d) return { ok: false, reason: "no-existe" };
  if (d.retiradaEl) return { ok: false, reason: "ya-retirada" };
  d.retiradaEl = now.toISOString();
  return { ok: true, value: d };
}

export function reincorporarDenominacion(scope: Scope, code: string, valor: number): Resultado<DenominacionDeCatalogo> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  const d = buscar(code, valor);
  if (!d) return { ok: false, reason: "no-existe" };
  if (!d.retiradaEl) return { ok: false, reason: "no-esta-retirada" };
  d.retiradaEl = null;
  return { ok: true, value: d };
}
