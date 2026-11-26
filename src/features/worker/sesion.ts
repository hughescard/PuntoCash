/**
 * LA SESIÓN DE WORKER — dos cookies que escribe el servidor.
 *
 *   · **El equipo** (`pc_caja_device`): qué máquina es esta. Guarda solo su
 *     código de vinculación; si es una caja y de cuál lo dice la red
 *     (`resolverTerminal`), no la cookie. Dura un año: el vínculo sobrevive a
 *     reinicios y cambios de turno (**FR-DEV-4**).
 *   · **La persona** (`pc_worker_session`): quién opera ahora y en qué equipo.
 *     Se abre tras el segundo factor **[R13]** y dura una jornada larga.
 *
 * Las dos viven bajo `/worker` y tienen nombres propios: **la sesión de
 * Worker y la de `/admin` ya no se pisan** en el mismo navegador.
 *
 * Igual que en `/admin`, la cookie de sesión no está firmada: representa lo
 * correcto, no autoriza. El servidor vuelve a resolver en cada petición que
 * el trabajador sigue activo, que es de esta sede y que el equipo sigue
 * vinculado (`contextoDe`).
 *
 * Este archivo no importa `next/headers`: lo puede usar una prueba.
 */

export const WORKER_COOKIE_PATH = "/worker";
export const WORKER_DEVICE_COOKIE = "pc_caja_device";
export const WORKER_SESSION_COOKIE = "pc_worker_session";
export const WORKER_PENDING_COOKIE = "pc_worker_reto";

export const WORKER_DEVICE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
export const WORKER_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export interface WorkerSessionPayload {
  workerId: string;
  terminalId: string;
}

export function serializeWorkerSession(payload: WorkerSessionPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function parseWorkerSession(raw: string | undefined): WorkerSessionPayload | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed !== "object" || parsed === null) return null;
    const { workerId, terminalId } = parsed as Record<string, unknown>;
    if (typeof workerId !== "string" || !workerId || typeof terminalId !== "string" || !terminalId) return null;
    return { workerId, terminalId };
  } catch {
    return null;
  }
}

/**
 * El código de vinculación de un equipo nuevo: seis caracteres hexadecimales
 * al azar. Lo genera el propio equipo una vez y no cambia mientras conserve
 * la cookie (decisión del 26/11/2026).
 */
export function nuevoCodigoDeEquipo(): string {
  let hex = "";
  for (let i = 0; i < 6; i += 1) hex += Math.floor(Math.random() * 16).toString(16);
  return hex.toUpperCase();
}
