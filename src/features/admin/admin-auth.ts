/**
 * Acceso a la consola de administración — MOCK DE FRONTEND, sin red ni sesión.
 *
 * Es el gemelo de `features/auth/mock-auth.ts` para `/admin`. Comparte con él
 * el segundo factor entero (`features/auth/two-factor.ts`), porque el flujo es
 * **el mismo sin variación** (**FR-AD-ACC-1**, **FR-AD-ACC-2**): lo único
 * propio de esta consola es a quién reconoce y qué hace al verificar.
 *
 * Tres diferencias deliberadas con el mock de Worker:
 *
 *  1. **No existe `other-branch`** (**FR-AD-ACC-4**): esa comprobación es entre
 *     un trabajador y la caja de un equipo, y esta consola no se usa sobre
 *     equipos vinculados.
 *  2. **Un solo mensaje de fallo** (**FR-AD-ACC-5**, **FR-AD-ACC-6**): usuario
 *     inexistente, contraseña incorrecta, usuario desactivado y operador
 *     suspendido o dado de baja devuelven exactamente lo mismo. Distinguirlos
 *     diría desde fuera qué cuentas existen y en qué estado está una empresa.
 *  3. **Esto corre en el servidor.** Lo llama `iniciarAccesoAdmin`, la acción
 *     de `src/app/admin/_actions.ts`, y no un componente de cliente. Importa
 *     por dos razones: la identidad de quien acierta la contraseña no cruza
 *     nunca al navegador —el servidor se la guarda él, ver
 *     `pending-access.ts`—, y el padrón de operadores y usuarios que este
 *     módulo arrastra por sus importaciones no viaja en el paquete de
 *     `/admin/login`, que es una pantalla anterior a toda sesión.
 *
 * Cuentas de demostración (contraseña `puntocash` en todas):
 *
 * **Se entra con el identificador o con el correo, indistintamente**
 * (decisión del 28/10/2026): el identificador es un nombre de usuario y el
 * correo es otro dato, y los dos llegan a la misma cuenta.
 *
 *   msanchez    · marta@malecon-sf.cu          → Malecón, 3 sedes, **principal**
 *   dcastro     · dcastro@malecon-sf.cu        → Malecón, segundo usuario, no principal
 *   rortega     · rortega@caribecambios.cu     → Caribe, 3 sedes
 *   ibetancourt · ibetancourt@centrodivisas.cu → Centro Divisas, **1 sede**: la
 *                                                cabecera muestra código y nombre
 *                                                fijos, sin selector (FR-AD-SCOPE-3)
 *   abarrios    · abarrios@bahiacambios.cu     → Bahía: sede suspendida y sede solo
 *                                                con cajas retiradas
 *   lperez      · lperez@cienfuegoscambio.cu   → operador activo SIN sedes (FR-AD-ACC-7)
 *   yperez      · yperez@orientedivisas.cu     → operador suspendido: no entra (A14)
 *   error@puntocash.com                        → error de red, para ver el estado
 */

import { LARGO_MINIMO } from "@/features/auth/password-recovery";
import { maskEmail } from "@/features/auth/two-factor";
import { adminUserPuedeAcceder } from "@/features/network/operators";
import { normalizarCuenta } from "@/features/auth/identificador";
import { findAdminUserByCuenta } from "./session";

export interface AdminCredentials {
  identifier: string;
  password: string;
}

export type AdminLoginResult =
  /**
   * Credenciales correctas. Todavía no hay sesión: hay un código en camino
   * [R13]. **No lleva identidad**: quién es se lo queda el servidor.
   */
  /**
   * El correo al que fue el código, **ya enmascarado**. Lo dice el servidor
   * porque solo él sabe de quién es la cuenta: desde que se entra con el
   * identificador o con el correo, lo tecleado puede ser un nombre de usuario
   * que no se parece en nada al correo de esa persona. Enmascarado y no
   * entero, que es lo que la pantalla enseña (FR-2FA-5).
   */
  | { status: "challenge-required"; correoEnmascarado: string }
  /** Cualquier motivo de rechazo. Uno solo, a propósito (FR-AD-ACC-5). */
  | { status: "invalid-credentials" }
  | { status: "network-error" };

/** Contraseña que aceptan todas las cuentas de demostración. */
const DEMO_PASSWORD = "puntocash";

/** Viaje simulado, para que el estado de envío sea observable. */
const LATENCY_MS = 900;

/**
 * Comprueba las credenciales y, si son correctas, dice **de quién** son.
 *
 * Devuelve el identificador del usuario en vez de un desenlace cerrado porque
 * su único llamante es la acción de servidor, que es quien lo guarda. Esa
 * distinción es la que importa: el `userId` existe en el servidor y no sale de
 * ahí, mientras el `AdminLoginResult` que sí llega al navegador no lo lleva.
 */
