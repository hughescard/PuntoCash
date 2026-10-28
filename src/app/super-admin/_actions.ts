"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  verificarCredencialesSuperAdmin,
  type SuperAdminCredentials,
  type SuperAdminLoginResult,
} from "@/features/super-admin/auth";
import {
  SUPER_ADMIN_COOKIE_PATH,
  SUPER_ADMIN_PENDING_COOKIE,
  SUPER_ADMIN_SESSION_COOKIE,
  SUPER_ADMIN_SESSION_MAX_AGE_SECONDS,
  resolveSuperAdminSession,
  serializeSuperAdminSession,
} from "@/features/super-admin/session";
import {
  canjearAccesoPendiente,
  descartarAccesoPendiente,
  registrarAccesoPendiente,
} from "@/features/admin/pending-access";
import { DEMO_CODE } from "@/features/auth/two-factor";
import { registrarAccesoPuntoCash } from "@/features/super-admin/usuarios";

/**
 * El acceso de dos pasos y el cierre de sesión de `/super-admin`, en el
 * servidor. Misma forma que `src/app/admin/_actions.ts`, donde está explicado
 * por qué la identidad nunca cruza al navegador entre el paso 1 y el 2.
 *
 * El almacén de retos pendientes es el de Admin (`pending-access.ts`): guarda
 * un usuario y un código, sin saber de qué consola. Lo que separa las dos es
 * la cookie —otro nombre, otra ruta— y quién resuelve la sesión al canjear:
 * un reto de Admin canjeado aquí no resuelve ninguna persona de PuntoCash.
 */

export async function iniciarAccesoSuperAdmin(
  credentials: SuperAdminCredentials,
): Promise<SuperAdminLoginResult> {
  const check = await verificarCredencialesSuperAdmin(credentials);
  if (check.status !== "ok") return { status: check.status };

  const id = registrarAccesoPendiente(check.userId, DEMO_CODE);
  const store = await cookies();
  store.set(SUPER_ADMIN_PENDING_COOKIE, id, {
    path: SUPER_ADMIN_COOKIE_PATH,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 10 * 60,
  });
  return { status: "challenge-required", correoEnmascarado: check.correoEnmascarado };
}

export async function abrirSesionSuperAdmin(code: string): Promise<void> {
  const store = await cookies();
  const userId = canjearAccesoPendiente(store.get(SUPER_ADMIN_PENDING_COOKIE)?.value, code);
  if (!userId) return;

  store.delete({ name: SUPER_ADMIN_PENDING_COOKIE, path: SUPER_ADMIN_COOKIE_PATH });
  if (!resolveSuperAdminSession(userId)) return;
  registrarAccesoPuntoCash(userId);

  store.set(SUPER_ADMIN_SESSION_COOKIE, serializeSuperAdminSession(userId), {
    path: SUPER_ADMIN_COOKIE_PATH,
    httpOnly: true,
    sameSite: "lax",
    maxAge: SUPER_ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}

export async function descartarAccesoSuperAdmin(): Promise<void> {
  const store = await cookies();
  descartarAccesoPendiente(store.get(SUPER_ADMIN_PENDING_COOKIE)?.value);
  store.delete({ name: SUPER_ADMIN_PENDING_COOKIE, path: SUPER_ADMIN_COOKIE_PATH });
}

export async function cerrarSesionSuperAdmin(): Promise<void> {
  const store = await cookies();
  store.delete({ name: SUPER_ADMIN_SESSION_COOKIE, path: SUPER_ADMIN_COOKIE_PATH });
  store.delete({ name: SUPER_ADMIN_PENDING_COOKIE, path: SUPER_ADMIN_COOKIE_PATH });
  redirect("/super-admin/login");
}
