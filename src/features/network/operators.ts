/**
 * LOS MERCANTES y sus usuarios administradores.
 *
 * Un operador es la persona o empresa a la que PuntoCash entrega una o más
 * sedes en administración. **Nunca es propietaria**: lo delegado es la
 * explotación (Administración PRD §1).
 *
 * El reparto de quién crea a quién es deliberado (regla A3 y FR-SA-OPE-6):
 *
 *   · PuntoCash da de alta al operador y **un único** usuario administrador,
 *     que es lo que se entrega a la empresa cuando se le asigna una sede.
 *   · **Ese usuario crea los demás** usuarios de su propia empresa
 *     (FR-AD-USR-2). Todos tienen exactamente las mismas potestades sobre
 *     todas sus sedes: no hay sub-roles en esta versión.
 *
 * La única excepción, y existe solo para un caso, es FR-SA-OPE-11: si un
 * mercante se queda sin ningún usuario activo, PuntoCash puede regenerar la
 * credencial del inicial que creó. No crea uno nuevo ni toca ningún otro.
 */

import { isGlobal, requireOperatorScope, type Scope } from "./scope";
import { isMotivoValido } from "./sedes";

export type OperatorStatus = "activo" | "suspendido" | "baja";

export interface OperatorSuspension {
  reason: string;
  at: string;
  by: string;
}

export interface Operator {
  id: string;
  /** Nombre o razón social. Aparece como dato, nunca como marca (regla A9). */
  name: string;
  legalId: string;
  contactName: string;
  phone: string;
  email: string;
  status: OperatorStatus;
  createdAt: string;
  suspension?: OperatorSuspension;
}

export type AdminUserStatus = "activo" | "desactivado";

export interface AdminUser {
  id: string;
  operatorId: string;
  identifier: string;
  fullName: string;
  /** Canal del segundo factor: sin correo no podría acceder nunca [R13]. */
  email: string;
  status: AdminUserStatus;
  /** El que entregó PuntoCash al dar de alta al operador (FR-SA-OPE-5). */
  isInitial: boolean;
  createdAt: string;
  lastAccessAt?: string;
}

const mutableOperators: Operator[] = [
  {
    id: "op-antilla",
    name: "Antilla Servicios Financieros S.R.L.",
    legalId: "CI-8804120321",
    contactName: "Marta Sánchez",
    phone: "+53 5 234 1190",
    email: "marta@antillasf.cu",
    status: "activo",
    createdAt: "2026-01-15T09:00:00.000Z",
  },
  {
    id: "op-caribe",
    name: "Caribe Cambios S.A.",
    legalId: "CI-9107235544",
    contactName: "Reinaldo Ortega",
    phone: "+53 5 812 7733",
    email: "rortega@caribecambios.cu",
    status: "activo",
    createdAt: "2026-02-02T09:00:00.000Z",
  },
  {
    /* Suspendido, con sedes y trabajadores: sirve para comprobar el alcance de
       FR-SA-OPE-11 y que suspender no desmonta nada (FR-SA-SUS-7). */
    id: "op-oriente",
    name: "Oriente Divisas",
    legalId: "CI-8511048876",
    contactName: "Yuliet Pérez",
    phone: "+53 5 445 0021",
    email: "yperez@orientedivisas.cu",
    status: "suspendido",
    createdAt: "2026-05-04T09:00:00.000Z",
    suspension: {
      reason: "Revisión de arqueos con diferencia reiterada en dos de sus sedes",
      at: "2026-09-19T14:20:00.000Z",
      by: "PuntoCash · Control interno",
    },
  },
  {
    /* Dado de baja y sin sedes: su historial sigue accesible [R9]. */
    id: "op-atlantico",
    name: "Atlántico Casas de Cambio",
    legalId: "CI-7903118820",
    contactName: "Osmany Vega",
    phone: "+53 5 118 9902",
    email: "ovega@atlanticocc.cu",
    status: "baja",
    createdAt: "2026-01-15T09:00:00.000Z",
  },
];

export const OPERATORS: readonly Operator[] = mutableOperators;

const mutableAdminUsers: AdminUser[] = [
  {
    id: "adm-antilla-1",
    operatorId: "op-antilla",
    identifier: "marta@antillasf.cu",
    fullName: "Marta Sánchez",
    email: "marta@antillasf.cu",
    status: "activo",
    isInitial: true,
    createdAt: "2026-01-15T09:00:00.000Z",
    lastAccessAt: "2026-09-23T08:12:00.000Z",
  },
  {
    /* Creado por Marta, no por PuntoCash: es el caso de FR-AD-USR-2. */
    id: "adm-antilla-2",
    operatorId: "op-antilla",
    identifier: "dcastro@antillasf.cu",
    fullName: "Daniel Castro",
    email: "dcastro@antillasf.cu",
    status: "activo",
    isInitial: false,
    createdAt: "2026-04-11T10:30:00.000Z",
    lastAccessAt: "2026-09-22T17:40:00.000Z",
  },
  {
    id: "adm-caribe-1",
    operatorId: "op-caribe",
    identifier: "rortega@caribecambios.cu",
    fullName: "Reinaldo Ortega",
    email: "rortega@caribecambios.cu",
    status: "activo",
    isInitial: true,
    createdAt: "2026-02-02T09:00:00.000Z",
    lastAccessAt: "2026-09-23T07:55:00.000Z",
  },
  {
    id: "adm-oriente-1",
    operatorId: "op-oriente",
    identifier: "yperez@orientedivisas.cu",
    fullName: "Yuliet Pérez",
    email: "yperez@orientedivisas.cu",
    status: "activo",
    isInitial: true,
    createdAt: "2026-05-04T09:00:00.000Z",
    lastAccessAt: "2026-09-19T11:02:00.000Z",
  },
];

