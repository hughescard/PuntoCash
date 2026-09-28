/**
 * El espejo en COOKIE de la sesión de dispositivo — la pieza que permite que
 * **el servidor** sepa si un equipo es una caja o un kiosco antes de renderizar
 * nada.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 * La sesión de dispositivo vive en `localStorage` (ver `device-link.ts`), un
 * sitio que el servidor no puede leer. Mientras esa fue la única fuente, el
 * layout de Worker tenía que decidir en el cliente, con tres consecuencias:
 * la aplicación entera dejaba de renderizarse en el servidor, una ruta
 * inexistente respondía 200 en lugar de 404 —porque `notFound()` nunca
 * llegaba a ejecutarse allí—, y un equipo ya vinculado pasaba por un
 * fotograma en blanco antes de pintar.
 *
 * Espejar el vínculo en una cookie resuelve las tres: el servidor lee la
 * cookie, decide, y manda **o** la pantalla de vinculación **o** la
 * aplicación. Nunca las dos.
 *
 * ── Qué es y qué no es ────────────────────────────────────────────────────
 * Esto **simula** la forma final, no la implementa. En el producto real la
 * credencial la emite el servidor al vincular y la revoca al desvincular
 * (**FR-DEV-8**, **FR-AS-LINK-7**): sería `httpOnly`, firmada, y el terminal
 * no podría escribírsela a sí mismo — que es justamente lo que la convierte
 * en un control y no en una declaración.
 *
 * Aquí la escribe el cliente, así que es **autodeclarada**: sirve para que
 * el servidor renderice lo correcto, no para autorizar. La diferencia
 * importa y conviene que quien implemente el backend la tenga presente. Lo
 * que sí adopta ya es la FORMA definitiva: cuando la cookie pase a emitirla
 * el servidor, lo único que cambia es quién la escribe — el layout, el
 * reparto de responsabilidades y las pantallas se quedan como están.
 */

import type { DeviceKind } from "./device-link";

/** Un nombre por clase de terminal: un mismo navegador puede ser las dos en la demo. */
export const DEVICE_COOKIE_NAMES: Readonly<Record<DeviceKind, string>> = {
  caja: "pc_caja_device",
  kiosco: "pc_kiosk_device",
};

/**
 * Lo mínimo que el servidor necesita para decidir y para pintar la cabecera:
 * qué equipo es, de qué sede y —si es una caja— de qué caja. Nada de retos ni
 * de sellos de tiempo: eso es del cliente, que es quien los anima.
 */
export interface DeviceCookiePayload {
  deviceId: string;
  branchId: string;
  registerId?: string;
}

/** Un año: el vínculo debe sobrevivir a reinicios y cambios de turno (FR-DEV-4). */
export const DEVICE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function serializeDeviceCookie(payload: DeviceCookiePayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

/**
 * Devuelve `null` ante cualquier valor que no sea un payload íntegro. Una
 * cookie manipulada a mano, truncada o de una versión anterior debe leerse
 * como "sin vincular", nunca como un vínculo a medias.
 */
export function parseDeviceCookie(raw: string | undefined): DeviceCookiePayload | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed !== "object" || parsed === null) return null;
    const { deviceId, branchId, registerId } = parsed as Record<string, unknown>;
    if (typeof deviceId !== "string" || typeof branchId !== "string") return null;
    if (registerId !== undefined && typeof registerId !== "string") return null;
    return registerId === undefined ? { deviceId, branchId } : { deviceId, branchId, registerId };
  } catch {
    return null;
  }
}
