import { cajaTieneEquipo } from "@/features/network/devices";
import { jornadaAbiertaDeCaja, jornadaAbiertaDeTrabajador } from "@/features/network/jornadas";
import type { RegisterGuards } from "@/features/network/registers";
import type { WorkerGuards } from "@/features/network/workers";

/**
 * Las comprobaciones que `registers.ts` y `workers.ts` no pueden hacer por sí
 * mismos y piden a quien llama: si una caja o un trabajador tienen jornada
 * abierta, y si una caja tiene equipo vinculado (**FR-AD-CAJA-9**,
 * **FR-AD-CAJA-10**, **FR-AD-TRAB-13**, **FR-AD-TRAB-14**).
 *
 * Se inyectan en vez de importarse allí para que esos módulos no dependan de
 * las jornadas ni de los equipos; este archivo es el sitio donde esas
 * dependencias sí se pueden nombrar. Las tres contestan de verdad: equipos y
 * jornadas viven en el servidor, para toda la red.
 */
export const REGISTER_GUARDS: RegisterGuards = {
  hasOpenJornada: (registerId) => jornadaAbiertaDeCaja(registerId) !== null,
  hasLinkedDevice: cajaTieneEquipo,
};

export const WORKER_GUARDS: WorkerGuards = {
  hasOpenJornada: (workerId) => jornadaAbiertaDeTrabajador(workerId) !== null,
};
