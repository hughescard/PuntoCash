/**
 * FRONTEND-ONLY MOCK — no network, no credentials, no session.
 *
 * This exists solely so the Worker login screen can demonstrate its states
 * before a backend exists. Replace `authenticate` with the real call (a Server
 * Action or an API route); the `LoginResult` union is the contract the screen
 * renders against, so the UI should not need to change.
 *
 * Correct credentials do NOT open a session. Every PuntoCash product requires a
 * second factor, so a valid password produces a *challenge* and the real
 * session only exists once that challenge is verified — see
 * `src/features/auth/two-factor.ts` [R13].
 *
 * **Se entra con el identificador de acceso o con el correo**, indistintamente
 * (decisión del 28/10/2026): el identificador es un nombre de usuario —`jperez`—
 * y el correo es otro dato —`jperez@puntocash.com`—, y los dos llegan a la
 * misma cuenta.
 *
 * Demo accounts — the outcome is chosen by the identifier:
 *
 *   bloqueado@puntocash.com   → account-blocked
 *   error@puntocash.com       → network-error
 *   caduca@puntocash.com      → challenge whose code expires in 20 s
 *   otrasede@puntocash.com    → other-branch (a Worker of another sede)
 *   anything else             → challenge when the password is "puntocash",
 *                               invalid-credentials otherwise
 *
 * An account that has gone through `password-recovery.ts` accepts the password
 * its owner set there instead of the demo one.
 */

import { currentLinkedRegister } from "@/features/worker/register-device";
import { maskEmail, openChallenge, type TwoFactorChallengeView } from "./two-factor";
import { findWorkerByCuenta } from "@/features/network/workers";
import { contrasenaFijadaDe } from "./password-recovery";

export interface Credentials {
  identifier: string;
  password: string;
}

export type LoginResult =
  /**
   * Credenciales correctas. No hay sesión todavía: se emitió un código al
   * correo del trabajador y la pantalla debe llevarlo a la verificación.
   */
  | { status: "challenge-required"; challenge: TwoFactorChallengeView }
  | { status: "invalid-credentials" }
  /**
   * Credenciales correctas, pero el trabajador no pertenece a la sede de la
   * caja donde intenta entrar (Worker FRD FR-AUTH-8). No se emite código: una
   * cuenta de otra sede no tiene nada que verificar en este equipo.
   */
  | { status: "other-branch" }
  | { status: "account-blocked" }
  | { status: "network-error" };

/** Password every demo account accepts. */
const DEMO_PASSWORD = "puntocash";

/** Simulated round trip, so the submitting state is actually observable. */
const LATENCY_MS = 900;

export async function authenticate({ identifier, password }: Credentials): Promise<LoginResult> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const account = identifier.trim().toLowerCase();

  if (account === "bloqueado@puntocash.com") return { status: "account-blocked" };
  if (account === "error@puntocash.com") return { status: "network-error" };

  /* Una cuenta que pasó por la recuperación acepta **la contraseña que su
     dueño fijó y ya no la de demostración**, que es lo que hará el producto.
     Sin esto, cambiarla sería un trámite sin efecto y el recorrido se
     quedaría a medias (`password-recovery.ts`). */
  const aceptada = contrasenaVigenteDe(account) ?? DEMO_PASSWORD;

  if (password === aceptada) {
    // The Worker's sede is checked against the caja's, which the device
    // session knows (`register-device.ts`). In the demo every account belongs
    // to whatever sede this caja is linked to, except the one below.
    if (account === "otrasede@puntocash.com" || !currentLinkedRegister()) return { status: "other-branch" };
    /* El código va al correo **de esa cuenta**, no al que se deduciría de lo
       tecleado: quien entra con su nombre de usuario tiene que ver su propio
       correo enmascarado, no uno inventado a partir del usuario. */
    const trabajador = findWorkerByCuenta(account);
    return {
      status: "challenge-required",
      challenge: openChallenge(account, trabajador ? maskEmail(trabajador.email) : undefined),
    };
  }

  return { status: "invalid-credentials" };
}

/**
 * La contraseña que esta cuenta acepta hoy, venga de donde venga lo tecleado.
 *
 * La recuperación guarda lo fijado **por la cadena que se escribió** en su
 * paso uno, y desde que se entra con el identificador o con el correo esa
 * cadena puede ser una u otra. Si se buscara solo por lo tecleado ahora,
 * recuperar la contraseña escribiendo el correo y volver a entrar escribiendo
 * el identificador seguiría aceptando la contraseña vieja. Por eso se prueban
 * los dos nombres de la misma persona.
 */
function contrasenaVigenteDe(cuenta: string): string | undefined {
  const propia = contrasenaFijadaDe(cuenta);
  if (propia) return propia;
  const trabajador = findWorkerByCuenta(cuenta);
  if (!trabajador) return undefined;
  return contrasenaFijadaDe(trabajador.identifier) ?? contrasenaFijadaDe(trabajador.email);
}
