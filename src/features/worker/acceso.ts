/**
 * EL ACCESO DEL TRABAJADOR, comprobado en el servidor (**FR-AUTH-1** a
 * **FR-AUTH-9**).
 *
 * Mismo reparto que `/admin`: la contraseña se comprueba aquí, el reto queda
 * en el servidor bajo una cookie `httpOnly`, y la sesión se abre solo con el
 * código **[R13]**. Lo que el trabajador tiene de propio es que entra **en un
 * equipo**: la cuenta tiene que ser de la sede de esa caja (**FR-AUTH-8**).
 *
 * ── Sede que no opera ─────────────────────────────────────────────────────
 * Con la sede suspendida o cerrada, o su empresa suspendida, nadie de ella
 * entra… **salvo** para cerrar una jornada que quedó abierta en este equipo
 * (decisión del 5/11/2026): sin esa salida, la caja se quedaría abierta con el
 * efectivo dentro. Dentro, la aplicación solo deja contar y cerrar.
 *
 * Cuentas de demostración (contraseña `puntocash` salvo que se haya fijado
 * otra recuperándola):
 *   · cualquier trabajador de la red, por identificador o correo;
 *   · `error@puntocash.com` → falla la conexión;
 *   · `bloqueado@puntocash.com` → cuenta desactivada;
 *   · `caduca@puntocash.com` → el código caduca a los 20 s (lo decide la
 *     pantalla de verificación; aquí se trata como el trabajador `jperez`).
 */

import { maskEmail } from "@/features/auth/two-factor";
import { contextoDe } from "@/features/network/caja-operativa";
import { jornadaAbiertaDeCaja } from "@/features/network/jornadas";
import { findTerminalById } from "@/features/network/devices";
import { findWorkerByCuenta, motivoDeBloqueo } from "@/features/network/workers";

const DEMO_PASSWORD = "puntocash";
const LATENCY_MS = 600;

export type WorkerCredentialCheck =
  | { status: "ok"; workerId: string; correoEnmascarado: string }
  | { status: "invalid-credentials" }
  | { status: "other-branch" }
  | { status: "account-blocked" }
  /** La sede no está operando y este equipo no tiene ninguna jornada que cerrar. */
  | { status: "sede-sin-operar" }
  | { status: "network-error" };

const ALMACEN = globalThis as unknown as { __puntocashContrasenasWorker?: Map<string, string> };
const contrasenas = (ALMACEN.__puntocashContrasenasWorker ??= new Map<string, string>());

/** Lo fijado en la recuperación. Se guarda por trabajador, no por lo tecleado. */
export function registrarContrasenaDeTrabajador(cuenta: string, contrasena: string): void {
  const w = findWorkerByCuenta(cuenta.trim().toLowerCase());
  contrasenas.set(w?.id ?? cuenta.trim().toLowerCase(), contrasena);
}

export async function verificarCredencialesTrabajador(
  { identifier, password }: { identifier: string; password: string },
  terminalId: string | null,
): Promise<WorkerCredentialCheck> {
  await new Promise((r) => setTimeout(r, LATENCY_MS));
  const cuenta = identifier.trim().toLowerCase();
  if (cuenta === "error@puntocash.com") return { status: "network-error" };
  /* Demostración: una cuenta desactivada sin tener que desactivar a nadie. */
  if (cuenta === "bloqueado@puntocash.com") return { status: "account-blocked" };

  const worker = findWorkerByCuenta(cuenta === "caduca@puntocash.com" ? "jperez" : cuenta);
  const aceptada = (worker && contrasenas.get(worker.id)) ?? DEMO_PASSWORD;
  if (!worker || password !== aceptada) return { status: "invalid-credentials" };

  const terminal = terminalId ? findTerminalById(terminalId) : null;
  if (!terminal || terminal.kind !== "caja" || !terminal.registerId) return { status: "other-branch" };
  if (worker.branchId !== terminal.branchId) return { status: "other-branch" };

  const bloqueo = motivoDeBloqueo(worker);
  if (bloqueo === "desactivado") return { status: "account-blocked" };
  if (bloqueo) {
    const abierta = jornadaAbiertaDeCaja(terminal.registerId);
    if (!abierta || abierta.workerId !== worker.id) return { status: "sede-sin-operar" };
  }

  /* El contexto completo, por si el equipo cambió de caja entre medias. */
  if (!contextoDe({ workerId: worker.id, terminalId: terminal.id }).ok) return { status: "other-branch" };

  return { status: "ok", workerId: worker.id, correoEnmascarado: maskEmail(worker.email) };
}
