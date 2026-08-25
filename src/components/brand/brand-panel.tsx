import * as React from "react";

import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "./logo";

/**
 * Navy brand panel for full-screen authentication layouts.
 *
 * This is the one place in the product where the physical-brand treatment
 * applies — "navy oscuro + dorado + blanco; alta presencia de marca" (§7). The
 * working surface next to it stays light, so the application as a whole is
 * never predominantly dark (§6).
 *
 * The composition is built from the official isotype rather than from generic
 * ornament: an oversized, very low-contrast pin watermark, and gold hairline
 * arcs struck from the bottom-left corner. Gold stays a line accent and never
 * becomes a surface (§3).
 */
export interface BrandPanelProps {
  /** Opening words of the headline, rendered in gold. */
  highlight: string;
  /** Remainder of the headline, rendered in white. */
  headline: string;
  supporting: string;
  className?: string;
}

export function BrandPanel({
  highlight,
  headline,
  supporting,
  className,
}: BrandPanelProps): React.JSX.Element {
  return (
    <section
      className={cn(
        // Asymmetric vertical padding lifts the centred brand group slightly
        // above the optical middle, which reads as deliberate rather than
        // merely centred.
        "relative isolate flex flex-col justify-center overflow-hidden bg-primary px-16 pt-12 pb-28",
        className,
      )}
    >
      {/* Oversized isotype watermark — texture, not an object. Kept faint
          enough that it never competes with the logo or the headline. */}
      <LogoMark
        variant="mono"
        className="pointer-events-none absolute -right-20 top-1/2 -z-10 h-[38rem] -translate-y-1/2 text-white/[0.016]"
      />

      {/* Gold hairline arcs struck from the bottom-left corner. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className="pointer-events-none absolute -bottom-16 -left-16 -z-10 size-[30rem]"
        fill="none"
      >
        {[150, 200, 250, 300, 350].map((r, i) => (
          <path
            key={r}
            d={`M 0 ${400 - r} A ${r} ${r} 0 0 1 ${r} 400`}
            stroke="var(--color-gold)"
            strokeWidth="1"
            strokeOpacity={0.42 - i * 0.06}
          />
        ))}
      </svg>

      {/* Wide enough to keep the headline on a single line at 1280px. The
          internal steps are deliberately tight so the logo, rule, headline and
          supporting line read as one group rather than four stacked items. */}
      <div className="relative flex max-w-xl flex-col">
        <Logo variant="onDark" size="2xl" showDescriptor />

        {/* Gold rule with a centred node — the "punto" of the brand. Held to
            ~62% of the panel so it accents the group instead of underlining the
            whole panel. The panel is 55vw, so 34vw keeps that ratio at every
            width instead of drifting; the column's max-width still caps it. */}
        <div aria-hidden="true" className="mt-10 flex w-[34vw] max-w-full items-center gap-0">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/50" />
          <span className="size-1.5 rounded-pill bg-gold" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/50" />
        </div>

        <h2 className="mt-8 text-screen-title text-white">
          <span className="text-gold">{highlight}</span> {headline}
        </h2>

        <p className="mt-3 text-body text-text-on-primary-muted">{supporting}</p>
      </div>
    </section>
  );
}
