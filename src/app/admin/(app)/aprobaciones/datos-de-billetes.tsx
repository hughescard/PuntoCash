import * as React from "react";

import { BilletesDelMovimiento } from "@/components/patterns/billetes-del-movimiento";
import { lineas } from "@/features/caja/billetes";
import { todasLasDenominaciones } from "@/features/network/denominaciones";
import type { Solicitud } from "@/features/network/aprobaciones";

/**
 * Lo que añade una solicitud desde que la caja lleva billetes (decisión del
 * 9/11/2026): el supervisor y el momento de un movimiento de fondos, y los
 * billetes de la diferencia —en una de composición, qué cambió sin que cambie
 * el total—. Va dentro de la lista de datos de la solicitud, en Admin y en
 * Super Admin.
 */
const ORIGEN: Record<NonNullable<Solicitud["origen"]>, string> = {
  jornada: "Durante la jornada",
  apertura: "Al abrir la jornada",
  cierre: "Al cerrar la jornada",
};

export function DatosDeBilletes({ s }: { s: Solicitud }): React.JSX.Element {
  const filas = s.billetes ? lineas(s.billetes).filter((l) => l.cantidad !== 0) : [];
  return (
    <>
      {s.tipo === "fondos" ? (
        <>
          <Dato etiqueta="Supervisor" valor={s.supervisor ?? "—"} />
          {s.origen ? <Dato etiqueta="Cuándo" valor={ORIGEN[s.origen]} /> : null}
        </>
      ) : null}
      {filas.length > 0 ? (
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="text-caption uppercase tracking-wide text-text-secondary">
            {s.tipo === "composicion" || s.diferencia === 0 ? "Billetes que cambiaron (total sin diferencia)" : "Billetes de la diferencia"}
          </dt>
          <dd className="mt-2">
            <BilletesDelMovimiento billetes={s.billetes} currency={s.currency} tipos={todasLasDenominaciones(s.currency)} />
          </dd>
        </div>
      ) : null}
    </>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption uppercase tracking-wide text-text-secondary">{etiqueta}</dt>
      <dd className="mt-1 text-body text-text-primary">{valor}</dd>
    </div>
  );
}
