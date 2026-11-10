/**
 * LAS SOLICITUDES DE APROBACIÓN — Aprobaciones (**FR-AD-APR-1** a
 * **FR-AD-APR-13**).
 *
 * Toda diferencia de efectivo que un trabajador registra queda pendiente del
 * visto bueno de la administración (decisiones del 9/11/2026):
 *
 *   · **Diferencia de apertura** o **de cierre**: el total contado no es el
 *     esperado.
 *   · **Diferencia de composición**: el total cuadra pero los billetes no.
 *   · **Movimiento de fondos**: una reposición o un retiro, o un cambio de
 *     billetes, que hizo un supervisor. Confirmarlo es aprobarlo; si se
 *     rechaza, queda como incidencia.
 *
 * Sin umbral: toda diferencia, por pequeña que sea. Una solicitud por moneda,
 * porque cada una es un hecho con su signo y su motivo. «Ajustar efectivo» ya
 * no existe (decisión del 10/11/2026).
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

import type { Billetes } from "@/features/caja/billetes";
import { estaEnAlcance, operadorVigente, operadorVigenteEn } from "./assignments";
import { jornadaPorId, jornadasDeSede, MOTIVOS_DE_FONDOS, SUPERVISOR_CAMBIO_BILLETES, type Jornada } from "./jornadas";
import { adminUsersOf } from "./operators";
import { isGlobal, requireOperatorScope, type Scope, type ScopeDenial } from "./scope";
import { SEDES } from "./sedes";

export type TipoSolicitud = "cierre" | "apertura" | "composicion" | "fondos";
export type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada";

export const TIPO_DE_SOLICITUD: Readonly<Record<TipoSolicitud, string>> = {
  apertura: "Diferencia de apertura",
  cierre: "Diferencia de cierre",
  composicion: "Diferencia de composición",
  fondos: "Movimiento de fondos",
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
  /**
   * Los billetes de la diferencia, por denominación: lo contado menos lo que
   * había. En una de composición suman cero.
   */
  billetes?: Billetes;
  /** En un movimiento de fondos: el supervisor que entregó o recibió el efectivo. */
  supervisor?: string;
  /** En un movimiento de fondos: cuándo se registró. */
  origen?: "jornada" | "apertura" | "cierre";
  estado: EstadoSolicitud;
  /** `puntoCash`: la resolvió PuntoCash porque nadie de la sede podía (**FR-SA-APR**). */
  resolucion?: { at: string; por: string; motivo: string; puntoCash?: true };
}

export const MOTIVO_RESOLUCION_MIN = 10;

/* -------------------------------------------------------------------------
 * Siembra
 * ---------------------------------------------------------------------- */

export function derivar(j: Jornada): Solicitud[] {
  const base = {
    sedeId: j.sedeId,
    registerId: j.registerId,
    cajaNombre: j.cajaNombre,
    jornadaId: j.id,
    workerId: j.workerId,
    workerName: j.workerName,
  };
  const out: Solicitud[] = [];

  if (j.arqueo) {
    for (const a of j.arqueo.monedas) {
      const composicion = a.diferencia === 0 && a.composicion && Object.keys(a.composicion).length > 0;
      if (a.diferencia === 0 && !composicion) continue;
      const mov = j.movimientos.find(
        (m) => (m.concepto === "Ajuste de cierre" || m.concepto === "Ajuste de billetes al cerrar") && m.currency === a.currency,
      );
      const fondos = a.motivo !== undefined && MOTIVOS_DE_FONDOS.has(a.motivo);
      out.push({
        ...base,
        id: `SOL-${j.id}-C-${a.currency}`,
        tipo: composicion ? "composicion" : fondos ? "fondos" : "cierre",
        ...(fondos ? { origen: "cierre" as const, ...(a.supervisor ? { supervisor: a.supervisor } : {}) } : {}),
        fechaHora: j.arqueo.confirmadoAt,
        currency: a.currency,
        referencia: a.esperado,
        contado: a.contado,
        diferencia: a.diferencia,
        motivo: a.motivo ?? SIN_EXPLICAR,
        ...((a.observaciones ?? mov?.observaciones) ? { observaciones: a.observaciones ?? mov?.observaciones } : {}),
        ...(mov ? { movimientoId: mov.id } : {}),
        ...(composicion ? { billetes: a.composicion } : mov?.billetes ? { billetes: mov.billetes } : {}),
        estado: "pendiente",
      });
    }
  }

  if (j.apertura.cierreAnterior) {
    for (const a of j.apertura.monedas) {
      const composicion = a.diferencia === 0 && a.composicion && Object.keys(a.composicion).length > 0;
      if (a.diferencia === 0 && !composicion) continue;
      /* El supervisor que cambió billetes o que repuso o retiró: pasa a confirmación. */
      const fondos = a.motivo !== undefined && (MOTIVOS_DE_FONDOS.has(a.motivo) || a.motivo === SUPERVISOR_CAMBIO_BILLETES);
      out.push({
        ...base,
        id: `SOL-${j.id}-A-${a.currency}`,
        tipo: fondos ? "fondos" : composicion ? "composicion" : "apertura",
        ...(fondos ? { origen: "apertura" as const, supervisor: a.supervisor ?? supervisorDeLaSiembra(j) } : {}),
        fechaHora: j.openedAt,
        currency: a.currency,
        referencia: a.dejado ?? 0,
        contado: a.contado,
        diferencia: a.diferencia,
        motivo: a.motivo ?? "Otro",
        ...(a.observaciones ? { observaciones: a.observaciones } : {}),
        ...(composicion ? { billetes: a.composicion } : {}),
        estado: "pendiente",
      });
    }
  }
  return out;
}

/** Las reposiciones y retiros sembrados no guardaron quién los hizo: el primer administrador de la empresa de la sede. */
function supervisorDeLaSiembra(j: Jornada): string {
  const operador = operadorVigenteEn(j.sedeId, new Date(j.openedAt));
  return (operador ? adminUsersOf(operador)[0]?.fullName : undefined) ?? "Administración";
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

/**
 * Las solicitudes que nacen de lo que un trabajador acaba de registrar
 * (`caja-operativa.ts`). Nacen pendientes, sin umbral (**FR-AD-APR-1**).
 */
/**
 * Lo que figura como motivo de una diferencia de cierre que el trabajador no
 * llegó a explicar: la jornada se cierra al confirmar el conteo y los motivos
 * se piden justo después.
 */
export const SIN_EXPLICAR = "Sin explicar";

/**
 * El motivo que el trabajador da, justo después de cerrar, a una diferencia
 * que nació «Sin explicar». Si es una reposición o un retiro que hizo el
 * supervisor al cerrar, la solicitud pasa a ser un movimiento de fondos por
 * confirmar.
 */
export function explicarSolicitudDeCierre(
  jornadaId: string,
  currency: string,
  motivo: string,
  observaciones?: string,
  supervisor?: string,
): void {
  const s = solicitudes.find((x) => x.id === `SOL-${jornadaId}-C-${currency}`);
  if (!s || s.estado !== "pendiente") return;
  s.motivo = motivo;
  if (observaciones) s.observaciones = observaciones;
  if (MOTIVOS_DE_FONDOS.has(motivo)) {
    s.tipo = "fondos";
    s.origen = "cierre";
    if (supervisor) s.supervisor = supervisor;
  }
}

export function registrarSolicitudes(nuevas: readonly Solicitud[]): void {
  for (const s of nuevas) if (!solicitudes.some((x) => x.id === s.id)) solicitudes.push(s);
}

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
