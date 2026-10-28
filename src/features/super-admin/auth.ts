/**
 * Acceso a la consola de PuntoCash — MOCK DE FRONTEND, corre en el servidor.
 *
 * El gemelo de `features/admin/admin-auth.ts`: mismo trámite de dos pasos y el
 * mismo segundo factor (`features/auth/two-factor.ts`) [R13]. Lo único propio
 * es a quién reconoce.
 *
 * Un solo mensaje para todos los rechazos (FR-SA-ACC-4): cuenta inexistente,
 * contraseña equivocada y cuenta desactivada se leen igual desde fuera.
 *
 * Cuentas de demostración (contraseña `puntocash`):
 *
 *   emarrero@puntocash.com  → Elena Marrero, Operaciones de red
 *   jaguilera@puntocash.com → Jorge Aguilera, Control interno
 *   rvaldes@puntocash.com   → cuenta desactivada: no entra
 *   error@puntocash.com     → error de red, para ver el estado
 */

import { LARGO_MINIMO } from "@/features/auth/password-recovery";
import { findPuntoCashUserByIdentifier } from "./usuarios";

export interface SuperAdminCredentials {
  identifier: string;
  password: string;
}

export type SuperAdminLoginResult =
  | { status: "challenge-required" }
  | { status: "invalid-credentials" }
  | { status: "network-error" };

export type SuperAdminCredentialCheck =
  | { status: "ok"; userId: string }
  | { status: "invalid-credentials" }
  | { status: "network-error" };

const DEMO_PASSWORD = "puntocash";
const LATENCY_MS = 900;

/** Lo que alguien fijó al recuperar o cambiar su contraseña. Solo en la demostración. */
const contrasenas = new Map<string, string>();

export async function verificarCredencialesSuperAdmin({
  identifier,
  password,
}: SuperAdminCredentials): Promise<SuperAdminCredentialCheck> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const account = identifier.trim().toLowerCase();
  if (account === "error@puntocash.com") return { status: "network-error" };

  const user = findPuntoCashUserByIdentifier(account);
  const aceptada = contrasenas.get(account) ?? DEMO_PASSWORD;

  if (!user || user.status !== "activo" || password !== aceptada) {
    return { status: "invalid-credentials" };
  }
  return { status: "ok", userId: user.id };
}

export function registrarContrasenaRecuperadaSuperAdmin(identifier: string, password: string): void {
  contrasenas.set(identifier.trim().toLowerCase(), password);
}

export type CambioContrasenaSuperAdmin =
  | { status: "ok" }
  | { status: "actual-incorrecta" }
  | { status: "demasiado-corta" }
  | { status: "igual-a-la-actual" }
  | { status: "no-coinciden" };

/** Mismas reglas que el perfil de Admin (FR-AD-PERF-5 a 8). */
export async function cambiarContrasenaSuperAdmin(
  identifier: string,
  actual: string,
  nueva: string,
  repetida: string,
): Promise<CambioContrasenaSuperAdmin> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const account = identifier.trim().toLowerCase();
  const vigente = contrasenas.get(account) ?? DEMO_PASSWORD;

  if (actual !== vigente) return { status: "actual-incorrecta" };
  if (nueva.length < LARGO_MINIMO) return { status: "demasiado-corta" };
  if (nueva === vigente) return { status: "igual-a-la-actual" };
  if (nueva !== repetida) return { status: "no-coinciden" };

  contrasenas.set(account, nueva);
  return { status: "ok" };
}
