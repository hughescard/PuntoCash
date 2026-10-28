/**
 * La sesión de la consola de administración — quién entró, a qué operador
 * pertenece y qué sedes alcanza (Administración PRD regla **A1**,
 * Admin FRD **FR-AD-SCOPE-1**).
 *
 * ── Por qué el alcance se resuelve aquí y no en cada pantalla ─────────────
 * "El alcance no es elegible ni editable": se deriva de la sesión. Si cada
 * pantalla lo recompusiera por su cuenta, bastaría con que una se olvidara de
 * filtrar para que un mercante viera una sede de otro. Resolverlo una vez, en
 * el sitio donde se resuelve la sesión, hace que el filtro sea la única forma
 * de obtener datos, no una precaución que haya que recordar.
 *
 * ── Qué es y qué no es ───────────────────────────────────────────────────
 * Igual que el resto del demo, esto **simula** la forma final. La sesión viaja
 * en una cookie que escribe el servidor (ver `_actions.ts`), no el navegador:
 * en eso ya se parece a la de verdad. Lo que todavía no hace es firmarla ni
 * validarla contra un almacén de sesiones, así que sirve para representar lo
 * correcto y no para autorizar. Cuando el backend exista, lo único que cambia
 * es de dónde sale `userId`: la forma de este módulo se queda.
 *
 * Este archivo no importa `next/headers` a propósito, para que lo pueda usar
 * también una prueba o una utilidad. Quien lee cookies es `session-server.ts`.
 */

import { cuentaCoincide } from "@/features/auth/identificador";
import {
  findOperatorById,
  type AdminUser,
  type Operator,
  ADMIN_USERS,
} from "@/features/network/operators";
import { sedesEnAlcance } from "@/features/network/assignments";
import { findSedeById, type Sede } from "@/features/network/sedes";
import { operatorScope, type OperatorScope } from "@/features/network/scope";

/** Sesión abierta. La escribe y la borra el servidor. */
export const ADMIN_SESSION_COOKIE = "pc_admin_session";

/** Sede seleccionada en el selector de alcance (FR-AD-SCOPE-4). */
export const ADMIN_SCOPE_COOKIE = "pc_admin_sede";

/** Valor del selector que significa "no filtres por sede". */
export const ALCANCE_TODAS = "todas";

/**
 * Una jornada larga de trabajo, no un año: esto es una sesión de persona, no
 * el vínculo de un equipo. Al vencer se vuelve a pedir el acceso completo.
 */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export interface AdminSessionPayload {
  userId: string;
}

export function serializeAdminSession(payload: AdminSessionPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

/**
 * Devuelve `null` ante cualquier valor que no sea un payload íntegro. Una
 * cookie manipulada, truncada o de una versión anterior debe leerse como
 * "sin sesión", nunca como una sesión a medias.
 */
export function parseAdminSession(raw: string | undefined): AdminSessionPayload | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed !== "object" || parsed === null) return null;
    const { userId } = parsed as Record<string, unknown>;
    if (typeof userId !== "string" || userId.length === 0) return null;
    return { userId };
  } catch {
    return null;
  }
}

export interface AdminSession {
  user: AdminUser;
  /** Aparece como dato de contexto, nunca como marca (regla **A9**). */
  operator: Operator;
  scope: OperatorScope;
  /** Sedes con asignación vigente al operador, ordenadas por nombre. */
  sedes: readonly Sede[];
  /** Sede elegida en el selector; `null` es "Todas mis sedes". */
  selected: Sede | null;
  /**
   * La sede elegida dejó de estar asignada mientras la sesión seguía abierta
   * (**FR-AD-SCOPE-6**). La pantalla debe volver a "Todas mis sedes" y decirlo.
   */
  scopeDropped: boolean;
  initials: string;
  firstName: string;
}

/** Busca por el identificador con el que se inicia sesión. */
export function findAdminUserByIdentifier(identifier: string): AdminUser | null {
  const account = identifier.trim().toLowerCase();
  return ADMIN_USERS.find((u) => u.identifier.toLowerCase() === account) ?? null;
}

/**
 * A quién pertenece lo que se tecleó al entrar: vale **el identificador o el
 * correo** (decisión del 28/10/2026). Los dos no se parecen nunca —un
 * identificador no lleva «@»—, así que no hay que elegir entre ellos.
 */
export function findAdminUserByCuenta(cuenta: string): AdminUser | null {
  return ADMIN_USERS.find((u) => cuentaCoincide(u, cuenta)) ?? null;
}

/**
 * Iniciales para el avatar. Dos palabras como mucho: "Marta Sánchez" → MS.
 */
export function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[1]?.[0] ?? "") : "";
  return `${first}${second}`.toUpperCase() || "?";
}

/**
 * Compone la sesión a partir de lo que la cookie guarda. Devuelve `null`
 * —y quien la llame manda a iniciar sesión— cuando el usuario ya no existe,
 * está desactivado, o su operador está suspendido o dado de baja: un usuario
 * no sobrevive al estado de su empresa (**A14**, **FR-AD-ACC-6**).
 *
 * Un operador activo **sin ninguna sede** sí abre sesión: no es un error, es
 * un mercante que todavía no tiene nada a su cargo (**FR-AD-ACC-7**).
 */
export function resolveAdminSession(
  userId: string,
  selectedBranchId?: string | null,
): AdminSession | null {
  const user = ADMIN_USERS.find((u) => u.id === userId) ?? null;
  if (!user || user.status !== "activo") return null;

  const operator = findOperatorById(user.operatorId);
  if (!operator || operator.status !== "activo") return null;

  const scope = operatorScope(operator.id);

  const sedes = sedesEnAlcance(scope)
    .map((id) => findSedeById(id))
    .filter((sede): sede is Sede => sede !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const wanted = selectedBranchId && selectedBranchId !== ALCANCE_TODAS ? selectedBranchId : null;
  const selected = wanted ? (sedes.find((s) => s.id === wanted) ?? null) : null;

  return {
    user,
    operator,
    scope,
    sedes,
    selected,
    scopeDropped: wanted !== null && selected === null,
    initials: initialsOf(user.fullName),
    firstName: user.fullName.trim().split(/\s+/)[0] ?? user.fullName,
  };
}

/**
 * Las sedes sobre las que debe trabajar una pantalla: la seleccionada, o todas
 * las del alcance. Es la única forma en que las pantallas obtienen sedes, para
 * que filtrar no dependa de que alguien se acuerde (**FR-AD-SCOPE-4**).
 */
export function sedesVisibles(session: AdminSession): readonly Sede[] {
  return session.selected ? [session.selected] : session.sedes;
}
