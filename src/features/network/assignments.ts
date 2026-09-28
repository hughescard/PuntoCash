/**
 * LAS ASIGNACIONES Sede ↔ Operador, y el alcance que se deriva de ellas.
 *
 * Una sede tiene como máximo un operador vigente en cada momento (regla A2).
 * Revocar **cierra** el tramo con fecha y motivo; nunca lo borra ni lo edita.
 * Ese historial es tan inmutable como el de las operaciones [R9], y es lo que
 * permite responder, para cualquier fecha pasada, quién administraba una sede
 * entonces (RP-20) — la pregunta que aparece justo cuando hubo un problema.
 *
 * Aquí vive también `sedesEnAlcance`, que traduce una sesión en el conjunto de
 * sedes que puede ver: el alcance **se deriva**, no se elige (regla A1).
 */

import { findOperatorById } from "./operators";
import { findSedeById, isMotivoValido, SEDES } from "./sedes";
import { isGlobal, type Scope } from "./scope";

export interface Assignment {
  id: string;
  branchId: string;
  operatorId: string;
  startedAt: string;
  startedReason: string;
  /** Vacío mientras la asignación está vigente. */
  endedAt?: string;
  endedReason?: string;
}

const mutableAssignments: Assignment[] = [
  {
    id: "asg-1",
    branchId: "sede-vedado",
    operatorId: "op-antilla",
    startedAt: "2026-01-15T09:00:00.000Z",
    startedReason: "Entrega inicial de la sede al operador seleccionado",
  },
  {
    id: "asg-2",
    branchId: "sede-habana-vieja",
    operatorId: "op-antilla",
    startedAt: "2026-01-15T09:00:00.000Z",
    startedReason: "Entrega inicial de la sede al operador seleccionado",
  },
  {
    /* Tramo CERRADO: esta sede cambió de mercante. Las operaciones anteriores
       al 30 de junio deben mostrar a Atlántico, no a Caribe (FR-SA-OPS-2). */
    id: "asg-3",
    branchId: "sede-miramar",
    operatorId: "op-atlantico",
    startedAt: "2026-02-02T09:00:00.000Z",
    startedReason: "Entrega inicial de la sede al operador seleccionado",
    endedAt: "2026-06-30T17:00:00.000Z",
    endedReason: "Cese de actividad del operador a solicitud propia",
  },
  {
    id: "asg-4",
    branchId: "sede-miramar",
    operatorId: "op-caribe",
    startedAt: "2026-06-30T17:00:00.000Z",
    startedReason: "Traspaso de la administración tras el cese del operador anterior",
  },
  {
    id: "asg-5",
    branchId: "sede-matanzas",
    operatorId: "op-caribe",
    startedAt: "2026-03-10T09:00:00.000Z",
    startedReason: "Ampliación de la cartera del operador a la provincia de Matanzas",
  },
  {
    id: "asg-6",
    branchId: "sede-santa-clara",
    operatorId: "op-caribe",
    startedAt: "2026-03-10T09:00:00.000Z",
    startedReason: "Ampliación de la cartera del operador a la región central",
  },
  {
    id: "asg-7",
    branchId: "sede-camaguey",
    operatorId: "op-oriente",
    startedAt: "2026-05-04T09:00:00.000Z",
    startedReason: "Entrega inicial de la sede al operador seleccionado",
  },
  {
    id: "asg-8",
    branchId: "sede-holguin",
    operatorId: "op-oriente",
    startedAt: "2026-05-04T09:00:00.000Z",
    startedReason: "Entrega inicial de la sede al operador seleccionado",
  },
  /* sede-santiago no aparece: está sin operador asignado a propósito. */
];

export const ASSIGNMENTS: readonly Assignment[] = mutableAssignments;

export function asignacionVigente(branchId: string): Assignment | null {
  return mutableAssignments.find((a) => a.branchId === branchId && !a.endedAt) ?? null;
}

export function operadorVigente(branchId: string): string | null {
  return asignacionVigente(branchId)?.operatorId ?? null;
}

/**
 * Quién administraba una sede en una fecha dada. Es lo que da sentido al
 * historial: una operación de marzo debe mostrar el mercante de marzo, aunque
 * hoy la administre otro (RP-20, FR-SA-OPS-2, FR-SA-DOM-4).
 */
export function operadorVigenteEn(branchId: string, date: Date): string | null {
  const t = date.getTime();
  const tramo = mutableAssignments.find((a) => {
    if (a.branchId !== branchId) return false;
    if (new Date(a.startedAt).getTime() > t) return false;
    return a.endedAt === undefined || new Date(a.endedAt).getTime() > t;
  });
  return tramo?.operatorId ?? null;
}

