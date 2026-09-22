import * as React from "react";
import type { Metadata } from "next";

import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatAmount } from "@/lib/format";
import { PUBLIC_RATE_BOARD } from "@/features/kiosk/signage-data";

export const metadata: Metadata = {
  title: "Tasas del día",
  description: "Tasas de cambio vigentes hoy en PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * Consultation-only screen: no action leads anywhere from here. It exists so
 * a client can check the board without starting a service (§21 "consultar
 * información" alongside self-service).
 */
export default function KioskTasasPage(): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center py-8">
      <p className="text-overline uppercase text-text-secondary">PuntoCash</p>
      <h1 className="mt-2 text-screen-title text-text-primary">Tasas del día</h1>
      <p className="mt-2 text-body text-text-secondary">Precio en pesos cubanos (CUP)</p>

      <div className="mt-10 w-full overflow-hidden rounded-card border border-border bg-surface">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border bg-surface-subtle px-6 py-4 text-overline uppercase text-text-secondary">
          <span>Moneda</span>
          <span className="text-right">Compra</span>
          <span className="text-right">Venta</span>
        </div>

        {PUBLIC_RATE_BOARD.map((rate) => (
          <div
            key={rate.currency}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border px-6 py-5 last:border-b-0"
          >
            <span className="flex min-w-0 items-center gap-3">
              <CurrencyFlag currency={rate.currency} className="h-5 w-7" />
              <span className="flex flex-col">
                <span className="text-card-title text-text-primary">{rate.currency}</span>
                <span className="text-caption text-text-secondary">{rate.name}</span>
              </span>
            </span>
            <span className="pc-numeric text-right text-amount text-text-primary">
              {formatAmount(rate.buy, 0)}
            </span>
            <span className="pc-numeric text-right text-amount text-text-primary">
              {formatAmount(rate.sell, 0)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-6 text-caption text-text-secondary">
        Tasas informativas, sujetas a cambio sin previo aviso.
      </p>
    </div>
  );
}
