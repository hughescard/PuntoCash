"use client";

import { useVistaDeCaja } from "@/features/worker/caja-context";
import type { CajaJornada, CajaMovement, CajaSummary } from "./caja-data";

export interface EstadoDeCaja {
  summary: CajaSummary;
  /** Las monedas de la caja, sin importes: Worker opera a ciegas. */
  monedas: readonly string[];
  movimientos: readonly CajaMovement[];
  /** La jornada abierta de esta caja, sea de quien sea; `propia` dice si es de quien opera. */
  jornada: (CajaJornada & { id: string; propia: boolean }) | null;
  /** Hay jornada abierta **de quien opera**: la única con la que se puede trabajar. */
  jornadaAbierta: boolean;
}

/**
 * Lee la caja desde una pantalla. Desde la segunda iteración de Worker la
 * caja vive en el servidor, en la red, y la pantalla recibe su foto del
 * layout (`features/worker/vista.ts`): ya no hay nada que reponer del
 * navegador.
 */
export function useCaja(): EstadoDeCaja {
  const v = useVistaDeCaja();
  return {
    summary: v.summary,
    monedas: v.monedas,
    movimientos: v.movimientos,
    jornada: v.jornada,
    jornadaAbierta: v.jornada?.propia === true,
  };
}
