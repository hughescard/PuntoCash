/**
 * BILLETES — el efectivo contado por denominación (decisión del 9/11/2026).
 *
 * Por regulación, la caja no lleva solo cuánto hay de cada moneda: lleva
 * **cuántos billetes de cada denominación**. Este módulo es la aritmética de
 * eso, pura y sin estado, para que la usen igual el servidor (inventario,
 * conteos, operaciones) y las pantallas (formularios de conteo).
 *
 * ── Cómo se representa ───────────────────────────────────────────────────
 * Un desglose es un objeto `{ [valorEnCentimos]: cantidad }`. La clave es el
 * valor facial en **céntimos**, como texto, para no arrastrar errores de coma
 * flotante (un billete de 0,50 es la clave "50"; uno de 100, la "10000"). La
 * cantidad lleva **signo**: positiva si entra en la caja, negativa si sale.
 * Así un solo movimiento puede decir «entraron uno de 100 y uno de 50, salieron
 * uno de 20 y uno de 10» —un cambio de 120 con 30 de vuelto—, y su suma es el
 * importe neto del movimiento.
 */

export type Billetes = Readonly<Record<string, number>>;

export interface Denominacion {
  /** Valor facial, en unidades de la moneda (100 = un billete de 100). */
  valor: number;
  tipo: "billete" | "moneda";
}

export const aCentimos = (importe: number): number => Math.round(importe * 100);
export const clave = (valor: number): string => String(aCentimos(valor));
export const valorDeClave = (k: string): number => Number(k) / 100;

/** El importe que suma un desglose (con su signo). */
export function totalDe(b: Billetes | undefined): number {
  if (!b) return 0;
  let c = 0;
  for (const [k, n] of Object.entries(b)) c += Number(k) * n;
  return c / 100;
}

/** a + b, quitando las denominaciones que quedan a cero. */
export function sumar(a: Billetes | undefined, b: Billetes | undefined): Billetes {
  const out: Record<string, number> = { ...(a ?? {}) };
  for (const [k, n] of Object.entries(b ?? {})) {
    const v = (out[k] ?? 0) + n;
    if (v === 0) delete out[k];
    else out[k] = v;
  }
  return out;
}

export function negar(b: Billetes | undefined): Billetes {
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(b ?? {})) if (n !== 0) out[k] = -n;
  return out;
}

/** a − b. */
export function restar(a: Billetes | undefined, b: Billetes | undefined): Billetes {
  return sumar(a, negar(b));
}

/** Ninguna denominación con cantidad negativa: un inventario posible. */
export function esPosible(b: Billetes): boolean {
  return Object.values(b).every((n) => n >= 0);
}

/** Las denominaciones de un desglose, de mayor a menor, sin las que están a cero. */
export function lineas(b: Billetes | undefined): readonly { valor: number; cantidad: number }[] {
  return Object.entries(b ?? {})
    .filter(([, n]) => n !== 0)
    .map(([k, n]) => ({ valor: valorDeClave(k), cantidad: n }))
    .sort((x, y) => y.valor - x.valor);
}

/** Un desglose válido de entrada: claves de denominaciones existentes y cantidades enteras. */
export function desgloseValido(b: Billetes, denominaciones: readonly Denominacion[], { soloPositivo = false } = {}): boolean {
  const validas = new Set(denominaciones.map((d) => clave(d.valor)));
  return Object.entries(b).every(
    ([k, n]) => validas.has(k) && Number.isInteger(n) && (soloPositivo ? n >= 0 : true),
  );
}

/**
 * Desglosa un importe con los billetes más grandes posibles, sin mirar
 * existencias: es como suele pagar un cliente. Lo que no llega a la
 * denominación más pequeña queda en `resto`.
 */
export function desglosarDeMayorAMenor(
  importe: number,
  denominaciones: readonly Denominacion[],
): { billetes: Billetes; resto: number } {
  let restante = aCentimos(importe);
  const out: Record<string, number> = {};
  for (const d of [...denominaciones].sort((a, b) => b.valor - a.valor)) {
    const v = aCentimos(d.valor);
    const n = Math.floor(restante / v);
    if (n > 0) {
      out[String(v)] = n;
      restante -= n * v;
    }
  }
  return { billetes: out, resto: restante / 100 };
}

/**
 * Un fondo de caja con cambio: el valor se reparte entre todas las
 * denominaciones, menos en las pequeñas que en las grandes (∝ valor^0,75), de
 * modo que haya billetes de todas sin miles de billetes de 1. Solo para
 * sembrar la demostración.
 */
