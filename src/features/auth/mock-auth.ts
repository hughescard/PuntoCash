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
 * Demo accounts — the outcome is chosen by the identifier:
 *
 *   bloqueado@puntocash.com   → account-blocked
 *   error@puntocash.com       → network-error
 *   caduca@puntocash.com      → challenge whose code expires in 20 s
 *   anything else             → challenge when the password is "puntocash",
 *                               invalid-credentials otherwise
 */

import { openChallenge, type TwoFactorChallengeView } from "./two-factor";

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

  if (password === DEMO_PASSWORD) {
    return { status: "challenge-required", challenge: openChallenge(account) };
  }

  return { status: "invalid-credentials" };
}
