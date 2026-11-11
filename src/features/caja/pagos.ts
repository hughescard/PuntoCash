/**
 * PAGOS — cómo se paga un importe con los billetes que hay (bloque 4,
 * decisión del 9/11/2026). Aritmética pura y sin estado: la usa el servidor
 * para proponer y para validar, y los tests.
 *
 * Una operación se paga **exacta o no se paga**. Cuando la caja no tiene
 * billetes para un importe exacto, el orden es:
 *
 *  1. Redondear a la baja a la denominación más pequeña del catálogo: lo que
 *     no llega a ella no se puede dar y queda a favor de la casa.
 *  2. Dar lo máximo posible en la moneda y el resto en CUP.
 *  3. Si tampoco se puede, ofrecer al cliente (a) otro importe que sí se
 *     pague entero o (b) cobrar lo que se pueda con el resto a favor de la
 *     casa, con su permiso. Si no acepta ninguna, no se registra nada.
 */

import { aCentimos, proponerEntrega, totalDe, type Billetes, type Denominacion } from "./billetes";

/** Cuánto cuesta usar un billete de cada denominación (clave en céntimos); más caro cuanto más va a hacer falta. */
export type CosteDeBillete = (valorEnCentimos: number) => number;

function mcd(a: number, b: number): number {
  return b === 0 ? a : mcd(b, a % b);
}

/** La unidad en la que se pueden formar importes con estas existencias, en céntimos. */
function unidadDe(existencias: Billetes): number {
  let u = 0;
  for (const [k, n] of Object.entries(existencias)) if (n > 0) u = mcd(u, Number(k));
  return u;
}

/**
 * Qué importes (en céntimos, múltiplos de `unidad`) se pueden pagar exactos
 * con `existencias`, hasta `tope`. Mochila acotada con contador de usos por
 * denominación: O(tope/unidad × denominaciones).
 */
export function importesPagables(
  existencias: Billetes,
  tope: number,
): { unidad: number; alcanzable: Uint8Array; ultimo: Int32Array; claves: string[] } {
  const unidad = unidadDe(existencias);
  if (unidad === 0 || tope < 0) {
    return { unidad: 1, alcanzable: new Uint8Array(1).fill(1), ultimo: new Int32Array(1).fill(-1), claves: [] };
  }
  const T = Math.floor(tope / unidad);
  const alcanzable = new Uint8Array(T + 1);
  alcanzable[0] = 1;
  const ultimo = new Int32Array(T + 1).fill(-1);
  const usos = new Int32Array(T + 1);
  const claves: string[] = [];
  for (const [k, n] of Object.entries(existencias)) {
    if (n <= 0) continue;
    const idx = claves.push(k) - 1;
    const paso = Number(k) / unidad;
    usos.fill(0);
    for (let x = paso; x <= T; x += 1) {
      if (!alcanzable[x] && alcanzable[x - paso] && usos[x - paso]! < n) {
        alcanzable[x] = 1;
        usos[x] = usos[x - paso]! + 1;
        ultimo[x] = idx;
      }
    }
  }
  return { unidad, alcanzable, ultimo, claves };
}

/** Un desglose exacto de `importe` con esas existencias, o `null`: la reconstrucción de la mochila. */
export function desglosarExacto(importe: number, existencias: Billetes): Billetes | null {
  const c = aCentimos(importe);
  if (c === 0) return {};
  const { unidad, alcanzable, ultimo, claves } = importesPagables(existencias, c);
  if (c % unidad !== 0 || !alcanzable[c / unidad]) return null;
  const out: Record<string, number> = {};
  let x = c / unidad;
  while (x > 0) {
    const k = claves[ultimo[x]!]!;
    out[k] = (out[k] ?? 0) + 1;
    x -= Number(k) / unidad;
  }
  return out;
}

/** El mayor importe, sin pasarse de `importe`, que se puede pagar exacto con esas existencias. */
export function maximoPagable(importe: number, existencias: Billetes): number {
  const tope = aCentimos(importe);
  const { unidad, alcanzable } = importesPagables(existencias, tope);
  for (let x = alcanzable.length - 1; x >= 0; x -= 1) if (alcanzable[x]) return (x * unidad) / 100;
  return 0;
}

/** Si ese importe se puede pagar exacto con esas existencias. */
export function sePuedePagar(importe: number, existencias: Billetes): boolean {
  const c = aCentimos(importe);
  const { unidad, alcanzable } = importesPagables(existencias, c);
  return c % unidad === 0 && alcanzable[c / unidad] === 1;
}

/** La denominación más pequeña del catálogo, en unidades de la moneda. */
export function denominacionMinima(denominaciones: readonly Denominacion[]): number {
  return denominaciones.reduce((m, d) => Math.min(m, d.valor), Number.POSITIVE_INFINITY);
}

/** Redondea a la baja a un múltiplo de `paso` (en unidades de la moneda), sin errores de coma flotante. */
export function redondearALaBaja(importe: number, paso: number): number {
  if (!Number.isFinite(paso) || paso <= 0) return importe;
  const c = aCentimos(importe);
  const p = aCentimos(paso);
  return (Math.floor(c / p) * p) / 100;
}

/** Cómo se paga un importe en una moneda. */
export type PlanDeSalida =
  | { tipo: "completo"; billetes: Billetes; pagado: number }
  | {
      /** No hay billetes para el importe exacto: lo máximo que sí se paga y lo que queda sin pagar. */
      tipo: "parcial";
      billetes: Billetes;
      pagado: number;
      resto: number;
    };

/**
 * Plan de salida de `importe` con `existencias`. Siempre devuelve algo:
 * completo si se paga exacto; si no, lo máximo posible y el resto.
 */
export function planDeSalida(importe: number, existencias: Billetes, coste?: CosteDeBillete): PlanDeSalida {
  const exacto = proponerEntrega(importe, existencias, coste) ?? desglosarExacto(importe, existencias);
  if (exacto) return { tipo: "completo", billetes: exacto, pagado: importe };
  const maximo = maximoPagable(importe, existencias);
  const billetes = (maximo > 0 ? (proponerEntrega(maximo, existencias, coste) ?? desglosarExacto(maximo, existencias)) : {}) ?? {};
  return { tipo: "parcial", billetes, pagado: totalDe(billetes), resto: Math.round((importe - totalDe(billetes)) * 100) / 100 };
}
