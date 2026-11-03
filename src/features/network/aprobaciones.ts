/**
 * LAS SOLICITUDES DE APROBACIÓN — Aprobaciones (**FR-AD-APR-1** a
 * **FR-AD-APR-13**).
 *
 * Toda diferencia de efectivo que un trabajador registra queda pendiente del
 * visto bueno de la administración: un **ajuste de efectivo** durante la
 * jornada, una **diferencia de cierre** y una **diferencia de apertura** —un
 * faltante o un sobrante encontrado al abrir, y también una reposición o un
 * retiro de fondos, porque es dinero que entró o salió de la caja y alguien
 * tiene que confirmar que sabe por qué—. Sin umbral: toda diferencia, por
 * pequeña que sea. Una solicitud por moneda, porque cada una es un hecho con
 * su signo y su motivo.
 *
 * Resolverla **no toca nada de lo que el trabajador registró** (**[A6]**,
 * **[A7]**): el saldo ya quedó ajustado cuando él lo registró. Aprobar deja
 * constancia de que la administración lo asume; rechazar, de que no lo asume
 * y de que se revisará fuera del sistema. En los dos casos el motivo del
 * administrador se añade al del trabajador (**FR-AD-APR-8**).
 *
 * ── De dónde salen ────────────────────────────────────────────────────────
 * Se derivan de las jornadas sembradas al arrancar el servidor. Las de hace
 * más de tres días llegan ya resueltas por un administrador de la empresa; las
 * recientes, pendientes. El almacén vive en `globalThis`.
 */

import { estaEnAlcance, operadorVigente, operadorVigenteEn } from "./assignments";
import { jornadaPorId, jornadasDeSede, type Jornada } from "./jornadas";
import { adminUsersOf } from "./operators";
import { isGlobal, requireOperatorScope, type Scope, type ScopeDenial } from "./scope";
import { SEDES } from "./sedes";

export type TipoSolicitud = "ajuste" | "cierre" | "apertura";
export type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada";

export const TIPO_DE_SOLICITUD: Readonly<Record<TipoSolicitud, string>> = {
  ajuste: "Ajuste de efectivo",
  cierre: "Diferencia de cierre",
  apertura: "Diferencia de apertura",
};

export interface Solicitud {
  id: string;
  tipo: TipoSolicitud;
  sedeId: string;
  registerId: string;
  cajaNombre: string;
  jornadaId: string;
  workerId: string;
  workerName: string;
  /** Cuándo registró el trabajador el hecho. */
  fechaHora: string;
  currency: string;
  /**
   * Lo que había antes y lo que se contó: en un ajuste, el saldo registrado;
   * en un cierre, el esperado; en una apertura, lo dejado por el cierre
   * anterior. La diferencia es `contado − referencia`.
   */
  referencia: number;
  contado: number;
  diferencia: number;
  /** El motivo del trabajador, tal como lo declaró (**FR-AD-APR-6**). */
  motivo: string;
  observaciones?: string;
  /** El movimiento que lo registró, si lo hay (una apertura no deja movimiento). */
  movimientoId?: string;
  estado: EstadoSolicitud;
  /** `puntoCash`: la resolvió PuntoCash porque nadie de la sede podía (**FR-SA-APR**). */
  resolucion?: { at: string; por: string; motivo: string; puntoCash?: true };
}

export const MOTIVO_RESOLUCION_MIN = 10;

/* -------------------------------------------------------------------------
 * Siembra
 * ---------------------------------------------------------------------- */

function derivar(j: Jornada): Solicitud[] {
  const base = {
    sedeId: j.sedeId,
    registerId: j.registerId,
    cajaNombre: j.cajaNombre,
    jornadaId: j.id,
    workerId: j.workerId,
    workerName: j.workerName,
  };
  const out: Solicitud[] = [];

  for (const m of j.movimientos) {
    if (m.concepto === "Ajuste de efectivo" && m.saldoAntes !== undefined) {
      out.push({
        ...base,
        id: `SOL-${m.id}`,
        tipo: "ajuste",
        fechaHora: m.fechaHora,
        currency: m.currency,
        referencia: m.saldoAntes,
        contado: m.saldoDespues,
        diferencia: m.amount,
        motivo: m.motivo ?? "Otro",
        ...(m.observaciones ? { observaciones: m.observaciones } : {}),
        movimientoId: m.id,
        estado: "pendiente",
      });
    }
  }

  if (j.arqueo) {
    for (const a of j.arqueo.monedas.filter((x) => x.diferencia !== 0)) {
      const mov = j.movimientos.find((m) => m.concepto === "Ajuste de cierre" && m.currency === a.currency);
      out.push({
        ...base,
        id: `SOL-${j.id}-C-${a.currency}`,
        tipo: "cierre",
        fechaHora: j.arqueo.confirmadoAt,
        currency: a.currency,
        referencia: a.esperado,
        contado: a.contado,
        diferencia: a.diferencia,
        motivo: a.motivo ?? "Otro",
        ...(mov ? { movimientoId: mov.id } : {}),
        estado: "pendiente",
      });
    }
  }

  if (j.apertura.cierreAnterior) {
    for (const a of j.apertura.monedas.filter((x) => x.diferencia !== 0)) {
      out.push({
        ...base,
        id: `SOL-${j.id}-A-${a.currency}`,
        tipo: "apertura",
        fechaHora: j.openedAt,
        currency: a.currency,
        referencia: a.dejado ?? 0,
        contado: a.contado,
        diferencia: a.diferencia,
        motivo: a.motivo ?? "Otro",
        ...(a.observaciones ? { observaciones: a.observaciones } : {}),
        estado: "pendiente",
      });
    }
  }
  return out;
}

