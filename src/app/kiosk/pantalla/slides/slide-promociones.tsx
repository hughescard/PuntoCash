import * as React from "react";
import { Megaphone } from "lucide-react";

import { PROMOTIONS } from "@/features/kiosk/signage-data";
import { SlideHeading } from "./slide-tasas";

/**
 * "Promociones / avisos" — short, TV-legible cards, one per promotion.
 * Side by side on a landscape TV, stacked on a vertical screen.
 */
export function SlidePromociones(): React.JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SlideHeading eyebrow="PuntoCash" title="Promociones y avisos" />

      <div className="mt-[1.5em] grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-[1.25em] landscape:grid-cols-2">
        {PROMOTIONS.map((promo) => (
          <div
            key={promo.id}
            className="flex min-h-0 flex-col justify-center gap-[1.25em] overflow-hidden rounded-card border border-white/10 bg-white/[0.04] p-[2em]"
          >
            <span
              aria-hidden="true"
              className="grid size-[3.25em] shrink-0 place-items-center rounded-pill bg-gold/15 text-gold"
            >
              <Megaphone className="size-[1.6em]" />
            </span>
            <div>
              <p className="text-[1.8em] font-bold leading-tight text-white">{promo.title}</p>
              <p className="mt-[0.6em] text-[1.15em] leading-snug text-text-on-primary-muted">
                {promo.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
