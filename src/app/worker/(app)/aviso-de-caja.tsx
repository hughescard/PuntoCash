"use client";

import * as React from "react";

import { Alert } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { BloqueoDeCaja } from "@/features/network/caja-operativa";
import { useVistaDeCaja } from "@/features/worker/caja-context";

const BLOQUEO: Readonly<Record<BloqueoDeCaja, string>> = {
  "sede-suspendida": "PuntoCash suspendió la operación de esta sede.",
  "sede-cerrada": "PuntoCash cerró esta sede.",
  "operador-suspendido": "PuntoCash suspendió a la empresa que administra esta sede.",
  "sin-operador": "Esta sede no tiene ahora ninguna empresa que la administre.",
  "caja-retirada": "El administrador retiró esta caja.",
};

/**
 * Lo que le impide a la caja trabajar con normalidad, dicho antes de que el
 * trabajador lo intente:
 *
 *   · la sede no opera: no se registra nada, pero la jornada propia se cierra;
 *   · la caja tiene abierta la jornada de otro trabajador;
 *   · la jornada anterior se cerró sin contar: la apertura será el primer conteo.
 */
export function AvisoDeCaja(): React.JSX.Element | null {
  const v = useVistaDeCaja();
  const j = v.jornada;

  if (v.cierreDeclarado) {
    return (
      <Alert variant="warning" title="Declaraste el arqueo de cierre">
        La jornada ya no registra operaciones. Entra en Arqueo y cierre para explicar las diferencias y confirmar el
        cierre.
      </Alert>
    );
  }

  if (v.bloqueo) {
    return (
      <Alert variant="error" title="No se pueden registrar operaciones">
        {BLOQUEO[v.bloqueo]}{" "}
        {j?.propia
          ? "Haz el arqueo y cierre de tu jornada para dejar la caja contada."
          : "Consulta con el administrador de tu sede."}
      </Alert>
    );
  }

  if (v.jornadaEnOtraCaja && !j?.propia) {
    return (
      <Alert variant="warning" title={`Tienes la jornada abierta en ${v.jornadaEnOtraCaja.cajaNombre}`}>
        La abriste el {formatDateTime(new Date(v.jornadaEnOtraCaja.openedAt))}. Un trabajador opera una sola caja a la
        vez: ciérrala en su equipo antes de trabajar en esta.
      </Alert>
    );
  }

  if (j && !j.propia) {
    return (
      <Alert variant="warning" title={`Esta caja tiene abierta la jornada de ${j.worker}`}>
        Está abierta desde el {formatDateTime(new Date(j.openedAt))}. Solo {j.worker} puede cerrarla; si no va a
        volver, el administrador de la sede puede forzar su cierre.
      </Alert>
    );
  }

  if (!j && v.apertura.cierreAnterior?.forzado) {
    return (
      <Alert variant="warning" title="La jornada anterior se cerró sin contar">
        El administrador forzó el cierre de la jornada de {v.apertura.cierreAnterior.workerName}. Nadie ha contado
        el efectivo desde entonces: tu apertura será el primer conteo.
      </Alert>
    );
  }

  return null;
}
