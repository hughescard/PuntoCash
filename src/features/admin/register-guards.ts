import { hasOpenJornada as jornadaAbiertaEnLaCajaSimulada } from "@/features/caja/caja-data";
import { cajaTieneEquipo } from "@/features/network/devices";
import type { RegisterGuards } from "@/features/network/registers";

/**
 * Las dos comprobaciones que `registers.ts` no puede hacer por sí mismo y pide
 * a quien llama: si una caja tiene jornada abierta y si tiene equipo vinculado
 * (**FR-AD-CAJA-9**, **FR-AD-CAJA-10**).
 *
 * Se inyectan en vez de importarse allí para que el dominio siga siendo
 * comprobable fuera de un navegador. Este archivo es el sitio donde esas dos
 * dependencias sí se pueden nombrar.
 *
 * ── Lo que hoy sabe cada una, y lo que no ─────────────────────────────────
 * **El equipo** lo sabe de verdad: `features/network/devices.ts` es el
 * registro central, y responde por cualquier caja de la red.
 *
 * **La jornada, no del todo.** Vive en `caja-data.ts`, que es un mock en
 * memoria de módulo, y los flujos de Worker que la abren corren **en el
 * navegador del trabajador**: mutan la copia del cliente, no la del servidor.
 * Así que desde aquí solo se ve una jornada que haya abierto el propio
 * servidor, que en la práctica es ninguna. La guarda está puesta con su forma
 * definitiva y cableada a lo único que hay; cuando las jornadas se modelen
 * para toda la red (§9) pasa a contestar de verdad sin cambiar de sitio.
 *
 * Mientras tanto, y esto importa: **la retirada de una caja no puede apoyarse
 * en esta guarda para afirmar que no hay jornada abierta.** Las pantallas no
 * anuncian un estado de jornada que no conocen, en lugar de mostrar uno falso.
 */

/** La única caja con datos operativos simulados en la demostración. */
const CAJA_SIMULADA = "sede-vedado:caja-03";

export const REGISTER_GUARDS: RegisterGuards = {
  hasOpenJornada: (registerId) =>
    registerId === CAJA_SIMULADA && jornadaAbiertaEnLaCajaSimulada(),
  hasLinkedDevice: cajaTieneEquipo,
};