export const ADMIN_USERS: readonly AdminUser[] = mutableAdminUsers;

export function findOperatorById(id: string | null | undefined): Operator | null {
  if (!id) return null;
  return mutableOperators.find((o) => o.id === id) ?? null;
}

export function findAdminUserById(id: string | null | undefined): AdminUser | null {
  if (!id) return null;
  return mutableAdminUsers.find((u) => u.id === id) ?? null;
}

export function adminUsersOf(operatorId: string): readonly AdminUser[] {
  return mutableAdminUsers.filter((u) => u.operatorId === operatorId);
}

export function activeAdminUsersOf(operatorId: string): readonly AdminUser[] {
  return adminUsersOf(operatorId).filter((u) => u.status === "activo");
}

/**
 * Si el operador está suspendido o dado de baja, ninguno de sus usuarios
 * entra, aunque su propia cuenta esté activa (regla A14, FR-AD-ACC-6).
 */
export function adminUserPuedeAcceder(user: AdminUser): boolean {
  if (user.status !== "activo") return false;
  const operator = findOperatorById(user.operatorId);
  return operator?.status === "activo";
}

/* -------------------------------------------------------------------------
 * Escrituras de PuntoCash (regla A3)
 * ---------------------------------------------------------------------- */

export type OperatorWriteDenial =
  | "alcance-insuficiente"
  | "operador-no-encontrado"
  | "operador-duplicado"
  | "identificador-duplicado"
  | "motivo-requerido"
  | "ya-suspendido"
  | "no-suspendido"
  | "dado-de-baja"
  | "tiene-sedes"
  | "usuario-no-encontrado"
  | "ultimo-usuario-activo"
  | "no-es-el-inicial";

export type OperatorWriteResult<T> = { ok: true; value: T } | { ok: false; reason: OperatorWriteDenial };

function identifierTaken(identifier: string): boolean {
  const needle = identifier.trim().toLowerCase();
  return mutableAdminUsers.some((u) => u.identifier.toLowerCase() === needle);
}

export interface CrearOperadorInput {
  id: string;
  name: string;
  legalId: string;
  contactName: string;
  phone: string;
  email: string;
  /** El usuario administrador inicial, que se entrega a la empresa. */
  initialUser: { id: string; identifier: string; fullName: string; email: string };
}

/**
 * Da de alta un mercante y **un único** usuario administrador. No asigna
 * sedes: asignar es un acto propio (FR-SA-OPE-7).
 */
export function crearOperador(
  scope: Scope,
  input: CrearOperadorInput,
  now = new Date(),
): OperatorWriteResult<{ operator: Operator; user: AdminUser }> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (findOperatorById(input.id)) return { ok: false, reason: "operador-duplicado" };
  if (identifierTaken(input.initialUser.identifier)) return { ok: false, reason: "identificador-duplicado" };

  const operator: Operator = {
    id: input.id,
    name: input.name,
    legalId: input.legalId,
    contactName: input.contactName,
    phone: input.phone,
    email: input.email,
    status: "activo",
    createdAt: now.toISOString(),
  };
  const user: AdminUser = {
    id: input.initialUser.id,
    operatorId: operator.id,
    identifier: input.initialUser.identifier,
    fullName: input.initialUser.fullName,
    email: input.initialUser.email,
    status: "activo",
    isInitial: true,
    createdAt: now.toISOString(),
  };
  mutableOperators.push(operator);
  mutableAdminUsers.push(user);
  return { ok: true, value: { operator, user } };
}

/**
 * Suspende a un mercante. Es la acción de mayor alcance de la consola de
 * PuntoCash: corta el acceso de sus usuarios administradores **y** el de todos
 * los trabajadores de todas sus sedes (FR-SA-SUS-3). No desmonta nada
 * (FR-SA-SUS-7).
 */
export function suspenderOperador(
  scope: Scope,
  operatorId: string,
  reason: string,
  by: string,
  now = new Date(),
): OperatorWriteResult<Operator> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (!isMotivoValido(reason)) return { ok: false, reason: "motivo-requerido" };
  const operator = findOperatorById(operatorId);
  if (!operator) return { ok: false, reason: "operador-no-encontrado" };
  if (operator.status === "baja") return { ok: false, reason: "dado-de-baja" };
  if (operator.status === "suspendido") return { ok: false, reason: "ya-suspendido" };

  operator.status = "suspendido";
  operator.suspension = { reason: reason.trim(), at: now.toISOString(), by };
  return { ok: true, value: operator };
}