export function historialDeSede(branchId: string): readonly Assignment[] {
  return mutableAssignments
    .filter((a) => a.branchId === branchId)
    .slice()
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export function historialDeOperador(operatorId: string): readonly Assignment[] {
  return mutableAssignments
    .filter((a) => a.operatorId === operatorId)
    .slice()
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

/** Sedes con asignación vigente a un operador. */
export function sedesDeOperador(operatorId: string): readonly string[] {
  return mutableAssignments.filter((a) => a.operatorId === operatorId && !a.endedAt).map((a) => a.branchId);
}

/**
 * El alcance de una sesión, derivado y no elegido (regla A1). El alcance
 * global es un valor, no la ausencia del parámetro: por eso esta función
 * nunca recibe `undefined` (FR-SA-DOM-2).
 */
export function sedesEnAlcance(scope: Scope): readonly string[] {
  if (isGlobal(scope)) return SEDES.map((sede) => sede.id);
  return sedesDeOperador(scope.operatorId);
}

export function estaEnAlcance(scope: Scope, branchId: string): boolean {
  return sedesEnAlcance(scope).includes(branchId);
}

/** Contexto que `registers.ts` y `workers.ts` necesitan sin importar este módulo. */
export const SCOPE_CONTEXT = {
  sedesEnAlcance: (operatorId: string): readonly string[] => sedesDeOperador(operatorId),
};

/* -------------------------------------------------------------------------
 * Escrituras — exclusivas de PuntoCash (regla A3)
 * ---------------------------------------------------------------------- */

export type AssignmentWriteDenial =
  | "alcance-insuficiente"
  | "sede-no-encontrada"
  | "sede-cerrada"
  | "operador-no-encontrado"
  | "operador-inactivo"
  | "ya-asignada"
  | "sin-asignacion-vigente"
  | "jornadas-abiertas"
  | "motivo-requerido";

export type AssignmentWriteResult<T> = { ok: true; value: T } | { ok: false; reason: AssignmentWriteDenial };

export function asignarSede(
  scope: Scope,
  input: { branchId: string; operatorId: string; reason: string; id: string },
  now = new Date(),
): AssignmentWriteResult<Assignment> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (!isMotivoValido(input.reason)) return { ok: false, reason: "motivo-requerido" };

  const sede = findSedeById(input.branchId);
  if (!sede) return { ok: false, reason: "sede-no-encontrada" };
  if (sede.status === "cerrada") return { ok: false, reason: "sede-cerrada" };

  const operator = findOperatorById(input.operatorId);
  if (!operator) return { ok: false, reason: "operador-no-encontrado" };
  if (operator.status !== "activo") return { ok: false, reason: "operador-inactivo" };

  /* Asignar una sede ya asignada exige revocar primero (regla A2, FR-SA-ASG-2). */
  if (asignacionVigente(input.branchId)) return { ok: false, reason: "ya-asignada" };

  const assignment: Assignment = {
    id: input.id,
    branchId: input.branchId,
    operatorId: input.operatorId,
    startedAt: now.toISOString(),
    startedReason: input.reason.trim(),
  };
  mutableAssignments.push(assignment);

  /* Una sede suspendida por no tener administrador vuelve a activarse al
     tenerlo; una suspendida por decisión de PuntoCash no (FR-SA-SEDE-10). */
  if (sede.status === "suspendida" && !sede.suspension) sede.status = "activa";

  return { ok: true, value: assignment };
}

/**
 * Revoca la asignación vigente. A diferencia de suspender, **no** se permite
 * con jornadas abiertas: no es una palanca de emergencia sino un cambio
 * ordenado de administrador, y traspasar una sucursal con la caja abierta
 * dejaría un descuadre sin dueño (FR-SA-ASG-5).
 *
 * Revocar **no** retira cajas, **no** desvincula equipos y **no** desactiva
 * trabajadores: el mercante entrante encuentra la sucursal montada
 * (FR-SA-ASG-7, FR-SA-ASG-8).
 */
export function revocarAsignacion(
  scope: Scope,
  branchId: string,
  reason: string,
  options: { hasOpenJornadas: boolean },
  now = new Date(),
): AssignmentWriteResult<Assignment> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (!isMotivoValido(reason)) return { ok: false, reason: "motivo-requerido" };

  const sede = findSedeById(branchId);
  if (!sede) return { ok: false, reason: "sede-no-encontrada" };
  if (options.hasOpenJornadas) return { ok: false, reason: "jornadas-abiertas" };

  const vigente = asignacionVigente(branchId);
  if (!vigente) return { ok: false, reason: "sin-asignacion-vigente" };

  vigente.endedAt = now.toISOString();
  vigente.endedReason = reason.trim();

  /* Sin administrador responsable no puede operarse (FR-SA-ASG-10). */
  if (sede.status === "activa") sede.status = "suspendida";

  return { ok: true, value: vigente };
}
