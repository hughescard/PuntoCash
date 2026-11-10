import * as React from "react";

import { formatoDeDenominacion, lineas } from "@/features/caja/billetes";
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
          <dd className="mt-1">
            <ul className="flex flex-wrap gap-2" aria-label="Billetes de la solicitud">
              {filas.map((l) => (
                <li key={l.valor} className="pc-numeric rounded-control border border-border bg-surface-subtle px-2.5 py-1 text-body-sm text-text-primary">
                  {l.cantidad > 0 ? "+" : "−"}
                  {Math.abs(l.cantidad)} de {formatoDeDenominacion(l.valor)} {s.currency}
                </li>
              ))}
            </ul>
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
