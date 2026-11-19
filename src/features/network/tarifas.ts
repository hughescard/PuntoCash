/**
 * TARIFAS DE SERVICIOS — lo que paga el cliente por un servicio, además del
 * importe de la operación (decisiones del 17 al 19/11/2026).
 *
 * Las fija y las maneja **solo PuntoCash**, para toda la red. El mercante no
 * interviene: no hay rango ni valor por sede, como sí lo hay en las tasas.
 *
 * De los servicios disponibles, solo **Enviar giro** lleva tarifa:
 *
 *   · **Cambio de moneda**: sin tarifa. El precio para el cliente es la tasa.
 *   · **Remesas**: sin tarifa. La cobra el proveedor que capta la remesa fuera.
 *   · **Giros**: la paga el remitente al enviar; cobrar un giro no lleva tarifa.
 *
 * Lo que se le cobra al operador, o lo que el operador gana, por cada servicio
 * es otra cosa: el dominio de **comisiones**, que vendrá después.
 *
 * ── La tarifa de un giro ─────────────────────────────────────────────────
 * Cada moneda en la que se envían giros tiene su **política**: un **giro
 * mínimo** y una **tabla de tramos** por importe. No hay giro máximo.
 *
 *   · Los tramos no dejan huecos ni se solapan. El primero empieza en el giro
 *     mínimo; el último no tiene límite superior. **El límite superior va
 *     incluido en su tramo**: con «hasta 100» y el siguiente, un giro de 100
 *     paga la del primero.
 *   · Cada tramo tiene un **fijo** y un **porcentaje**. Uno de los dos puede ser
 *     cero, no los dos: un tramo sin tarifa no tiene sentido.
 *   · El importe con el que se busca el tramo y sobre el que se aplica el
 *     porcentaje es **lo que recibe el beneficiario**.
 *   · **Sin política no hay giros en esa moneda**, como no existe un par sin
 *     tasa.
 *
 * Los importes (mínimo, límites y fijo) tienen que poder pagarse: son
 * múltiplos de la denominación más pequeña que circula de esa moneda. Un
 * cambio de política vale para los giros nuevos, al momento.
 */

import { almacen } from "./almacen";
import { monedaDelCatalogo } from "./currencies";
import { denominacionesDe } from "./denominaciones";
import { isMotivoValido } from "./sedes";
import { isGlobal, type Scope } from "./scope";
import {
  validarTarifaDeGiro,
  type TarifaDeGiro,
  type TarifaWriteResult,
  type TramoDeTarifa,
} from "./tarifas-reglas";

export * from "./tarifas-reglas";

/** El servicio del catálogo que lleva tarifa (Enviar giro es una de sus dos operaciones). */
export const SERVICIO_GIROS = "giros";

/* -------------------------------------------------------------------------
 * Qué servicio lleva tarifa
 * ---------------------------------------------------------------------- */

export type TarifaDeServicio =
  | { tipo: "sin-tarifa"; motivo: string }
  | { tipo: "por-tramos"; operacion: string; quienPaga: string; sinTarifa: string };

/**
 * Lo que dice cada servicio disponible sobre su tarifa. Es una regla del
 * producto, no un dato que se edite: cambiarla es cambiar cómo funciona el
 * servicio. Un servicio en construcción declarará la suya cuando se defina.
 */
export const TARIFA_POR_SERVICIO: Readonly<Record<string, TarifaDeServicio>> = {
  "cambio-moneda": { tipo: "sin-tarifa", motivo: "El precio para el cliente es la tasa." },
  remesas: { tipo: "sin-tarifa", motivo: "Cobrada en la captación." },
  giros: {
    tipo: "por-tramos",
    operacion: "Enviar giro",
    quienPaga: "El remitente, al enviar.",
    sinTarifa: "Cobrar giro",
  },
};

/* -------------------------------------------------------------------------
 * La política de giros de cada moneda
 * ---------------------------------------------------------------------- */

const T = (hasta: number | null, fijo: number, porcentaje: number): TramoDeTarifa => ({ hasta, fijo, porcentaje });

/**
 * Siembra: peso cubano, dólar y euro. Las demás monedas del catálogo no tienen
 * política, así que no se envían giros en ellas hasta que PuntoCash la defina.
 */
