import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Flag beside a currency code — manual §15: "con bandera opcional como apoyo
 * visual". The ISO code and name remain the authoritative identifiers; this is
 * supporting information only, so it is always decorative and `aria-hidden`.
 *
 * Drawn as local inline SVG rather than emoji: regional-indicator glyphs depend
 * on an OS emoji font and render as bare letters on Windows, which is not an
 * acceptable dependency for a production terminal.
 *
 * These are deliberately simplified at 20x14 — recognisable at UI sizes without
 * shipping a flag library. Add a new entry here when a currency joins the
 * catalog; a currency with no flag simply renders nothing.
 */

const FLAG_VIEWBOX = "0 0 20 14";

/**
 * Computed coordinates are rounded to a fixed precision before they reach the
 * DOM. Raw float arithmetic serialises differently on the server and the client
 * (3.62250092524069 vs 3.6225009252406903), which React reports as a hydration
 * mismatch.
 */
const round = (value: number): string => value.toFixed(3);

/** Cuba — five stripes, red hoist triangle, white star. */
function CuFlag() {
  return (
    <>
      <rect width="20" height="14" fill="#FFFFFF" />
      <rect width="20" height="2.8" y="0" fill="#002A8F" />
      <rect width="20" height="2.8" y="5.6" fill="#002A8F" />
      <rect width="20" height="2.8" y="11.2" fill="#002A8F" />
      <path d="M0 0 L8.1 7 L0 14 Z" fill="#CF142B" />
      <path d="M2.9 4.55 L3.63 6.35 L5.55 6.48 L4.07 7.72 L4.54 9.59 L2.9 8.56 L1.26 9.59 L1.73 7.72 L0.25 6.48 L2.17 6.35 Z" fill="#FFFFFF" />
    </>
  );
}

/** United States — stripes and canton; stars simplified to a dot grid. */
function UsFlag() {
  const stripes = Array.from({ length: 7 }, (_, i) => (
    <rect key={i} width="20" height="1.077" y={round(i * 2.154)} fill="#B31942" />
  ));
  const stars = Array.from({ length: 8 }, (_, i) => (
    <circle
      key={i}
      cx={round(1.1 + (i % 4) * 2.1)}
      cy={round(1.6 + Math.floor(i / 4) * 2.4)}
      r="0.42"
      fill="#FFFFFF"
    />
  ));

  return (
    <>
      <rect width="20" height="14" fill="#FFFFFF" />
      {stripes}
      <rect width="9" height="7.54" fill="#0A3161" />
      {stars}
    </>
  );
}

/** European Union — twelve gold stars in a circle on blue. */
function EuFlag() {
  const stars = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * Math.PI) / 6 - Math.PI / 2;
    return (
      <circle
        key={i}
        cx={round(10 + Math.cos(angle) * 3.9)}
        cy={round(7 + Math.sin(angle) * 3.9)}
        r="0.62"
        fill="#FFCC00"
      />
    );
  });

  return (
    <>
      <rect width="20" height="14" fill="#003399" />
      {stars}
    </>
  );
}

/** United Kingdom — Union Flag, simplified (no counterchanged diagonals). */
function GbFlag() {
  return (
    <>
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0 L20 14 M20 0 L0 14" stroke="#FFFFFF" strokeWidth="3" />
      <path d="M0 0 L20 14 M20 0 L0 14" stroke="#C8102E" strokeWidth="1.5" />
      <path d="M10 0 V14 M0 7 H20" stroke="#FFFFFF" strokeWidth="4.4" />
      <path d="M10 0 V14 M0 7 H20" stroke="#C8102E" strokeWidth="2.5" />
    </>
  );
}

/** Canada — red/white/red bands, a simplified maple leaf silhouette. */
function CaFlag() {
  return (
    <>
      <rect width="20" height="14" fill="#FFFFFF" />
      <rect width="5" height="14" fill="#FF0000" />
      <rect width="5" height="14" x="15" fill="#FF0000" />
      <path
        d="M10 3.2 L10.6 4.9 L12.1 4.1 L11.7 5.7 L13.3 5.9 L12 7 L13.3 8.1 L11.7 8.3 L12.1 9.9 L10.6 9.1 L10 10.8 L9.4 9.1 L7.9 9.9 L8.3 8.3 L6.7 8.1 L8 7 L6.7 5.9 L8.3 5.7 L7.9 4.1 L9.4 4.9 Z"
        fill="#FF0000"
      />
    </>
  );
}

