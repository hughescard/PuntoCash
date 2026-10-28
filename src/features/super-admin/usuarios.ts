/**
 * Las personas de PuntoCash que entran en `/super-admin`.
 *
 * Hay **un sub-rol**, y solo uno: el **super administrador principal**. Es el
 * único que ve y ejecuta la sección Usuarios, desde la que da de alta, edita,
 * desactiva y reactiva a los demás super administradores. El resto tiene la
 * consola completa de la red y **ninguna** sección de administración de
 * cuentas: para ellos esa sección no existe (ruta inexistente, sin entrada en
 * el menú), igual que en Admin de sede (FR-AD-USR-11).
 *
 * Esto modifica la decisión anterior de «rol único» del 27/10 y se deja
 * escrito aquí para que el código y las decisiones no se contradigan.
 *
 * El primer principal **se siembra directamente en la base de datos**: no
 * existe un alta por consola para él. Después, la única forma de cambiar de
 * principal es el traspaso, que es inmediato y deja sin §Usuarios a quien lo
 * traspasa.
 */

import { cuentaCoincide, esIdentificadorValido, normalizarCuenta } from "@/features/auth/identificador";
import { isMotivoValido } from "@/features/network/sedes";

export type PuntoCashUserStatus = "activo" | "desactivado";

export interface PuntoCashUser {
  id: string;
  /**
   * El nombre de usuario con el que se entra. Es un dato propio: ni el nombre
   * de la persona ni su correo, aunque en el acceso valgan los dos
   * (decisión del 28/10/2026, `features/auth/identificador.ts`).
   */
  identifier: string;
  fullName: string;
  /** Canal del segundo factor [R13]. */
  email: string;
  /** Área a la que pertenece. Es contexto en la cabecera, no un permiso. */
  area: string;
  phone: string;
  status: PuntoCashUserStatus;
  /**
   * Quien administra las cuentas de la consola. Solo uno a la vez.
   * Se siembra en la base de datos y cambia únicamente por traspaso.
   */
  isPrincipal: boolean;
  createdAt: string;
  lastAccessAt?: string;
}

const USUARIOS: PuntoCashUser[] = [
  {
    id: "sa-1",
    identifier: "emarrero",
    fullName: "Elena Marrero Fonseca",
    email: "emarrero@puntocash.com",
    area: "Operaciones de red",
    phone: "+53 7 830 2200",
    status: "activo",
    isPrincipal: true,
    createdAt: "2026-01-12T09:00:00.000Z",
    lastAccessAt: "2026-10-27T13:40:00.000Z",
  },
  {
    id: "sa-2",
    identifier: "jaguilera",
    fullName: "Jorge Aguilera Ruiz",
    email: "jaguilera@puntocash.com",
    area: "Control interno",
    phone: "+53 7 830 2214",
    status: "activo",
    isPrincipal: false,
    createdAt: "2026-02-03T09:00:00.000Z",
    lastAccessAt: "2026-10-26T16:10:00.000Z",
  },
  {
    /* Una cuenta que ya no entra: su acceso falla con el mismo mensaje que
       una contraseña equivocada (FR-SA-ACC-4). */
    id: "sa-3",
    identifier: "rvaldes",
    fullName: "Raúl Valdés Pino",
    email: "rvaldes@puntocash.com",
    area: "Operaciones de red",
    phone: "+53 7 830 2231",
    status: "desactivado",
    isPrincipal: false,
    createdAt: "2026-02-03T09:30:00.000Z",
  },
];

const mutableUsers: PuntoCashUser[] = USUARIOS;

/** La lista para leer. Las escrituras pasan por las funciones de abajo. */
export const PUNTOCASH_USERS: readonly PuntoCashUser[] = mutableUsers;

export function findPuntoCashUserById(id: string | null | undefined): PuntoCashUser | null {
  if (!id) return null;
  return mutableUsers.find((u) => u.id === id) ?? null;
}

export function findPuntoCashUserByIdentifier(identifier: string): PuntoCashUser | null {
  const account = normalizarCuenta(identifier);
  return mutableUsers.find((u) => u.identifier.toLowerCase() === account) ?? null;
}

/** A quién pertenece lo tecleado al entrar: vale el identificador o el correo. */
export function findPuntoCashUserByCuenta(cuenta: string): PuntoCashUser | null {
  return mutableUsers.find((u) => cuentaCoincide(u, cuenta)) ?? null;
}

/** Si esta cuenta es la que administra las cuentas de la consola. */
export function esSuperAdminPrincipal(userId: string | null | undefined): boolean {
  return findPuntoCashUserById(userId)?.isPrincipal === true;
}

/* -------------------------------------------------------------------------
 * Escrituras — solo el principal, y el principal nunca se desactiva
 * ---------------------------------------------------------------------- */

export type PuntoCashUserDenial =
  | "no-es-el-principal"
  | "usuario-no-encontrado"
  | "identificador-duplicado"
  | "identificador-invalido"
  | "correo-duplicado"
  | "es-el-principal"
  | "es-uno-mismo"
  | "destino-no-activo"
  | "motivo-requerido"
  | "correo-invalido"
  | "ya-activo";

export type PuntoCashUserResult<T> = { ok: true; value: T } | { ok: false; reason: PuntoCashUserDenial };

export interface CrearPuntoCashUserInput {
  id: string;
  identifier: string;
  fullName: string;
  email: string;
  phone: string;
  area: string;
}

function identifierTaken(identifier: string, exceptId?: string): boolean {
  const account = normalizarCuenta(identifier);
  return mutableUsers.some((u) => u.id !== exceptId && u.identifier.toLowerCase() === account);
}

