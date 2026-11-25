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
import { estaEnAlcance } from "./assignments";
import { monedaDelCatalogo, monedasDeSede, sedeManejaMoneda } from "./currencies";
import { denominacionesDe } from "./denominaciones";
import { findSedeById, isMotivoValido, SEDES } from "./sedes";
import { isGlobal, requireOperatorScope, type Scope } from "./scope";
import type { GuardaDeRetiroDeDenominacion } from "./denominaciones";
import {
  TARIFAS_SEMBRADAS,
  impagablesCon,
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

/**
 * Siembra: peso cubano, dólar y euro (`TARIFAS_SEMBRADAS`, en las reglas para
 * que también la lea la siembra de jornadas). Las demás monedas del catálogo
 * no tienen política, así que no se envían giros en ellas hasta que PuntoCash
 * la defina.
 */
const politicas = almacen("tarifas-de-giro", () => {
  const m = new Map<string, TarifaDeGiro>();
  for (const [moneda, t] of Object.entries(TARIFAS_SEMBRADAS)) {
    m.set(moneda, { moneda, minimo: t.minimo, tramos: t.tramos.map((x) => ({ ...x })), updatedAt: t.updatedAt, updatedBy: "Elena Marrero Fonseca" });
  }
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
 * Lo que se le enseña al cliente
 * ---------------------------------------------------------------------- */

/** La tarifa de giros de una moneda, tal como la ve el cliente en el kiosco o en la pantalla. */
export interface TarifaPublica {
  moneda: string;
  nombre: string;
  minimo: number;
  tramos: readonly TramoDeTarifa[];
  /** Desde cuándo está en vigor. */
  desde: string;
}

/**
 * Las tarifas de giro que una sede anuncia: las monedas de su lista en las que
 * PuntoCash definió política, solo si la sede ofrece Giros y no está cerrada.
 * Es lo mismo que puede cobrar su caja, y por eso lo lee el kiosco y la
 * pantalla: una moneda sin política no se envía y no sale. Sede sin Giros o sin
 * ninguna política devuelve una lista vacía, y quien la pinta decide cómo
 * decirlo (o si no existe).
 */
export function tarifasPublicas(sedeId: string): readonly TarifaPublica[] {
  const sede = findSedeById(sedeId);
  if (!sede || sede.status === "cerrada" || !sede.services.includes(SERVICIO_GIROS)) return [];
  return monedasDeSede(sedeId).flatMap((m) => {
    const t = politicas.get(m.code);
    if (!t) return [];
    return [
      {
        moneda: m.code,
        nombre: monedaDelCatalogo(m.code)?.name ?? m.code,
        minimo: t.minimo,
        tramos: t.tramos.map((x) => ({ ...x })),
        desde: t.updatedAt,
      },
    ];
  });
}

/* -------------------------------------------------------------------------
 * Qué circula de cada moneda
 * ---------------------------------------------------------------------- */

/** La denominación más pequeña que circula hoy de una moneda, o `null` si no circula ninguna. */
export function menorDenominacion(moneda: string): number | null {
  const lista = denominacionesDe(moneda);
  return lista.length === 0 ? null : Math.min(...lista.map((d) => d.valor));
}

/**
 * Lo que impide retirar una denominación (decisión del 19/11): que la tarifa
 * de giros de esa moneda deje de poder cobrarse. Si con lo que queda ya no se
 * paga el mínimo, un límite o un fijo —o no queda ninguna denominación— se
 * impide, y PuntoCash corrige antes la tarifa. Se inyecta en
 * `retirarDenominacion`, como las guardas de una caja en `retirarCaja`:
 * `denominaciones.ts` no depende de este módulo, que ya depende de él.
 */
export const GUARDA_DE_TARIFAS: GuardaDeRetiroDeDenominacion = {
  impide(moneda, quedan) {
    const t = politicas.get(moneda);
    if (!t) return null;
    if (quedan.length === 0) return ["la tarifa entera: no quedaría ninguna denominación para cobrarla"];
    const fuera = impagablesCon(t, Math.min(...quedan));
    return fuera.length === 0 ? null : fuera;
  },
};

/** Lo mismo, para la pantalla: si retirar esa denominación dejaría la tarifa sin poder cobrarse, y qué. */
export function retiroQueImpideLaTarifa(moneda: string, valor: number): readonly string[] | null {
  const quedan = denominacionesDe(moneda)
    .map((d) => d.valor)
    .filter((v) => Math.round(v * 100) !== Math.round(valor * 100));
  return GUARDA_DE_TARIFAS.impide(moneda, quedan);
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
  avisarALasSedes(input.moneda, anterior ? "cambiada" : "definida", anterior, now);
  return { ok: true, value: { tarifa: copiar(tarifa), anterior: anterior ? copiar(anterior) : null } };
}

/** Retira la política de una moneda: desde ese momento no se envían giros en ella. */
export function retirarTarifaDeGiro(scope: Scope, moneda: string, motivo: string): TarifaWriteResult<TarifaDeGiro> {
  if (!isGlobal(scope)) return { ok: false, error: { reason: "alcance-insuficiente" } };
  const actual = politicas.get(moneda);
  if (!actual) return { ok: false, error: { reason: "sin-tarifa" } };
  if (!isMotivoValido(motivo)) return { ok: false, error: { reason: "motivo-requerido" } };
  politicas.delete(moneda);
  avisarALasSedes(moneda, "retirada", actual, new Date());
  return { ok: true, value: copiar(actual) };
}

/* -------------------------------------------------------------------------
 * Avisos a las sedes (decisión del 24/11/2026)
 * ---------------------------------------------------------------------- */

/**
 * Lo que PuntoCash hizo con la tarifa de una moneda, contado a cada sede que
 * envía giros en ella. El mercante no puede hacer nada con el cambio, pero
 * sus clientes lo van a notar, y es mejor que se entere antes que ellos.
 *
 *   · **definida**: la sede empieza a poder enviar giros en esa moneda.
 *   · **cambiada**: los giros que envíe desde ese momento pagan otra tarifa.
 *   · **retirada**: la sede deja de poder enviar giros en esa moneda.
 *
 * Funciona como la tasa que ajustó PuntoCash al mover un rango: el aviso
 * sigue en pie hasta que alguien de la empresa dice que se ha enterado, y
 * basta con uno para toda la sede.
 */
export type TipoDeAvisoDeTarifa = "definida" | "cambiada" | "retirada";

export interface AvisoDeTarifa {
  sedeId: string;
  moneda: string;
  tipo: TipoDeAvisoDeTarifa;
  /** Cuándo lo hizo PuntoCash (el último cambio, si hubo varios sin ver). */
  at: string;
  /**
   * La tarifa que la sede conocía antes del primer cambio sin ver: con dos
   * cambios seguidos, lo que interesa comparar es contra lo que se sabía, no
   * contra el paso intermedio. `null` si no había ninguna.
   */
  anterior: TarifaDeGiro | null;
}

const avisos = almacen("avisos-de-tarifa", () => new Map<string, AvisoDeTarifa>());
const claveDeAviso = (sedeId: string, moneda: string) => `${sedeId}|${moneda}`;

/** Las sedes a las que les toca: abiertas, con Giros y con esa moneda en su lista. */
function sedesQueEnvianEn(moneda: string): readonly string[] {
  return SEDES.filter((s) => s.status !== "cerrada" && s.services.includes(SERVICIO_GIROS) && sedeManejaMoneda(s.id, moneda)).map(
    (s) => s.id,
  );
}

/** Las monedas con aviso en esa sede que todavía le dicen algo: las sigue manejando y sigue con Giros. */
function monedasConAvisoVigente(sedeId: string): readonly string[] {
  const sede = findSedeById(sedeId);
  if (!sede || sede.status === "cerrada" || !sede.services.includes(SERVICIO_GIROS)) return [];
  return [...avisos.values()].filter((a) => a.sedeId === sedeId && sedeManejaMoneda(sedeId, a.moneda)).map((a) => a.moneda);
}

function avisarALasSedes(moneda: string, tipo: TipoDeAvisoDeTarifa, anterior: TarifaDeGiro | null, now: Date): void {
  for (const sedeId of sedesQueEnvianEn(moneda)) {
    const clave = claveDeAviso(sedeId, moneda);
    const previo = avisos.get(clave);
    const conocida = previo ? previo.anterior : anterior;
    const ahora = tipo === "retirada" ? null : politicas.get(moneda) ?? null;
    /* Si al final la sede queda como la conocía (se guardó sin cambiar nada,
       se deshizo un cambio, o se definió y se retiró sin que nadie lo viera),
       no hay nada que contar. */
    if (mismaTarifa(conocida, ahora)) {
      avisos.delete(clave);
      continue;
    }
    const tipoFinal: TipoDeAvisoDeTarifa = ahora === null ? "retirada" : conocida === null ? "definida" : "cambiada";
    avisos.set(clave, { sedeId, moneda, tipo: tipoFinal, at: now.toISOString(), anterior: conocida ? copiar(conocida) : null });
  }
}

function mismaTarifa(a: TarifaDeGiro | null, b: TarifaDeGiro | null): boolean {
  if (!a || !b) return a === b;
  return (
    a.minimo === b.minimo &&
    a.tramos.length === b.tramos.length &&
    a.tramos.every((t, i) => {
      const o = b.tramos[i]!;
      return t.hasta === o.hasta && t.fijo === o.fijo && t.porcentaje === o.porcentaje;
    })
  );
}

/**
 * Los avisos sin ver de una sede, el más reciente primero. Si la sede dejó de
 * enviar giros en esa moneda (la quitó de su lista, o perdió Giros), el aviso
 * ya no le dice nada y no se enseña.
 */
export function avisosDeTarifa(sedeId: string): readonly AvisoDeTarifa[] {
  const sigue = new Set(monedasConAvisoVigente(sedeId));
  return [...avisos.values()]
    .filter((a) => a.sedeId === sedeId && sigue.has(a.moneda))
    .sort((x, y) => y.at.localeCompare(x.at))
    .map((a) => ({ ...a, anterior: a.anterior ? copiar(a.anterior) : null }));
}

export type AvisoDeTarifaDenial = "alcance-global-prohibido" | "fuera-de-alcance" | "sede-no-encontrada";

/**
 * Alguien de la empresa se ha enterado del aviso de una moneda en sus sedes.
 * Lo da por visto en todas las que nombra (la pantalla agrupa por moneda); las
 * que no son de su alcance se rechazan enteras. Ver un aviso que ya no está no
 * es un error: otro de la empresa se adelantó.
 */
export function darPorVistoAvisoDeTarifa(
  scope: Scope,
  sedeIds: readonly string[],
  moneda: string,
): { ok: true; vistos: number } | { ok: false; reason: AvisoDeTarifaDenial } {
  const operador = requireOperatorScope(scope);
  if (!operador.ok) return { ok: false, reason: "alcance-global-prohibido" };
  for (const id of sedeIds) {
    if (!findSedeById(id)) return { ok: false, reason: "sede-no-encontrada" };
    if (!estaEnAlcance(scope, id)) return { ok: false, reason: "fuera-de-alcance" };
  }
  let vistos = 0;
  for (const id of sedeIds) if (avisos.delete(claveDeAviso(id, moneda))) vistos++;
  return { ok: true, vistos };
}
