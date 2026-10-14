/**
 * RECUPERACIÓN DE CONTRASEÑA DEL TRABAJADOR — FRONTEND-ONLY MOCK.
 *
 * Es el otro extremo del enlace «¿Olvidaste tu contraseña?» del inicio de
 * sesión, y el único sitio del producto donde un trabajador elige su propia
 * contraseña. Sin backend, igual que el resto de `src/features/*`: el reto
 * vive en memoria de módulo y una recarga completa lo borra.
 *
 * ── Por qué no reutiliza `two-factor.ts` ──────────────────────────────────
 * Comparte su forma —código de seis dígitos, vigencia, intentos, reenvíos— y
 * deliberadamente **no** su objeto. `two-factor.ts` tiene un único reto vivo
 * por pestaña, y es el del inicio de sesión: si la recuperación escribiera
 * ahí, pedir una recuperación mataría el acceso a medio hacer de quien tuviera
 * la otra pestaña abierta. Son dos trámites distintos que conviven.
 *
 * ── La diferencia que importa, y que el backend debe respetar ─────────────
 * **Aquí no se dice a dónde fue el código.** La verificación del acceso sí
 * enseña el correo enmascarado, y FR-2FA-5 lo justifica: a aquella pantalla se
 * llega **con una contraseña acertada**. A esta se llega **solo con un
 * identificador**, que cualquiera puede teclear, así que enseñar `j•••z@…`
 * convertiría esta pantalla en un buscador de correos ajenos.
 *
 * Por la misma razón **la respuesta a la solicitud es siempre la misma**,
 * exista la cuenta o no: si existe se emite código, y si no existe no se emite
 * nada, pero la pantalla que se ve es idéntica. Una cuenta inexistente agota
 * sus tres intentos como si el código estuviera mal, que es exactamente lo que
 * le pasaría a alguien que se equivoca al teclearlo.
 *
 * ── Lo que debe replicar el backend ───────────────────────────────────────
 * 1. El código no viaja al cliente en ninguna respuesta.
 * 2. Verificar el código **no abre sesión** [R13]: habilita fijar contraseña, y
 *    al terminar se vuelve al inicio de sesión, con sus dos pasos.
 * 3. El reto muere al usarse, al caducar, al agotar intentos o al agotar
 *    envíos. No se reabre: se pide otro desde el principio.
 * 4. Fijar contraseña invalida la anterior —la que haya, venga del alta o de
 *    una recuperación previa— y cierra las sesiones abiertas de esa cuenta.
 *
 * ── Cuentas de demostración ───────────────────────────────────────────────
 *
 *   código `123456`             → correcto
 *   código `000000`             → error de red (no consume intento)
 *   error@puntocash.com         → la solicitud falla por red
 *   desconocido@puntocash.com   → cuenta inexistente: la pantalla es idéntica
 *                                 y ningún código funciona
 */

import { CODE_LENGTH, DEMO_CODE } from "./two-factor";

/** Vigencia del código, intentos, reenvíos y espera: los mismos que el 2FA. */
const TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 3;
const MAX_SENDS = 3;
const LATENCY_MS = 700;

const NETWORK_FAILURE_CODE = "000000";
const CUENTA_INEXISTENTE = "desconocido@puntocash.com";
const CUENTA_ERROR_DE_RED = "error@puntocash.com";

/** Mínimo de la contraseña nueva. La política fina es del backend. */
export const LARGO_MINIMO = 8;

/**
 * Lo único que el cliente sabe del reto. **No lleva el correo**, ni siquiera
 * enmascarado, ni el identificador: a esta pantalla se llega sin probar nada.
 */
export interface RecoveryChallengeView {
  id: string;
  codeLength: number;
  expiresAt: number;
  resendAvailableAt: number;
  attemptsRemaining: number;
  resendsRemaining: number;
}

export type SolicitarResult =
  | { status: "sent"; challenge: RecoveryChallengeView }
  | { status: "network-error" };

export type VerificarResult =
  | { status: "verified" }
  | { status: "invalid-code"; challenge: RecoveryChallengeView }
  | { status: "code-expired"; challenge: RecoveryChallengeView }
  | { status: "challenge-locked"; reason: "attempts" | "sends" }
  | { status: "challenge-not-found" }
  | { status: "network-error"; challenge: RecoveryChallengeView };

export type ReenviarResult =
  | { status: "sent"; challenge: RecoveryChallengeView }
  | { status: "too-soon"; challenge: RecoveryChallengeView }
  | { status: "challenge-locked"; reason: "sends" }
  | { status: "challenge-not-found" };

export type FijarResult =
  /** `cuenta` es a quién se le fijó: lo necesita quien guarde esto en otro sitio. */
  | { status: "ok"; cuenta: string }
  | { status: "no-verificado" }
  | { status: "demasiado-corta" }
  | { status: "no-coinciden" };