const MOTIVOS_APROBADA = [
  "Revisado con el trabajador; el conteo es correcto.",
  "Coincide con lo que se informó ese día a la administración.",
  "Diferencia menor, asumida por la sucursal.",
];

function sembrar(now: Date): Solicitud[] {
  const hace3dias = now.getTime() - 3 * 24 * 3600 * 1000;
  const todas = SEDES.flatMap((s) => jornadasDeSede(s.id).flatMap(derivar));
  let n = 0;
  for (const s of todas) {
    if (new Date(s.fechaHora).getTime() >= hace3dias) continue;
    /* Las de los últimos días de Atlántico en Miramar quedaron sin resolver al
       traspasar la sede: es el caso que resuelve PuntoCash (FR-SA-APR-1). */
    if (s.sedeId === "sede-miramar" && s.fechaHora >= "2026-06-26" && s.fechaHora < "2026-06-30T17:00:00.000Z") continue;
    /* Quien la resolvió es de la empresa que tenía la sede ese día. */
    const operador = operadorDeLaSolicitud(s);
    const admins = operador ? adminUsersOf(operador) : [];
    const por = admins[n % Math.max(admins.length, 1)]?.fullName ?? "Administración";
    n += 1;
    const resueltaAt = new Date(new Date(s.fechaHora).getTime() + 20 * 3600 * 1000).toISOString();
    /* Una de cada ocho resueltas se rechazó: el faltante no se asume. */
    if (n % 8 === 0 && s.diferencia < 0) {
      s.estado = "rechazada";
      s.resolucion = { at: resueltaAt, por, motivo: "No se justifica el faltante; se revisa con el trabajador y con contabilidad." };
    } else {
      s.estado = "aprobada";
      s.resolucion = { at: resueltaAt, por, motivo: MOTIVOS_APROBADA[n % MOTIVOS_APROBADA.length]! };
    }
  }
  return todas;
}

const ALMACEN = globalThis as typeof globalThis & { __puntocashSolicitudes?: Solicitud[] };
const solicitudes: Solicitud[] = (ALMACEN.__puntocashSolicitudes ??= sembrar(new Date()));

/* -------------------------------------------------------------------------
 * Lecturas
 * ---------------------------------------------------------------------- */

/** El operador que administraba la sede cuando se abrió la jornada de la solicitud. */
export function operadorDeLaSolicitud(s: Solicitud): string | null {
  const j = jornadaPorId(s.jornadaId);
  return operadorVigenteEn(s.sedeId, new Date(j?.openedAt ?? s.fechaHora));
}

/**
 * Pendiente y sin nadie en la sede que pueda resolverla: la empresa que tenía
 * la sede ese día ya no la tiene, y la que la tiene ahora no ve lo anterior
 * (**FR-AD-SCOPE-7**). Las resuelve PuntoCash (decisión del 3/11/2026).
 */
export function esHuerfana(s: Solicitud): boolean {
  return s.estado === "pendiente" && operadorDeLaSolicitud(s) !== operadorVigente(s.sedeId);
}

/** Las huérfanas pendientes y las que ya resolvió PuntoCash, de la más antigua a la más reciente. */
export function solicitudesDePuntoCash(): readonly Solicitud[] {
  return solicitudes
    .filter((s) => esHuerfana(s) || s.resolucion?.puntoCash)
    .slice()
    .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
}

export function solicitudesDeSede(sedeId: string): readonly Solicitud[] {
  return solicitudes.filter((s) => s.sedeId === sedeId);
}

export function solicitudPorId(id: string): Solicitud | null {
  return solicitudes.find((s) => s.id === id) ?? null;
}

export function solicitudesDeJornada(jornadaId: string): readonly Solicitud[] {
  return solicitudes.filter((s) => s.jornadaId === jornadaId);
}

/* -------------------------------------------------------------------------
 * Resolver — FR-AD-APR-7 a FR-AD-APR-12
 * ---------------------------------------------------------------------- */

export type ResolverDenial = ScopeDenial | "no-encontrada" | "ya-resuelta" | "motivo-corto" | "no-es-huerfana";

export function resolverSolicitud(
  scope: Scope,
  id: string,
  decision: "aprobada" | "rechazada",
  motivo: string,
  autor: string,
  now = new Date(),
): { ok: true; value: Solicitud } | { ok: false; reason: ResolverDenial } {
  const s = solicitudPorId(id);
  if (isGlobal(scope)) {
    /* PuntoCash solo resuelve las que no tienen quien las resuelva en la sede. */
    if (!s) return { ok: false, reason: "no-encontrada" };
    if (s.estado !== "pendiente") return { ok: false, reason: "ya-resuelta" };
    if (!esHuerfana(s)) return { ok: false, reason: "no-es-huerfana" };
  } else {
    const operator = requireOperatorScope(scope);
    if (!operator.ok) return { ok: false, reason: operator.reason };
    /* Solo las de su propia etapa en la sede (FR-AD-SCOPE-7). */
    if (!s || !estaEnAlcance(scope, s.sedeId) || operadorDeLaSolicitud(s) !== operator.value) {
      return { ok: false, reason: "no-encontrada" };
    }
    /* FR-AD-APR-11: si otro administrador la resolvió entretanto, no se pisa. */
    if (s.estado !== "pendiente") return { ok: false, reason: "ya-resuelta" };
  }
  if (motivo.trim().length < MOTIVO_RESOLUCION_MIN) return { ok: false, reason: "motivo-corto" };

  /* FR-AD-APR-8 y 9: se añade la resolución; el hecho del trabajador no cambia. */
  s.estado = decision;
  s.resolucion = {
    at: now.toISOString(),
    por: autor,
    motivo: motivo.trim(),
    ...(isGlobal(scope) ? { puntoCash: true as const } : {}),
  };
  return { ok: true, value: s };
}