/** Switzerland — red field, bold white cross. */
function ChFlag() {
  return (
    <>
      <rect width="20" height="14" fill="#D52B1E" />
      <rect width="7.5" height="2.8" x="6.25" y="5.6" fill="#FFFFFF" />
      <rect width="2.8" height="7.5" x="8.6" y="3.25" fill="#FFFFFF" />
    </>
  );
}

/** Mexico — green/white/red thirds, a simplified emblem dot on white. */
function MxFlag() {
  return (
    <>
      <rect width="20" height="14" fill="#FFFFFF" />
      <rect width="6.67" height="14" fill="#006341" />
      <rect width="6.67" height="14" x="13.33" fill="#CE1126" />
      <circle cx="10" cy="7" r="1.3" fill="#8B5E3C" />
    </>
  );
}

/** Japan — white field, centred red sun disc. */
function JpFlag() {
  return (
    <>
      <rect width="20" height="14" fill="#FFFFFF" />
      <circle cx="10" cy="7" r="3.5" fill="#BC002D" />
    </>
  );
}

/** Australia — navy field, a simplified Union Jack canton and star dots. */
function AuFlag() {
  const stars = [
    [15.2, 3.3],
    [16.8, 7.4],
    [15, 10.8],
    [17.8, 10.4],
  ];
  return (
    <>
      <rect width="20" height="14" fill="#00247D" />
      <rect width="9" height="7" fill="#00247D" />
      <path d="M0 0 L9 7 M9 0 L0 7" stroke="#FFFFFF" strokeWidth="1.4" />
      <path d="M0 0 L9 7 M9 0 L0 7" stroke="#CF142B" strokeWidth="0.7" />
      <path d="M4.5 0 V7 M0 3.5 H9" stroke="#FFFFFF" strokeWidth="2" />
      <path d="M4.5 0 V7 M0 3.5 H9" stroke="#CF142B" strokeWidth="1" />
      {stars.map(([cx, cy], i) => (
        <circle key={i} cx={round(cx!)} cy={round(cy!)} r="0.55" fill="#FFFFFF" />
      ))}
    </>
  );
}

/** Colombia — yellow half, blue and red quarters. */
function CoFlag() {
  return (
    <>
      <rect width="20" height="7" fill="#FCD116" />
      <rect width="20" height="3.5" y="7" fill="#003893" />
      <rect width="20" height="3.5" y="10.5" fill="#CE1126" />
    </>
  );
}

/** Chile — white/red bands, blue canton with a single white star. */
function ClFlag() {
  return (
    <>
      <rect width="20" height="7" fill="#FFFFFF" />
      <rect width="20" height="7" y="7" fill="#D52B1E" />
      <rect width="7" height="7" fill="#0039A6" />
      <path d="M3.5 2.3 L4.06 4 L5.8 4 L4.4 5.05 L4.94 6.75 L3.5 5.7 L2.06 6.75 L2.6 5.05 L1.2 4 L2.94 4 Z" fill="#FFFFFF" />
    </>
  );
}

const FLAGS: Readonly<Record<string, () => React.JSX.Element>> = {
  CUP: CuFlag,
  USD: UsFlag,
  EUR: EuFlag,
  GBP: GbFlag,
  CAD: CaFlag,
  CHF: ChFlag,
  MXN: MxFlag,
  JPY: JpFlag,
  AUD: AuFlag,
  COP: CoFlag,
  CLP: ClFlag,
};

export function CurrencyFlag({
  currency,
  className,
}: {
  currency: string;
  className?: string;
}): React.JSX.Element | null {
  const Flag = FLAGS[currency];
  if (!Flag) return null;

  return (
    <svg
      viewBox={FLAG_VIEWBOX}
      aria-hidden="true"
      focusable="false"
      data-currency-flag={currency}
      className={cn("h-3.5 w-5 shrink-0 rounded-[2px] ring-1 ring-black/10", className)}
    >
      <Flag />
    </svg>
  );
}