export function desglosarFondo(importe: number, denominaciones: readonly Denominacion[]): { billetes: Billetes; resto: number } {
  const ordenadas = [...denominaciones].sort((a, b) => b.valor - a.valor);
  if (ordenadas.length === 0) return { billetes: {}, resto: importe };
  const total = aCentimos(importe);
  const pesos = ordenadas.map((d) => Math.pow(d.valor, 0.75));
  const suma = pesos.reduce((x, y) => x + y, 0);
  const out: Record<string, number> = {};
  let asignado = 0;
  ordenadas.forEach((d, i) => {
    const v = aCentimos(d.valor);
    const n = Math.floor((total * pesos[i]!) / suma / v);
    if (n > 0) {
      out[String(v)] = n;
      asignado += n * v;
    }
  });
  const resto = desglosarDeMayorAMenor((total - asignado) / 100, ordenadas);
  return { billetes: sumar(out, resto.billetes), resto: resto.resto };
}

/**
 * Lo más que se puede entregar sin pasarse, de mayor a menor, con lo que hay.
 * Solo para sembrar movimientos antiguos que no cuadran con billetes; nunca
 * para una operación: una operación se paga exacta o no se paga.
 */
export function entregarHasta(importe: number, existencias: Billetes): Billetes {
  let restante = aCentimos(importe);
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(existencias).sort((a, b) => Number(b[0]) - Number(a[0]))) {
    const v = Number(k);
    const usar = Math.min(n, Math.floor(restante / v));
    if (usar > 0) {
      out[k] = usar;
      restante -= usar * v;
    }
  }
  return out;
}

/**
 * **Propuesta de entrega — versión de referencia.** Qué billetes sacar de la
 * caja para pagar `importe` exacto con lo que hay en `existencias`. Devuelve
 * `null` si no se puede.
 *
 * El objetivo aprobado (decisión del 9/11/2026) es que se hagan el máximo de
 * operaciones al día sin atascarse por falta de denominaciones: **reserva
 * según demanda**. `coste` da el precio de usar un billete de cada
 * denominación —más caro cuanto más va a hacer falta lo que queda de ella—; a
 * igual coste, menos billetes. Sin `coste`, todos valen 1 y gana la
 * combinación de menos billetes. Desarrollo sustituye esta búsqueda por la
 * suya; el contrato (entrada, salida y objetivo) es este.
 *
 * Búsqueda en profundidad de mayor a menor, probando para cada denominación
 * unas pocas cantidades alrededor del máximo posible y descartando ramas que
 * ya no pueden completar el importe con lo que queda.
 */
export function proponerEntrega(
  importe: number,
  existencias: Billetes,
  coste?: (valorEnCentimos: number) => number,
): Billetes | null {
  const objetivo = aCentimos(importe);
  if (objetivo === 0) return {};
  if (objetivo < 0) return null;
  const items = Object.entries(existencias)
    .map(([k, n]) => ({ v: Number(k), n }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.v - a.v);
  /* Lo que suman, desde cada posición hasta el final: para podar. */
  const cola: number[] = new Array(items.length + 1).fill(0);
  for (let i = items.length - 1; i >= 0; i--) cola[i] = cola[i + 1]! + items[i]!.v * items[i]!.n;
  if (cola[0]! < objetivo) return null;

  const peso = (v: number) => (coste ? coste(v) : 1);
  const VENTANA = 6;
  let mejor: { coste: number; billetes: number; elegidos: number[] } | null = null;
  const elegidos: number[] = new Array(items.length).fill(0);
  let pasos = 0;

  const buscar = (i: number, restante: number, costeAcum: number, billetesAcum: number) => {
    if (++pasos > 200_000) return;
    if (restante === 0) {
      if (!mejor || costeAcum < mejor.coste - 1e-9 || (Math.abs(costeAcum - mejor.coste) < 1e-9 && billetesAcum < mejor.billetes)) {
        mejor = { coste: costeAcum, billetes: billetesAcum, elegidos: [...elegidos] };
      }
      return;
    }
    if (i >= items.length || cola[i]! < restante) return;
    if (mejor && costeAcum >= mejor.coste + 1e-9) return;
    const { v, n } = items[i]!;
    const max = Math.min(n, Math.floor(restante / v));
    const min = Math.max(0, max - VENTANA);
    for (let k = max; k >= min; k--) {
      elegidos[i] = k;
      buscar(i + 1, restante - k * v, costeAcum + k * peso(v), billetesAcum + k);
    }
    elegidos[i] = 0;
  };
  buscar(0, objetivo, 0, 0);

  const encontrado = mejor as { elegidos: number[] } | null;
  if (!encontrado) return null;
  const out: Record<string, number> = {};
  encontrado.elegidos.forEach((k, idx) => {
    if (k > 0) out[String(items[idx]!.v)] = k;
  });
  return out;
}

/** «20», «0,25»: una denominación tal como está impresa. */
export function formatoDeDenominacion(valor: number): string {
  const conCentimos = Math.round(valor * 100) % 100 !== 0;
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: conCentimos ? 2 : 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(valor);
}
