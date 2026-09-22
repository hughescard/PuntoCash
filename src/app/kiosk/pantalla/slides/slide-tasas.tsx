import * as React from "react";

import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatAmount } from "@/lib/format";
import { PUBLIC_RATE_BOARD } from "@/features/kiosk/signage-data";

/**
 * "Tasas del día" — the same board and copy as the kiosk's own consultation
 * screen (`/kiosk/autoservicio/tasas`), restyled for a dark, high-contrast TV
 * surface rather than duplicating the numbers under a second source of truth.
 *
 * Rows share the available height (`auto-rows-fr`), so the board fills a
 * landscape TV and spreads out on a vertical screen without scrolling.
 * All sizes are `em` of the signage base size (see `../layout.tsx`).
 */
export function SlideTasas(): React.JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SlideHeading eyebrow="PuntoCash" title="Tasas del día" />

      <div className="mt-[1.5em] flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-white/10 bg-white/[0.04]">
        <div className="grid shrink-0 grid-cols-[1fr_auto_auto] items-center gap-x-[1.5em] border-b border-white/10 px-[1.5em] py-[0.9em] text-[0.85em] font-semibold uppercase leading-none tracking-[0.08em] text-text-on-primary-muted">
          <span>Moneda</span>
          <span className="w-[5.3em] text-right">Compra</span>
          <span className="w-[5.3em] text-right">Venta</span>
        </div>

        <div className="grid min-h-0 flex-1 auto-rows-fr">
          {PUBLIC_RATE_BOARD.map((rate) => (
            <div
              key={rate.currency}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-[1.5em] border-b border-white/10 px-[1.5em] py-[0.5em] last:border-b-0"
            >
              <span className="flex min-w-0 items-center gap-[0.9em]">
                <CurrencyFlag currency={rate.currency} className="h-[1.5em] w-[2.15em]" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-[1.3em] font-bold leading-tight text-white">{rate.currency}</span>
                  <span className="truncate text-[0.85em] leading-snug text-text-on-primary-muted">
                    {rate.name}
                  </span>
                </span>
              </span>
              {/* Both figure columns are 4.5em of the base size; the header cells above are 5.3em of their own 0.85em text — the same width. */}
              <span className="w-[4.5em] text-right">
                <span className="pc-numeric text-[2em] font-bold leading-none tracking-[-0.02em] text-white">
                  {formatAmount(rate.buy, 0)}
                </span>
              </span>
              <span className="w-[4.5em] text-right">
                <span className="pc-numeric text-[2em] font-bold leading-none tracking-[-0.02em] text-gold">
                  {formatAmount(rate.sell, 0)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-[1em] shrink-0 text-[0.85em] leading-snug text-text-on-primary-muted">
        Precio en pesos cubanos (CUP) · Tasas informativas, sujetas a cambio sin previo aviso.
      </p>
    </div>
  );
}

export function SlideHeading({ eyebrow, title }: { eyebrow: string; title: string }): React.JSX.Element {
  return (
    <div className="shrink-0">
      <p className="text-[0.95em] font-semibold uppercase leading-tight tracking-[0.16em] text-gold">{eyebrow}</p>
      <h1 className="mt-[0.4em] text-[2.4em] font-bold leading-none tracking-[-0.02em] text-white">{title}</h1>
    </div>
  );
}
