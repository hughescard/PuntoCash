/**
 * LAS SOLICITUDES DE AUTOSERVICIO, en la red.
 *
 * Lo que un cliente prepara en el kiosco y termina en una caja de la misma
 * sede. Antes vivían en el navegador del kiosco, lo que solo funcionaba porque
 * en la demostración kiosco y caja eran pestañas del mismo navegador. Ahora
 * son de la red, como las jornadas y las operaciones, y eso decide tres cosas
 * que el terminal no puede decidir:
 *
 *   · **De qué sede y de qué kiosco es.** Lo pone quien registra a partir del
 *     vínculo del equipo, nunca lo que diga el navegador.
 *   · **Dónde se canjea.** Solo en una caja de esa sede: lo que el cliente vio
 *     en el kiosco —tasas, servicios— es lo de esa sede.
 *   · **Cuándo vence y si ya se usó.** Lo comprueba la red con su reloj, y el
 *     canje la gasta en el mismo acto en que la comprueba, así que dos cajas no
 *     pueden atender la misma solicitud.
 *
 * Una solicitud no es una operación: no mueve efectivo ni toca ninguna caja.
 */

import { almacen } from "./almacen";
import type { KioskRequest, KioskRequestInput } from "@/features/kiosk/self-service-request";

/** Lo que una solicitud espera en caja antes de que el cliente tenga que pedir otra. */
export const VIGENCIA_DE_SOLICITUD_MINUTOS = 30;

interface Almacen {
  solicitudes: KioskRequest[];
  /** Último número emitido por día (`AAMMDD`), para que el código no se repita. */
  secuencias: Record<string, number>;
}

const datos = almacen<Almacen>("solicitudes-de-kiosco", () => ({ solicitudes: [], secuencias: {} }));

/** `KS-AAMMDD-NNNNNN`, con la fecha de Cuba: el día del cliente, no el del servidor. */
function emitirCodigo(now: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Havana",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "00";
  const dia = `${parte("year")}${parte("month")}${parte("day")}`;
  const siguiente = (datos.secuencias[dia] ?? 100) + 1;
  datos.secuencias[dia] = siguiente;
  return `KS-${dia}-${String(siguiente).padStart(6, "0")}`;
}

/**
 * Registra lo que el cliente preparó. Quien llama ya comprobó que el kiosco
 * está vinculado, que su sede opera y que ofrece el servicio; aquí solo se
 * sella con su sede, su kiosco, su código y su vigencia.
 */
export function registrarSolicitudDeKiosco(
  origen: { branchId: string; deviceId: string },
  input: KioskRequestInput,
  now = new Date(),
): KioskRequest {
  const solicitud = {
    ...input,
    code: emitirCodigo(now),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + VIGENCIA_DE_SOLICITUD_MINUTOS * 60_000).toISOString(),
    consumedAt: null,
    branchId: origen.branchId,
    deviceId: origen.deviceId,
  } as KioskRequest;
  datos.solicitudes.push(solicitud);
  return solicitud;
}

export type MotivoDeSolicitudNoValida =
  | "no-encontrada"
  | "vencida"
  | "usada"
  /** Se preparó en el kiosco de otra sede. */
  | "otra-sede";

export type ConsultaDeSolicitud =
  | { ok: true; solicitud: KioskRequest }
  | { ok: false; motivo: MotivoDeSolicitudNoValida; sede?: string };

function normalizar(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Lo que ve el trabajador al teclear el código. Es una pantalla de personal,
 * no de cliente: cada motivo se dice por separado, porque saber si el código
 * está mal tecleado, vencido, usado o es de otra sede le dice qué contestar
 * (al revés que la búsqueda de remesas y giros, que no distingue nada [R4]).
 */
export function consultarSolicitudDeKiosco(
  branchId: string,
  code: string,
  now = new Date(),
): ConsultaDeSolicitud {
  const solicitud = datos.solicitudes.find((s) => s.code === normalizar(code));
  if (!solicitud) return { ok: false, motivo: "no-encontrada" };
  if (solicitud.branchId !== branchId) return { ok: false, motivo: "otra-sede", sede: solicitud.branchId };
  if (solicitud.consumedAt) return { ok: false, motivo: "usada" };
  if (new Date(solicitud.expiresAt).getTime() <= now.getTime()) return { ok: false, motivo: "vencida" };
  return { ok: true, solicitud };
}

/**
 * Gasta la solicitud. Vuelve a comprobarla en el mismo acto: entre que el
 * trabajador la leyó y pulsa Continuar pudo vencer o canjearla otra caja.
 */
export function canjearSolicitudDeKiosco(
  branchId: string,
  code: string,
  now = new Date(),
): ConsultaDeSolicitud {
  const consulta = consultarSolicitudDeKiosco(branchId, code, now);
  if (!consulta.ok) return consulta;
  consulta.solicitud.consumedAt = now.toISOString();
  return consulta;
}

