"use client";

import * as React from "react";

import { Alert } from "@/components/ui";
import { useVistaDeCaja } from "@/features/worker/caja-context";

/**
 * Las alertas de la caja, **sin cifras** (bloque 6): le dicen al trabajador que
 * algo pide la atención de su supervisor —efectivo bajo o alto en una moneda,
 * pocos billetes de una denominación— y a nadie más que a él. Cuánto hay y cuál
 * es el límite lo ve la administración; Worker no ve saldos.
 *
 * Es un estado: aparece mientras la condición se cumple y se va sola cuando
 * el supervisor repone, retira o cambia billetes.
 */
export function AlertasDeCaja(): React.JSX.Element | null {
  const { alertas } = useVistaDeCaja();
  if (alertas.length === 0) return null;
  return (
    <Alert variant="warning" title={alertas.length === 1 ? "Aviso de tu caja" : `${alertas.length} avisos de tu caja`}>
      <ul className="list-disc pl-5" aria-label="Alertas de la caja">
        {alertas.map((a) => (
          <li key={a.clave}>{a.texto}</li>
        ))}
      </ul>
      <p className="mt-2">Avisa a tu supervisor para que reponga, retire o cambie billetes.</p>
    </Alert>
  );
}