const politicas = almacen("tarifas-de-giro", () => {
  const m = new Map<string, TarifaDeGiro>();
  const sembrar = (moneda: string, minimo: number, tramos: TramoDeTarifa[], updatedAt: string) =>
    m.set(moneda, { moneda, minimo, tramos, updatedAt, updatedBy: "Elena Marrero Fonseca" });
  sembrar("CUP", 1_000, [T(10_000, 150, 0), T(50_000, 100, 1), T(null, 0, 0.8)], "2026-11-02T14:00:00.000Z");
  sembrar("USD", 10, [T(100, 3, 0), T(500, 1, 2), T(null, 0, 1.5)], "2026-11-02T14:05:00.000Z");
  sembrar("EUR", 10, [T(100, 3, 0), T(500, 1, 2), T(null, 0, 1.5)], "2026-11-02T14:10:00.000Z");
  return m;
});

const copiar = (t: TarifaDeGiro): TarifaDeGiro => ({ ...t, tramos: t.tramos.map((x) => ({ ...x })) });

/** La política de giros de una moneda, o `null` si no tiene: no se envían giros en ella. */
export function tarifaDeGiro(moneda: string): TarifaDeGiro | null {
  const t = politicas.get(moneda);
  return t ? copiar(t) : null;
}

/** Las monedas con política. */
export function tarifasDeGiro(): readonly TarifaDeGiro[] {
  return [...politicas.values()].map(copiar);
}

/** ¿Se pueden enviar giros en esta moneda? */
export function seEnvianGirosEn(moneda: string): boolean {
  return politicas.has(moneda);
}

/* -------------------------------------------------------------------------
 * Qué circula de cada moneda
 * ---------------------------------------------------------------------- */

/** La denominación más pequeña que circula hoy de una moneda, o `null` si no circula ninguna. */
export function menorDenominacion(moneda: string): number | null {
  const lista = denominacionesDe(moneda);
  return lista.length === 0 ? null : Math.min(...lista.map((d) => d.valor));
}

/* -------------------------------------------------------------------------
 * Escrituras de PuntoCash
 * ---------------------------------------------------------------------- */

/**
 * Define o cambia la política de giros de una moneda. Definir la primera abre
 * los giros en esa moneda; cambiarla mueve lo que paga cada cliente desde ese
 * momento, y eso se explica.
 */
export function definirTarifaDeGiro(
  scope: Scope,
  input: { moneda: string; minimo: number; tramos: readonly TramoDeTarifa[]; autor: string; motivo?: string },
  now = new Date(),
): TarifaWriteResult<{ tarifa: TarifaDeGiro; anterior: TarifaDeGiro | null }> {
  if (!isGlobal(scope)) return { ok: false, error: { reason: "alcance-insuficiente" } };
  const moneda = monedaDelCatalogo(input.moneda);
  if (!moneda) return { ok: false, error: { reason: "moneda-desconocida" } };
  const anterior = politicas.get(input.moneda) ?? null;
  if (moneda.retiradaEl && !anterior) return { ok: false, error: { reason: "moneda-retirada" } };
  const menor = menorDenominacion(input.moneda);
  if (menor === null) return { ok: false, error: { reason: "sin-denominaciones" } };
  const mal = validarTarifaDeGiro(menor, input.minimo, input.tramos);
  if (mal) return { ok: false, error: mal };
  if (anterior && !isMotivoValido(input.motivo ?? "")) return { ok: false, error: { reason: "motivo-requerido" } };

  const tarifa: TarifaDeGiro = {
    moneda: input.moneda,
    minimo: input.minimo,
    tramos: input.tramos.map((t) => ({ ...t })),
    updatedAt: now.toISOString(),
    updatedBy: input.autor,
  };
  politicas.set(input.moneda, tarifa);
  return { ok: true, value: { tarifa: copiar(tarifa), anterior: anterior ? copiar(anterior) : null } };
}

/** Retira la política de una moneda: desde ese momento no se envían giros en ella. */
export function retirarTarifaDeGiro(scope: Scope, moneda: string, motivo: string): TarifaWriteResult<TarifaDeGiro> {
  if (!isGlobal(scope)) return { ok: false, error: { reason: "alcance-insuficiente" } };
  const actual = politicas.get(moneda);
  if (!actual) return { ok: false, error: { reason: "sin-tarifa" } };
  if (!isMotivoValido(motivo)) return { ok: false, error: { reason: "motivo-requerido" } };
  politicas.delete(moneda);
  return { ok: true, value: copiar(actual) };
}
