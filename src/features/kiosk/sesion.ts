/**
 * LA SESIÓN DEL KIOSCO — la del equipo, no la de una persona.
 *
 * El cliente que usa el kiosco nunca se identifica; el equipo sí. Igual que
 * una caja de Worker, el kiosco se presenta con el código de vinculación que
 * generó y guarda en una cookie, y **la red** contesta si está vinculado y a qué sede
 * (`resolverTerminal`). El vínculo lo hace y lo deshace el administrador de la
 * sede desde su consola; el kiosco solo muestra su código y pregunta.
 *
 * La segunda cookie recuerda la última sede a la que perteneció, para que un
 * kiosco desvinculado pueda decir de dónde lo desvincularon.
 *
 * Este archivo no importa `next/headers`: lo puede usar una prueba.
 */

export const KIOSK_COOKIE_PATH = "/kiosk/autoservicio";
export const KIOSK_DEVICE_COOKIE = "pc_kiosco_device";
export const KIOSK_LAST_BRANCH_COOKIE = "pc_kiosco_ultima_sede";

export const KIOSK_DEVICE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export { nuevoCodigoDeEquipo as nuevoCodigoDeKiosco } from "@/features/worker/sesion";