/** El correo también entra, así que tampoco puede repetirse. */
function correoTomado(email: string, exceptId?: string): boolean {
  const account = normalizarCuenta(email);
  return mutableUsers.some((u) => u.id !== exceptId && u.email.toLowerCase() === account);
}

function esCorreoValido(email: string): boolean {
  const valor = email.trim();
  return valor.length > 3 && valor.includes("@") && !valor.includes(" ");
}

export function crearUsuarioPuntoCash(
  actingUserId: string,
  input: CrearPuntoCashUserInput,
  now = new Date(),
): PuntoCashUserResult<PuntoCashUser> {
  if (!esSuperAdminPrincipal(actingUserId)) return { ok: false, reason: "no-es-el-principal" };
  if (!esIdentificadorValido(input.identifier)) return { ok: false, reason: "identificador-invalido" };
  if (identifierTaken(input.identifier)) return { ok: false, reason: "identificador-duplicado" };
  if (!esCorreoValido(input.email)) return { ok: false, reason: "correo-invalido" };
  if (correoTomado(input.email)) return { ok: false, reason: "correo-duplicado" };

  const user: PuntoCashUser = {
    id: input.id,
    identifier: input.identifier.trim(),
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    area: input.area.trim(),
    phone: input.phone.trim(),
    status: "activo",
    isPrincipal: false,
    createdAt: now.toISOString(),
  };
  mutableUsers.push(user);
  return { ok: true, value: user };
}

export function editarUsuarioPuntoCash(
  actingUserId: string,
  userId: string,
  input: { fullName: string; phone: string },
): PuntoCashUserResult<PuntoCashUser> {
  if (!esSuperAdminPrincipal(actingUserId)) return { ok: false, reason: "no-es-el-principal" };
  const user = findPuntoCashUserById(userId);
  if (!user) return { ok: false, reason: "usuario-no-encontrado" };

  user.fullName = input.fullName.trim();
  user.phone = input.phone.trim();
  return { ok: true, value: user };
}

export function cambiarCorreoUsuarioPuntoCash(
  actingUserId: string,
  userId: string,
  email: string,
): PuntoCashUserResult<{ user: PuntoCashUser; anterior: string }> {
  if (!esSuperAdminPrincipal(actingUserId)) return { ok: false, reason: "no-es-el-principal" };
  const user = findPuntoCashUserById(userId);
  if (!user) return { ok: false, reason: "usuario-no-encontrado" };
  if (!esCorreoValido(email)) return { ok: false, reason: "correo-invalido" };
  if (correoTomado(email, user.id)) return { ok: false, reason: "correo-duplicado" };

  const anterior = user.email;
  user.email = email.trim();
  return { ok: true, value: { user, anterior } };
}

/**
 * Desactivar exige **motivo** (FR-SA-STATE-2): todo lo que PuntoCash hace sobre
 * la red lleva motivo, y una cuenta de la consola no es una excepción. Es lo
 * contrario de la decisión de §8 de Admin, que no lo pide; se explica en el
 * informe del tramo.
 *
 * Al principal no lo desactiva nadie, ni él mismo: sin principal activo no hay
 * quien dé de alta a otro, y la consola quedaría sin relevo posible.
 */
export function desactivarUsuarioPuntoCash(
  actingUserId: string,
  userId: string,
  motivo: string,
): PuntoCashUserResult<PuntoCashUser> {
  if (!esSuperAdminPrincipal(actingUserId)) return { ok: false, reason: "no-es-el-principal" };
  const user = findPuntoCashUserById(userId);
  if (!user) return { ok: false, reason: "usuario-no-encontrado" };
  if (user.isPrincipal) return { ok: false, reason: "es-el-principal" };
  if (!isMotivoValido(motivo)) return { ok: false, reason: "motivo-requerido" };
  if (user.status !== "activo") return { ok: false, reason: "ya-activo" };

  user.status = "desactivado";
  return { ok: true, value: user };
}

export function reactivarUsuarioPuntoCash(
  actingUserId: string,
  userId: string,
  motivo: string,
): PuntoCashUserResult<PuntoCashUser> {
  if (!esSuperAdminPrincipal(actingUserId)) return { ok: false, reason: "no-es-el-principal" };
  const user = findPuntoCashUserById(userId);
  if (!user) return { ok: false, reason: "usuario-no-encontrado" };
  if (!isMotivoValido(motivo)) return { ok: false, reason: "motivo-requerido" };
  if (user.status === "activo") return { ok: false, reason: "ya-activo" };

  user.status = "activo";
  return { ok: true, value: user };
}

/**
 * Traspasar el papel de principal. Inmediato: quien lo traspasa deja de ver la
 * sección en ese mismo instante. El destino tiene que estar activo y no puede
 * ser uno mismo.
 */
export function transferirPrincipalPuntoCash(
  actingUserId: string,
  destinoId: string,
): PuntoCashUserResult<{ anterior: PuntoCashUser; nuevo: PuntoCashUser }> {
  const actor = findPuntoCashUserById(actingUserId);
  if (!actor || !actor.isPrincipal) return { ok: false, reason: "no-es-el-principal" };

  const destino = findPuntoCashUserById(destinoId);
  if (!destino) return { ok: false, reason: "usuario-no-encontrado" };
  if (destino.id === actor.id) return { ok: false, reason: "es-uno-mismo" };
  if (destino.status !== "activo") return { ok: false, reason: "destino-no-activo" };

  actor.isPrincipal = false;
  destino.isPrincipal = true;
  return { ok: true, value: { anterior: actor, nuevo: destino } };
}

/** Deja constancia del acceso al completar el segundo factor, como en Admin (FR-AD-USR-1). */
export function registrarAccesoPuntoCash(userId: string, now = new Date()): void {
  const user = findPuntoCashUserById(userId);
  if (user) user.lastAccessAt = now.toISOString();
}
