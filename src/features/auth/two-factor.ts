/**
 * Segundo factor de autenticación (2FA) — FRONTEND-ONLY MOCK.
 *
 * No hay red, ni sesión, ni correo real: el reto vive en memoria de módulo,
 * igual que el resto de los dominios simulados del demo (`src/features/*`).
 *
 * ── Qué debe replicar el backend ──────────────────────────────────────────
 *
 * 1. Las credenciales correctas NO abren sesión: crean un **reto** y envían un
 *    código al correo registrado del trabajador. La sesión solo existe cuando
 *    `verifyCode` devuelve `verified` [R13].
 * 2. El código **no viaja al cliente** en ninguna respuesta, ni en el cuerpo,
 *    ni en una cabecera, ni en un registro de consola. Lo único que el cliente
 *    conoce del reto es lo que describe `TwoFactorChallengeView`.
 * 3. El reto caduca por tiempo (`expiresAt`), por intentos agotados
 *    (`attemptsRemaining`) o por envíos agotados (`sendsRemaining`). Cualquiera
 *    de los tres lo deja inservible: no se reabre, se crea uno nuevo desde el
 *    inicio de sesión.
 * 4. Un código verificado se consume. Reenviar invalida el código anterior, de
 *    modo que solo hay un código vigente por reto en cada momento.
 * 5. El correo enmascarado (`maskedEmail`) es lo único que se muestra del
 *    destino. Nunca la dirección completa: la pantalla de verificación se
 *    alcanza con una contraseña, no con una identidad ya verificada.
 *
 * ── Cuentas de demostración ───────────────────────────────────────────────
 *
 *   código `482913`            → verificado
 *   código `000000`            → error de red (para ver el estado)
 *   cualquier otro             → código incorrecto, descuenta un intento
 *   caduca@puntocash.com       → el reto nace con 20 s de vigencia
 */

/** Longitud del código. El backend debe emitir exactamente estos dígitos. */
export const CODE_LENGTH = 6;

/** Vigencia de un código, en milisegundos. */
const TTL_MS = 5 * 60 * 1000;

/** Vigencia reducida de la cuenta de demostración que fuerza la caducidad. */
const SHORT_TTL_MS = 20 * 1000;

/** Espera obligatoria entre envíos, en milisegundos. */
const RESEND_COOLDOWN_MS = 60 * 1000;

/** Intentos de verificación por reto. */
const MAX_ATTEMPTS = 3;

/** Envíos por reto, contando el inicial. */
const MAX_SENDS = 3;

/** Viaje simulado, para que los estados en vuelo sean observables. */
const LATENCY_MS = 700;

/** Código que el mock acepta. Solo existe en este archivo. */
const DEMO_CODE = "482913";

/** Código que fuerza un fallo de transporte. */
const NETWORK_FAILURE_CODE = "000000";

/**
 * Lo único que el cliente sabe de un reto. Deliberadamente no contiene el
 * código, ni el correo completo, ni el identificador con el que se inició.
 */
export interface TwoFactorChallengeView {
  id: string;
  /** Correo de destino enmascarado, p. ej. `j•••z@puntocash.com`. */
  maskedEmail: string;
  /** Dígitos que espera el formulario. */
  codeLength: number;
  /** Marca de tiempo (ms) en que el código deja de ser válido. */
  expiresAt: number;
  /** Marca de tiempo (ms) a partir de la cual se puede reenviar. */
  resendAvailableAt: number;
  /** Intentos de verificación que quedan. */
  attemptsRemaining: number;
  /** Reenvíos que quedan. */
  resendsRemaining: number;
}

export type VerifyResult =
  | { status: "verified" }
  | { status: "invalid-code"; challenge: TwoFactorChallengeView }
  | { status: "code-expired"; challenge: TwoFactorChallengeView }
  /** Reto inservible: intentos o reenvíos agotados. Hay que volver a empezar. */
  | { status: "challenge-locked"; reason: "attempts" | "sends" }
  /** El reto no existe o ya se consumió (recarga de página, enlace directo). */
  | { status: "challenge-not-found" }
  | { status: "network-error"; challenge: TwoFactorChallengeView };

export type ResendResult =
  | { status: "sent"; challenge: TwoFactorChallengeView }
  /** Se pidió antes de que venciera la espera. */
  | { status: "too-soon"; challenge: TwoFactorChallengeView }
  | { status: "challenge-locked"; reason: "sends" }
  | { status: "challenge-not-found" }
  | { status: "network-error"; challenge: TwoFactorChallengeView };

