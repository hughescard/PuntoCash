import { cache } from "react";
import { cookies } from "next/headers";

import {
  ADMIN_SCOPE_COOKIE,
  ADMIN_SESSION_COOKIE,
  parseAdminSession,
  resolveAdminSession,
  type AdminSession,
} from "./session";

/**
 * La lectura de la sesión desde el servidor. Vive aparte de `session.ts` por
 * una razón práctica: `next/headers` solo existe en el servidor, y separarlo
 * deja el resto del módulo importable desde cualquier sitio.
 *
 * Que la sesión se resuelva **en el servidor y antes de representar nada** es
 * lo que evita repetir el error que tuvo el gate de Worker: una decisión de
 * acceso tomada en el cliente obliga a no renderizar en el servidor, y con
 * ello se pierden el primer pintado y los 404 de verdad (FR-DEV-1.1).
 *
 * Envuelta en `cache` de React a propósito: el layout y la pantalla la llaman
 * cada uno por su lado, y sin esto el alcance se recompone dos veces por
 * petición. Con datos en memoria no cuesta nada, pero cuando esto sea una
 * consulta al backend serían dos —y, peor, dos que pueden ver estados
 * distintos si el alcance cambia entre una y otra, que es exactamente lo que
 * resolver la sesión en el servidor viene a evitar. `cache` dura una sola
 * petición, así que no introduce ningún estado compartido entre peticiones.
 */
export const getAdminSession = cache(async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();

  const payload = parseAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
  if (!payload) return null;

  return resolveAdminSession(payload.userId, store.get(ADMIN_SCOPE_COOKIE)?.value ?? null);
});
