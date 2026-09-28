/**
 * LAS CAJAS de cada sede — el enlace Caja → Sede que el dominio no tenía.
 *
 * Hasta ahora las cajas se generaban al vuelo (`registersOf` devolvía cuatro
 * por sede, siempre iguales) porque nadie las administraba. Con la capa de
 * administración pasan a ser datos: **las crea y las retira el mercante**
 * (regla A4, FR-AD-CAJA-*), no PuntoCash, que solo las ve (regla A14).
 *
 * Una caja es además el objeto al que se vincula un equipo
 * (`@/features/devices/device-link`), así que su ciclo de vida y el del equipo
 * son independientes: retirar una caja exige desvincular antes, y desvincular
 * un equipo no retira su caja ni cierra su jornada (regla A11).
 *
 * Los identificadores se conservan con el formato que ya generaba
 * `registersOf` — `<sedeId>:caja-NN` — para que un equipo ya vinculado en el
 * navegador de la demo siga resolviendo su caja después de este cambio.
 */

import { findSedeById, isMotivoValido } from "./sedes";
import { requireOperatorScope, type Scope } from "./scope";

export type RegisterStatus = "activa" | "retirada";

/**
 * `id` y `name` conservan la forma que Worker y el simulador ya leen; el resto
 * es nuevo y solo lo consume la capa de administración.
 */
export interface Register {
  id: string;
  branchId: string;
  /** "Caja 03" — lo que se ve en la cabecera de Worker y en cada comprobante. */
  name: string;
  status: RegisterStatus;
  createdAt: string;
  retiredAt?: string;
  retiredReason?: string;
}

/**
 * Cajas con las que arranca cada sede en la demo.
 *
 * Todas las sedes ya entregadas tienen al menos tres, porque el simulador de
 * vinculación solo habilita la **Caja 03** —la única con datos operativos
 * simulados (FR-DEV-9)— y dejar una sede sin ella la volvería imposible de
 * vincular mientras `/admin/equipos` no exista. El número varía entre sedes
 * para que los listados de administración no se vean uniformes.
 *
 * `sede-santiago` es la excepción deliberada: recién entrada en la red, sin
 * operador y sin poner en marcha. Es el caso que el Inicio de las dos consolas
 * debe destacar (FR-AD-CAJA-3, FR-SA-HOME-3).
 */
const SEED_REGISTERS_PER_BRANCH: Readonly<Record<string, number>> = {
  "sede-vedado": 4,
  "sede-habana-vieja": 4,
  "sede-miramar": 3,
  "sede-matanzas": 4,
  "sede-santa-clara": 3,
  "sede-camaguey": 4,
  "sede-holguin": 3,
  "sede-santiago": 0,
};

function seed(): Register[] {
  const out: Register[] = [];
  for (const [branchId, count] of Object.entries(SEED_REGISTERS_PER_BRANCH)) {
    for (let i = 0; i < count; i += 1) {
      const number = String(i + 1).padStart(2, "0");
      out.push({
        id: `${branchId}:caja-${number}`,
        branchId,
        name: `Caja ${number}`,
        status: "activa",
        createdAt: "2026-01-15T09:00:00.000Z",
      });
    }
  }
  return out;
}

const mutableRegisters: Register[] = seed();

export const REGISTERS: readonly Register[] = mutableRegisters;

/** Cajas **activas** de una sede — lo que se puede vincular y operar. */
export function registersOf(branchId: string): readonly Register[] {
  if (!findSedeById(branchId)) return [];
  return mutableRegisters.filter((r) => r.branchId === branchId && r.status === "activa");
}

/** Incluye las retiradas: su histórico de jornadas y operaciones sigue siendo consultable [R9]. */
export function allRegistersOf(branchId: string): readonly Register[] {
  return mutableRegisters.filter((r) => r.branchId === branchId);
}

/**
 * Busca por id, **también entre las retiradas**: un equipo vinculado o una
 * jornada histórica pueden apuntar a una caja que ya se retiró, y esa
 * referencia tiene que seguir resolviendo.
 */
export function findRegisterById(id: string | null | undefined): Register | null {
  if (!id) return null;
  return mutableRegisters.find((r) => r.id === id) ?? null;
}

/* -------------------------------------------------------------------------
 * Escrituras — del mercante, nunca de PuntoCash (reglas A4 y A14)
 * ---------------------------------------------------------------------- */

/**
 * Comprobaciones que este módulo NO puede hacer por sí mismo y recibe de quien
 * llama.
 *
 * El estado de la jornada vive en `caja-data.ts` y el vínculo del equipo en
 * `devices/device-link.ts`, que lee `localStorage` y por tanto solo existe en
 * el navegador. Inyectarlas mantiene este dominio comprobable fuera de un
 * navegador y evita que `network` dependa de la caja o del DOM.
 */
export interface RegisterGuards {
  hasOpenJornada(registerId: string): boolean;
  hasLinkedDevice(registerId: string): boolean;
}

