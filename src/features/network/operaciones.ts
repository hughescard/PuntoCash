/**
 * LAS OPERACIONES de la red, vistas desde la administración — Operaciones
 * (**FR-AD-OPS-1** a **FR-AD-OPS-9**).
 *
 * Una operación es el servicio que un trabajador prestó a un cliente: un
 * cambio de moneda, el pago de una remesa, el envío o el pago de un giro. Su
 * forma es **la misma que la del historial de Worker** (`OperationRecord`),
 * para que el detalle se componga con las mismas piezas; aquí se le añade lo
 * que el trabajador no necesita y el mercante sí: la sede, la caja, la
 * jornada en la que se hizo y, si vino de un kiosco, la solicitud que la
 * originó (**FR-AD-OPS-4**).
 *
 * Toda cifra es la que se guardó al completarla (**FR-AD-OPS-6**, **[R9]**).
 *
 * ── De dónde salen ────────────────────────────────────────────────────────
 * Se siembran junto con las jornadas (`jornadas.ts`): cada operación que
 * mueve efectivo deja sus movimientos en el libro de su jornada con el mismo
 * código, y las que no se completaron —rechazadas, fallidas, canceladas— no
 * mueven nada. El almacén vive en `globalThis` por la misma razón que el de
 * las jornadas.
 */

import type { OperationRecord, OperationServiceName } from "@/features/operations/operations-history";

export interface OperacionDeRed extends OperationRecord {
  sedeId: string;
  registerId: string;
  workerId: string;
  jornadaId: string;
  /** Si la operación nació de una solicitud de kiosco (**FR-AD-OPS-4**). */
  origenKiosco?: { solicitud: string; kioscoId: string; kioscoLabel: string };
}

/** Los servicios que la red opera hoy, en el orden en que se ofrecen. */
export const SERVICIOS_DE_RED: readonly OperationServiceName[] = ["Cambio de moneda", "Remesa", "Giros"];

const ALMACEN = globalThis as typeof globalThis & { __puntocashOperaciones?: OperacionDeRed[] };
const operaciones: OperacionDeRed[] = (ALMACEN.__puntocashOperaciones ??= []);

/** Solo la siembra de las jornadas escribe aquí. */
export function registrarOperacionSembrada(op: OperacionDeRed): void {
  operaciones.push(op);
}

export function operacionesDeSede(sedeId: string): readonly OperacionDeRed[] {
  return operaciones.filter((o) => o.sedeId === sedeId);
}

export function operacionPorCodigo(codigo: string): OperacionDeRed | null {
  return operaciones.find((o) => o.codigo === codigo) ?? null;
}

export function operacionesDeJornada(jornadaId: string): readonly OperacionDeRed[] {
  return operaciones.filter((o) => o.jornadaId === jornadaId);
}