interface Challenge {
  id: string;
  /** Solo para el mock: nunca debe cruzar al cliente. */
  code: string;
  maskedEmail: string;
  expiresAt: number;
  resendAvailableAt: number;
  attemptsRemaining: number;
  sendsRemaining: number;
  /** Vigencia que se aplica en cada envío de este reto. */
  ttlMs: number;
}

/** Un único reto vivo por pestaña: una pantalla de inicio de sesión, un reto. */
let current: Challenge | null = null;

let sequence = 0;

function nextId(): string {
  sequence += 1;
  return `2FA-${Date.now().toString(36).toUpperCase()}-${sequence}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Enmascara el correo dejando el primer y el último carácter de la parte local.
 * Una parte local de uno o dos caracteres se oculta por completo, para no
 * revelarla entera al enmascararla.
 */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");

  const visible =
    local.length <= 2 ? "" : `${local[0]}•••${local[local.length - 1]}`;

  return `${visible || "•••"}@${domain}`;
}

/** Deriva el correo de destino del identificador escrito en el inicio de sesión. */
function emailFor(identifier: string): string {
  const account = identifier.trim().toLowerCase();
  return account.includes("@") ? account : `${account}@puntocash.com`;
}

function view(challenge: Challenge): TwoFactorChallengeView {
  return {
    id: challenge.id,
    maskedEmail: challenge.maskedEmail,
    codeLength: CODE_LENGTH,
    expiresAt: challenge.expiresAt,
    resendAvailableAt: challenge.resendAvailableAt,
    attemptsRemaining: challenge.attemptsRemaining,
    resendsRemaining: challenge.sendsRemaining,
  };
}

/**
 * Crea el reto y "envía" el primer código. La llama el inicio de sesión cuando
 * las credenciales son correctas — nunca la pantalla de verificación.
 */
export function openChallenge(identifier: string): TwoFactorChallengeView {
  const email = emailFor(identifier);
  const ttlMs = email === "caduca@puntocash.com" ? SHORT_TTL_MS : TTL_MS;
  const now = Date.now();

  current = {
    id: nextId(),
    code: DEMO_CODE,
    maskedEmail: maskEmail(email),
    expiresAt: now + ttlMs,
    resendAvailableAt: now + RESEND_COOLDOWN_MS,
    attemptsRemaining: MAX_ATTEMPTS,
    sendsRemaining: MAX_SENDS - 1,
    ttlMs,
  };

  return view(current);
}

/** El reto vigente, o `null` si no hay ninguno (recarga, enlace directo). */
export function peekChallenge(): TwoFactorChallengeView | null {
  return current ? view(current) : null;
}

/** Abandona el reto: "Usar otra cuenta" y el cierre de la pantalla. */
export function discardChallenge(): void {
  current = null;
}

export async function verifyCode(code: string): Promise<VerifyResult> {
  await sleep(LATENCY_MS);

  if (!current) return { status: "challenge-not-found" };

  if (code === NETWORK_FAILURE_CODE) {
    // Un fallo de transporte no consume intento: nada llegó a comprobarse.
    return { status: "network-error", challenge: view(current) };
  }

  if (Date.now() > current.expiresAt) {
    // Caducar no consume intento, pero sin reenvíos no hay salida.
    if (current.sendsRemaining <= 0) {
      current = null;
      return { status: "challenge-locked", reason: "sends" };
    }
    return { status: "code-expired", challenge: view(current) };
  }

  if (code === current.code) {
    // El código se consume al usarse: no puede repetirse.
    current = null;
    return { status: "verified" };
  }

  current.attemptsRemaining -= 1;

  if (current.attemptsRemaining <= 0) {
    current = null;
    return { status: "challenge-locked", reason: "attempts" };
  }

  return { status: "invalid-code", challenge: view(current) };
}

export async function resendCode(): Promise<ResendResult> {
  await sleep(LATENCY_MS);

  if (!current) return { status: "challenge-not-found" };

  if (current.sendsRemaining <= 0) {
    current = null;
    return { status: "challenge-locked", reason: "sends" };
  }

  if (Date.now() < current.resendAvailableAt) {
    return { status: "too-soon", challenge: view(current) };
  }

  const now = Date.now();

  // Reenviar emite un código nuevo y anula el anterior: solo uno vale a la vez.
  current.sendsRemaining -= 1;
  current.expiresAt = now + current.ttlMs;
  current.resendAvailableAt = now + RESEND_COOLDOWN_MS;
  // Los intentos se reponen con el código nuevo; lo que no se repone es el
  // número de envíos, que es el límite real del reto.
  current.attemptsRemaining = MAX_ATTEMPTS;

  return { status: "sent", challenge: view(current) };
}