const NO_GUARDS: RegisterGuards = {
  hasOpenJornada: () => false,
  hasLinkedDevice: () => false,
};

export type RegisterWriteDenial =
  | "alcance-global-prohibido"
  | "fuera-de-alcance"
  | "sede-no-encontrada"
  | "sede-cerrada"
  | "nombre-duplicado"
  | "caja-no-encontrada"
  | "ya-retirada"
  | "no-retirada"
  | "jornada-abierta"
  | "equipo-vinculado"
  | "ultima-caja"
  | "motivo-requerido";

export type RegisterWriteResult<T> = { ok: true; value: T } | { ok: false; reason: RegisterWriteDenial };

/**
 * Comprueba que quien escribe es el mercante de esa sede. `sedesDeOperador`
 * se recibe como función para no importar `assignments.ts` desde aquí, que a
 * su vez necesita este módulo para contar cajas.
 */
export interface RegisterScopeContext {
  /** Sedes con asignación vigente al operador del alcance. */
  sedesEnAlcance(operatorId: string): readonly string[];
}

function guardScope(
  scope: Scope,
  branchId: string,
  ctx: RegisterScopeContext,
): RegisterWriteDenial | null {
  const operator = requireOperatorScope(scope);
  if (!operator.ok) return operator.reason;
  if (!ctx.sedesEnAlcance(operator.value).includes(branchId)) return "fuera-de-alcance";
  return null;
}

export function crearCaja(
  scope: Scope,
  ctx: RegisterScopeContext,
  input: { branchId: string; name: string },
  now = new Date(),
): RegisterWriteResult<Register> {
  const denial = guardScope(scope, input.branchId, ctx);
  if (denial) return { ok: false, reason: denial };

  const sede = findSedeById(input.branchId);
  if (!sede) return { ok: false, reason: "sede-no-encontrada" };
  if (sede.status === "cerrada") return { ok: false, reason: "sede-cerrada" };

  const name = input.name.trim();
  /* Único dentro de su sede, no en la red: dos sucursales tienen su Caja 01. */
  if (allRegistersOf(input.branchId).some((r) => r.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, reason: "nombre-duplicado" };
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const register: Register = {
    id: `${input.branchId}:${slug || `caja-${allRegistersOf(input.branchId).length + 1}`}`,
    branchId: input.branchId,
    name,
    status: "activa",
    createdAt: now.toISOString(),
  };
  mutableRegisters.push(register);
  return { ok: true, value: register };
}

/**
 * Retira una caja. Exige que no tenga jornada abierta ni equipo vinculado: las
 * dos acciones que lo resuelven son del propio Admin, así que el camino está
 * entero en su mano (FR-AD-CAJA-9, FR-AD-CAJA-10).
 *
 * No borra nada: su histórico permanece íntegro y la caja sigue apareciendo en
 * los listados históricos marcada como retirada [R9].
 */
export function retirarCaja(
  scope: Scope,
  ctx: RegisterScopeContext,
  registerId: string,
  reason: string,
  guards: RegisterGuards = NO_GUARDS,
  now = new Date(),
): RegisterWriteResult<Register> {
  const register = findRegisterById(registerId);
  if (!register) return { ok: false, reason: "caja-no-encontrada" };

  const denial = guardScope(scope, register.branchId, ctx);
  if (denial) return { ok: false, reason: denial };

  if (!isMotivoValido(reason)) return { ok: false, reason: "motivo-requerido" };
  if (register.status === "retirada") return { ok: false, reason: "ya-retirada" };
  if (guards.hasOpenJornada(registerId)) return { ok: false, reason: "jornada-abierta" };
  if (guards.hasLinkedDevice(registerId)) return { ok: false, reason: "equipo-vinculado" };

  const sede = findSedeById(register.branchId);
  /* Dejaría la sucursal sin ningún mostrador operable (FR-AD-CAJA-13). */
  if (sede?.status === "activa" && registersOf(register.branchId).length <= 1) {
    return { ok: false, reason: "ultima-caja" };
  }

  register.status = "retirada";
  register.retiredAt = now.toISOString();
  register.retiredReason = reason.trim();
  return { ok: true, value: register };
}

/** Reactivar no restaura ningún vínculo de equipo: hay que vincular uno de nuevo (FR-AD-CAJA-12). */
export function reactivarCaja(
  scope: Scope,
  ctx: RegisterScopeContext,
  registerId: string,
): RegisterWriteResult<Register> {
  const register = findRegisterById(registerId);
  if (!register) return { ok: false, reason: "caja-no-encontrada" };

  const denial = guardScope(scope, register.branchId, ctx);
  if (denial) return { ok: false, reason: denial };
  if (register.status !== "retirada") return { ok: false, reason: "no-retirada" };

  const sede = findSedeById(register.branchId);
  if (!sede || sede.status === "cerrada") return { ok: false, reason: "sede-cerrada" };

  register.status = "activa";
  delete register.retiredAt;
  delete register.retiredReason;
  return { ok: true, value: register };
}
