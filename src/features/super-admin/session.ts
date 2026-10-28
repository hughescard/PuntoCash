/**
 * La sesión de la consola de PuntoCash.
 *
 * El alcance es siempre la red entera y no se elige (FR-SA-NAV-2): no hay
 * selector de sede. Donde filtrar por sede u operador es útil, es un filtro de
 * la pantalla, nunca el alcance de la sesión.
 *
 * Misma forma que `features/admin/session.ts`: la cookie la escribe el
 * servidor y aquí solo se resuelve quién es. Quien lee cookies es
 * `session-server.ts`.
 */

import { GLOBAL_SCOPE, type GlobalScope } from "@/features/network/scope";
import { initialsOf } from "@/features/admin/session";
import { findPuntoCashUserById, type PuntoCashUser } from "./usuarios";

export const SUPER_ADMIN_SESSION_COOKIE = "pc_sa_session";
export const SUPER_ADMIN_PENDING_COOKIE = "pc_sa_reto";
export const SUPER_ADMIN_COOKIE_PATH = "/super-admin";
export const SUPER_ADMIN_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export interface SuperAdminSession {
  user: PuntoCashUser;
  scope: GlobalScope;
  initials: string;
  firstName: string;
}

export function serializeSuperAdminSession(userId: string): string {
  return encodeURIComponent(JSON.stringify({ userId }));
}

export function parseSuperAdminSession(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed !== "object" || parsed === null) return null;
    const { userId } = parsed as Record<string, unknown>;
    return typeof userId === "string" && userId.length > 0 ? userId : null;
  } catch {
    return null;
  }
}

/** `null` si la cuenta ya no existe o está desactivada: se vuelve al acceso. */
export function resolveSuperAdminSession(userId: string): SuperAdminSession | null {
  const user = findPuntoCashUserById(userId);
  if (!user || user.status !== "activo") return null;
  return {
    user,
    scope: GLOBAL_SCOPE,
    initials: initialsOf(user.fullName),
    firstName: user.fullName.trim().split(/\s+/)[0] ?? user.fullName,
  };
}
