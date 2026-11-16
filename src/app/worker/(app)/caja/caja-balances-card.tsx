import * as React from "react";
import { Coins } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { findCajaCurrency } from "@/features/caja/caja-data";

/**
 * "Monedas de la caja" — qué monedas tiene la caja, **sin importes**.
 *
 * Worker opera a ciegas (decisión del 6/11/2026): el trabajador sabe con qué
 * monedas trabaja, nunca cuánto efectivo hay. Así su arqueo de cierre es un
 * conteo de verdad y su diferencia contra los libros, suya. Los saldos los ve
 * la administración, en tiempo real, por caja.
 *
 * La bandera acompaña al código; nunca lo sustituye (§15).
 */
export function CajaBalancesCard({ monedas }: { monedas: readonly string[] }): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
          >
            <Coins className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <CardTitle>Monedas de la caja</CardTitle>
            <p className="mt-0.5 text-body-sm text-text-secondary">
              Las monedas con las que opera esta caja. El efectivo se cuenta al abrir y al cerrar la jornada.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {monedas.length === 0 ? (
          <p className="text-body-sm text-text-secondary">Esta caja todavía no tiene monedas.</p>
        ) : (
          <ul aria-label="Monedas de la caja" className="flex flex-wrap gap-2">
            {monedas.map((currency) => (
              <li
                key={currency}
                className="flex items-center gap-2 rounded-control border border-border bg-surface-subtle px-3 py-2 text-body-sm"
              >
                <CurrencyFlag currency={currency} />
                <span className="font-semibold text-text-primary">{currency}</span>
                <span className="text-text-secondary">· {findCajaCurrency(currency)?.name ?? currency}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