export type AdminCredentialCheck =
  | { status: "ok"; userId: string; correoEnmascarado: string }
  | { status: "invalid-credentials" }
  | { status: "network-error" };

export async function verificarCredencialesAdmin({
  identifier,
  password,
}: AdminCredentials): Promise<AdminCredentialCheck> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const account = identifier.trim().toLowerCase();

  if (account === "error@puntocash.com") return { status: "network-error" };

  /* Vale el identificador o el correo (decisión del 28/10/2026). */
  const user = findAdminUserByCuenta(account);

  /* Un único desenlace para todos los motivos. `adminUserPuedeAcceder` mete
     dentro el estado del operador, que es lo que hace que un usuario activo de
     una empresa suspendida tampoco entre (A14). */
  const aceptada = contrasenasRecuperadas.get(claveDe(account)) ?? DEMO_PASSWORD;

  if (!user || password !== aceptada || !adminUserPuedeAcceder(user)) {
    return { status: "invalid-credentials" };
  }

  return { status: "ok", userId: user.id, correoEnmascarado: maskEmail(user.email) };
}

/* -------------------------------------------------------------------------
 * Las contraseñas que alguien fijó recuperando su acceso — FR-AD-ACC-8
 * ---------------------------------------------------------------------- */

/**
 * **Esto vive en el servidor, y ahí está el porqué de que exista.**
 *
 * La pantalla de recuperación guarda lo fijado en `password-recovery.ts`, que
 * es memoria **del navegador**. A Worker le vale: su mock de acceso corre
 * también en el navegador, así que lo escrito y lo leído están en la misma
 * memoria. Pero este módulo corre **en el servidor** —a propósito: la
 * identidad de quien acierta la contraseña no debe cruzar al cliente—, de modo
 * que lo que la pantalla guardó allí aquí no se ve, y el acceso seguía
 * aceptando la contraseña vieja después de cambiarla.
 *
 * Así que la pantalla de `/admin` entrega lo fijado al servidor con una acción
 * y este mapa lo recuerda. En el producto no hay nada de esto: la contraseña
 * la guarda el backend al terminar la recuperación, que es exactamente lo que
 * esta función simula.
 */
const contrasenasRecuperadas = new Map<string, string>();

/**
 * La contraseña se guarda **por cuenta, no por lo que se tecleó**.
 *
 * Desde que se entra con el identificador o con el correo, la misma persona
 * tiene dos formas de nombrarse. Guardarla por la cadena tecleada hacía que
 * recuperar la contraseña escribiendo el correo y entrar después con el
 * identificador siguiera aceptando la contraseña vieja. La clave es el
 * usuario; solo cuando no existe —las cuentas inventadas de la
 * demostración— se cae en lo tecleado.
 */
function claveDe(cuenta: string): string {
  return findAdminUserByCuenta(cuenta)?.id ?? normalizarCuenta(cuenta);
}

export function registrarContrasenaRecuperada(identifier: string, password: string): void {
  contrasenasRecuperadas.set(claveDe(identifier), password);
}

/* -------------------------------------------------------------------------
 * Cambiar la propia contraseña desde el perfil — FR-AD-PERF-5 a FR-AD-PERF-8
 * ---------------------------------------------------------------------- */

export type CambioContrasenaResult =
  | { status: "ok" }
  | { status: "actual-incorrecta" }
  | { status: "demasiado-corta" }
  | { status: "igual-a-la-actual" }
  | { status: "no-coinciden" };

/**
 * Comprueba la contraseña actual y fija la nueva.
 *
 * **Se pide la actual aunque haya sesión**, y no es desconfianza de quien
 * entró: es de quien se sienta delante de una sesión que otro dejó abierta.
 * Sin ella, un descuido de cinco minutos bastaría para quedarse con la cuenta.
 *
 * Escribe en el mismo mapa que la recuperación porque es lo mismo: la
 * contraseña que el acceso aceptará a partir de ahora. En el producto lo hace
 * el backend, y además cierra **las demás** sesiones de esta cuenta
 * (**FR-AD-PERF-7**); aquí no hay registro de sesiones que cerrar.
 */
export async function cambiarContrasenaAdmin(
  identifier: string,
  actual: string,
  nueva: string,
  repetida: string,
): Promise<CambioContrasenaResult> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const clave = claveDe(identifier);
  const vigente = contrasenasRecuperadas.get(clave) ?? DEMO_PASSWORD;

  if (actual !== vigente) return { status: "actual-incorrecta" };
  if (nueva.length < LARGO_MINIMO) return { status: "demasiado-corta" };
  if (nueva === vigente) return { status: "igual-a-la-actual" };
  if (nueva !== repetida) return { status: "no-coinciden" };

  contrasenasRecuperadas.set(clave, nueva);
  return { status: "ok" };
}
