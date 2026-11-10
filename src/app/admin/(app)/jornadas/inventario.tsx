import * as React from "react";
import { ChevronRight } from "lucide-react";

import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatAmount } from "@/lib/format";
import { formatoDeDenominacion, lineas, type Billetes } from "@/features/caja/billetes";

/**
 * Qué billetes y monedas hay en una caja, por moneda: denominación, unidades
 * e importe. Lo que la caja tiene y no consta desglosado (movimientos sin
 * billetes registrados) sale aparte, para que la suma cuadre con el saldo.
 * Una moneda por desplegable, para que una caja con muchas no sea un muro.
 */
export interface InventarioDeMoneda {
  currency: string;
  billetes: Billetes;
  saldo: number;
  sinDesglosar: number;
}

export function InventarioDeCaja({
  inventario,
  abiertoSiUna = true,
  todoAbierto = false,
}: {
  inventario: readonly InventarioDeMoneda[];
  abiertoSiUna?: boolean;
  /** Todas las monedas desplegadas: en la ficha de una caja, que es lo que se viene a ver. */
  todoAbierto?: boolean;
}): React.JSX.Element {
  if (inventario.length === 0) return <p className="text-body-sm text-text-secondary">La caja no tiene monedas habilitadas.</p>;
  return (
    <ul className="flex flex-col divide-y divide-border" aria-label="Billetes y monedas por moneda">
      {inventario.map((m) => {
        const filas = lineas(m.billetes).filter((l) => l.cantidad !== 0);
        const unidades = filas.reduce((s, l) => s + l.cantidad, 0);
        return (
          <li key={m.currency} className="py-1 first:pt-0 last:pb-0">
            <details open={todoAbierto || (abiertoSiUna && inventario.length === 1)} className="group">
              <summary className="flex min-h-control-sm cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-md py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-text-secondary transition-transform group-open:rotate-90" />
                <span className="inline-flex items-center gap-2">
                  <CurrencyFlag currency={m.currency} />
                  <span className="pc-numeric font-semibold">{m.currency}</span>
                </span>
                <span className="pc-numeric ml-auto font-semibold">{formatAmount(m.saldo)}</span>
                <span className="basis-full pl-7 text-caption text-text-secondary sm:basis-auto sm:w-28 sm:pl-0 sm:text-right">
                  {unidades === 1 ? "1 unidad" : `${unidades} unidades`}
                </span>
              </summary>
              <table className="mb-3 w-full table-fixed text-body-sm sm:ml-7 sm:w-[calc(100%-1.75rem)]">
                <caption className="sr-only">Billetes y monedas en {m.currency}</caption>
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[25%]" />
                  <col className="w-[45%]" />
                </colgroup>
                <thead>
                  <tr className="text-left text-caption uppercase tracking-wide text-text-secondary">
                    <th scope="col" className="pb-1 font-medium"><span aria-hidden="true" className="sm:hidden">Valor</span><span className="sr-only sm:not-sr-only">Denominación</span></th>
                    <th scope="col" className="pb-1 pl-4 text-right font-medium"><span aria-hidden="true" className="sm:hidden">Cant.</span><span className="sr-only sm:not-sr-only">Unidades</span></th>
                    <th scope="col" className="pb-1 pl-6 text-right font-medium">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filas.map((l) => (
                    <tr key={l.valor}>
                      <td className="pc-numeric py-1.5">{formatoDeDenominacion(l.valor)}</td>
                      <td className={`pc-numeric py-1.5 pl-4 text-right ${l.cantidad < 0 ? "font-semibold text-error-foreground" : ""}`}>{l.cantidad}</td>
                      <td className="pc-numeric py-1.5 pl-6 text-right">{formatAmount(l.valor * l.cantidad)}</td>
                    </tr>
                  ))}
                  {m.sinDesglosar !== 0 ? (
                    <tr>
                      <td className="py-1.5 text-text-secondary" colSpan={2}>
                        Sin desglosar
                      </td>
                      <td className="pc-numeric py-1.5 pl-6 text-right text-text-secondary">{formatAmount(m.sinDesglosar)}</td>
                    </tr>
                  ) : null}
                  {filas.length === 0 && m.sinDesglosar === 0 ? (
                    <tr>
                      <td className="py-1.5 text-text-secondary" colSpan={3}>
                        Vacía
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