export function reactivarOperador(
  scope: Scope,
  operatorId: string,
  reason: string,
): OperatorWriteResult<Operator> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (!isMotivoValido(reason)) return { ok: false, reason: "motivo-requerido" };
  const operator = findOperatorById(operatorId);
  if (!operator) return { ok: false, reason: "operador-no-encontrado" };
  if (operator.status !== "suspendido") return { ok: false, reason: "no-suspendido" };

  operator.status = "activo";
  delete operator.suspension;
  return { ok: true, value: operator };
}

/** Dar de baja exige que no administre ninguna sede (FR-SA-OPE-13). */
export function darDeBajaOperador(
  scope: Scope,
  operatorId: string,
  reason: string,
  options: { sedesAsignadas: number },
): OperatorWriteResult<Operator> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (!isMotivoValido(reason)) return { ok: false, reason: "motivo-requerido" };
  const operator = findOperatorById(operatorId);
  if (!operator) return { ok: false, reason: "operador-no-encontrado" };
  if (operator.status === "baja") return { ok: false, reason: "dado-de-baja" };
  if (options.sedesAsignadas > 0) return { ok: false, reason: "tiene-sedes" };

  operator.status = "baja";
  delete operator.suspension;
  return { ok: true, value: operator };
}

/**
 * La **única** escritura de PuntoCash sobre un usuario de un mercante, y
 * existe solo para el caso en que la empresa se quedó sin ningún usuario
 * activo (FR-SA-OPE-11). No crea usuarios ni modifica ningún otro.
 */
export function regenerarCredencialUsuarioInicial(
  scope: Scope,
  operatorId: string,
  reason: string,
): OperatorWriteResult<AdminUser> {
  if (!isGlobal(scope)) return { ok: false, reason: "alcance-insuficiente" };
  if (!isMotivoValido(reason)) return { ok: false, reason: "motivo-requerido" };
  const operator = findOperatorById(operatorId);
  if (!operator) return { ok: false, reason: "operador-no-encontrado" };

  const initial = adminUsersOf(operatorId).find((u) => u.isInitial);
  if (!initial) return { ok: false, reason: "no-es-el-inicial" };

  initial.status = "activo";
  return { ok: true, value: initial };
}

/* -------------------------------------------------------------------------
 * Escrituras del mercante sobre sus propios usuarios (regla A4)
 * ---------------------------------------------------------------------- */

export interface CrearUsuarioAdminInput {
  id: string;
  identifier: string;
  fullName: string;
  email: string;
}

export function crearUsuarioAdmin(
  scope: Scope,
  input: CrearUsuarioAdminInput,
  now = new Date(),
): OperatorWriteResult<AdminUser> {
  const operatorScope = requireOperatorScope(scope);
  if (!operatorScope.ok) return { ok: false, reason: "alcance-insuficiente" };
  const operator = findOperatorById(operatorScope.value);
  if (!operator) return { ok: false, reason: "operador-no-encontrado" };
  if (identifierTaken(input.identifier)) return { ok: false, reason: "identificador-duplicado" };

  const user: AdminUser = {
    id: input.id,
    operatorId: operator.id,
    identifier: input.identifier,
    fullName: input.fullName,
    email: input.email,
    status: "activo",
    isInitial: false,
    createdAt: now.toISOString(),
  };
  mutableAdminUsers.push(user);
  return { ok: true, value: user };
}

/**
 * Desactiva otro usuario de la misma empresa. Dos guardas:
 *
 *   · nadie se desactiva a sí mismo (FR-AD-USR-7);
 *   · no se desactiva al último activo, porque dejaría al mercante fuera de su
 *     propia consola sin poder volver a entrar (FR-AD-USR-8).
 */
export function desactivarUsuarioAdmin(
  scope: Scope,
  userId: string,
  actingUserId: string,
): OperatorWriteResult<AdminUser> {
  const operatorScope = requireOperatorScope(scope);
  if (!operatorScope.ok) return { ok: false, reason: "alcance-insuficiente" };

  const user = findAdminUserById(userId);
  if (!user || user.operatorId !== operatorScope.value) return { ok: false, reason: "usuario-no-encontrado" };
  if (user.id === actingUserId) return { ok: false, reason: "ultimo-usuario-activo" };
  if (user.status !== "activo") return { ok: true, value: user };
  if (activeAdminUsersOf(user.operatorId).length <= 1) return { ok: false, reason: "ultimo-usuario-activo" };

  user.status = "desactivado";
  return { ok: true, value: user };
}

export function reactivarUsuarioAdmin(scope: Scope, userId: string): OperatorWriteResult<AdminUser> {
  const operatorScope = requireOperatorScope(scope);
  if (!operatorScope.ok) return { ok: false, reason: "alcance-insuficiente" };

  const user = findAdminUserById(userId);
  if (!user || user.operatorId !== operatorScope.value) return { ok: false, reason: "usuario-no-encontrado" };

  user.status = "activo";
  return { ok: true, value: user };
}
