import * as React from "react";

import { formatoDeDenominacion, lineas, totalDe, type Billetes, type Denominacion } from "@/features/caja/billetes";
import { formatSignedAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Los billetes y monedas que movió un movimiento, en dos tablas (billetes y
 * monedas) de mayor a menor: denominación, unidades e importe, con su
 * subtotal. Lo que entra en la caja va en positivo y lo que sale en negativo.
 * Es del movimiento, no de la caja: no dice cuántos hay.
 *
 * `tipos` dice qué denominación es billete y cuál moneda; si alguna no
 * aparece (no debería), se lista con los billetes.
 */
export function BilletesDelMovimiento({
  billetes,
  currency,
  tipos,
}: {
  billetes: Billetes | undefined;
  currency: string;
  tipos: readonly Denominacion[];
}): React.JSX.Element {
  const filas = lineas(billetes);
  if (filas.length === 0) return <p className="text-body-sm text-text-secondary">Sin desglosar</p>;

  const esMoneda = new Set(tipos.filter((d) => d.tipo === "moneda").map((d) => Math.round(d.valor * 100)));
  const grupos = [
    { titulo: "Billetes", filas: filas.filter((l) => !esMoneda.has(Math.round(l.valor * 100))) },
    { titulo: "Monedas", filas: filas.filter((l) => esMoneda.has(Math.round(l.valor * 100))) },
  ].filter((g) => g.filas.length > 0);
  const total = totalDe(billetes);

  return (
    <div role="group" aria-label="Billetes y monedas del movimiento" className="flex flex-col gap-4">
      <div className={cn("grid grid-cols-1 items-start gap-4", grupos.length > 1 && "md:grid-cols-2")}>
        {grupos.map((g) => (
          <div key={g.titulo} className="rounded-control border border-border">
            <table className="w-full table-fixed border-collapse text-body-sm" aria-label={`${g.titulo} del movimiento`}>
              <caption className="border-b border-border bg-surface-subtle px-4 py-2.5 text-left text-label font-semibold text-text-primary">
                {g.titulo}
              </caption>
              <thead>
                <tr className="border-b border-border text-caption text-text-secondary">
                  <th scope="col" className="px-4 py-2 text-left font-normal">Denominación</th>
                  <th scope="col" className="px-4 py-2 text-right font-normal">Unidades</th>
                  <th scope="col" className="px-4 py-2 text-right font-normal">Importe</th>
                </tr>
              </thead>
              <tbody>
                {g.filas.map((l) => (
                  <tr key={l.valor} className="border-b border-border last:border-b-0">
                    <td className="pc-numeric px-4 py-2 font-semibold text-text-primary">
                      {formatoDeDenominacion(l.valor)} <span className="font-normal text-text-secondary">{currency}</span>
                    </td>
                    <td className={cn("pc-numeric px-4 py-2 text-right font-semibold", l.cantidad > 0 ? "text-success-foreground" : "text-text-primary")}>
                      {l.cantidad > 0 ? "+" : "−"}
                      {Math.abs(l.cantidad)}
                    </td>
                    <td className="pc-numeric px-4 py-2 text-right text-text-secondary">
                      {formatSignedAmount(Math.round(l.cantidad * l.valor * 100) / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border pt-3">
        <p className="text-caption text-text-secondary">En positivo lo que entró en la caja; en negativo lo que salió.</p>
        <p className="text-body-sm text-text-secondary">
          Total:{" "}
          <span className="pc-numeric font-semibold text-text-primary">
            {formatSignedAmount(total)} {currency}
          </span>
        </p>
      </div>
    </div>
  );
}