interface RecoveryChallenge {
  id: string;
  /** Solo para el mock: nunca debe cruzar al cliente. */
  code: string | null;
  /** La cuenta que lo pidió, para saber a quién se le cambia la contraseña. */
  account: string;
  expiresAt: number;
  resendAvailableAt: number;
  attemptsRemaining: number;
  sendsRemaining: number;
  /** Pasa a `true` al verificar: es lo que habilita fijar la contraseña. */
  verificado: boolean;
}

let current: RecoveryChallenge | null = null;
let sequence = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function view(c: RecoveryChallenge): RecoveryChallengeView {
  return {
    id: c.id,
    codeLength: CODE_LENGTH,
    expiresAt: c.expiresAt,
    resendAvailableAt: c.resendAvailableAt,
    attemptsRemaining: c.attemptsRemaining,
    resendsRemaining: c.sendsRemaining,
  };
}

function cuenta(identifier: string): string {
  const valor = identifier.trim().toLowerCase();
  return valor.includes("@") ? valor : `${valor}@puntocash.com`;
}

/**
 * Pide la recuperación. **Siempre responde lo mismo**: la pantalla siguiente no
 * distingue una cuenta que existe de una que no, y por eso un reto de una
 * cuenta inexistente nace sin código (`code: null`) en vez de no nacer.
 */
export async function solicitarRecuperacion(identifier: string): Promise<SolicitarResult> {
  await sleep(LATENCY_MS);

  const account = cuenta(identifier);
  if (account === CUENTA_ERROR_DE_RED) return { status: "network-error" };

  const now = Date.now();
  sequence += 1;

  current = {
    id: `REC-${Date.now().toString(36).toUpperCase()}-${sequence}`,
    code: account === CUENTA_INEXISTENTE ? null : DEMO_CODE,
    account,
    expiresAt: now + TTL_MS,
    resendAvailableAt: now + RESEND_COOLDOWN_MS,
    attemptsRemaining: MAX_ATTEMPTS,
    sendsRemaining: MAX_SENDS - 1,
    verificado: false,
  };

  return { status: "sent", challenge: view(current) };
}

export function peekRecuperacion(): RecoveryChallengeView | null {
  return current ? view(current) : null;
}

export function abandonarRecuperacion(): void {
  current = null;
}

export async function verificarCodigo(code: string): Promise<VerificarResult> {
  await sleep(LATENCY_MS);

  if (!current) return { status: "challenge-not-found" };

  // Un fallo de transporte no consume intento: nada llegó a comprobarse.
  if (code === NETWORK_FAILURE_CODE) {
    return { status: "network-error", challenge: view(current) };
  }

  if (Date.now() > current.expiresAt) {
    if (current.sendsRemaining <= 0) {
      current = null;
      return { status: "challenge-locked", reason: "sends" };
    }
    return { status: "code-expired", challenge: view(current) };
  }

  if (current.code !== null && code === current.code) {
    current.verificado = true;
    return { status: "verified" };
  }

  current.attemptsRemaining -= 1;

  if (current.attemptsRemaining <= 0) {
    current = null;
    return { status: "challenge-locked", reason: "attempts" };
  }

  return { status: "invalid-code", challenge: view(current) };
}

export async function reenviarCodigo(): Promise<ReenviarResult> {
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
  current.sendsRemaining -= 1;
  current.expiresAt = now + TTL_MS;
  current.resendAvailableAt = now + RESEND_COOLDOWN_MS;
  current.attemptsRemaining = MAX_ATTEMPTS;

  return { status: "sent", challenge: view(current) };
}

/* -------------------------------------------------------------------------
 * Las contraseñas cambiadas, que es lo que hace coherente la demostración
 * ---------------------------------------------------------------------- */

/**
 * **En la demostración** no hay cuentas: `mock-auth.ts` acepta la contraseña
 * fija `puntocash` para cualquier identificador. Sin esto, cambiar la
 * contraseña sería un trámite que no cambia nada y el recorrido se quedaría a
 * medias — se felicitaría al trabajador y acto seguido su contraseña nueva no
 * serviría.
 *
 * Así que lo fijado se recuerda aquí y `mock-auth` lo consulta: a partir de
 * ese momento esa cuenta acepta **la nueva y no la de demostración**, que es
 * justo lo que hará el producto. Vive en memoria del navegador y una recarga
 * completa lo borra, como todo lo demás.
 */
const contrasenasFijadas = new Map<string, string>();

export function contrasenaFijadaDe(identifier: string): string | undefined {
  return contrasenasFijadas.get(cuenta(identifier));
}

export async function fijarContrasena(nueva: string, repetida: string): Promise<FijarResult> {
  await sleep(LATENCY_MS);

  if (!current || !current.verificado) return { status: "no-verificado" };
  if (nueva.length < LARGO_MINIMO) return { status: "demasiado-corta" };
  if (nueva !== repetida) return { status: "no-coinciden" };

  /* Una cuenta inexistente llega aquí solo si alguien manipula el estado: su
     reto nunca se verifica porque no tiene código. Aun así no se guarda nada
     para ella, para que nada observable distinga los dos casos. */
  const cuenta = current.account;
  if (current.code !== null) contrasenasFijadas.set(cuenta, nueva);

  current = null;
  return { status: "ok", cuenta };
}
