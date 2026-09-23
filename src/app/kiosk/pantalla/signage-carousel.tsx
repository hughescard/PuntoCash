"use client";

import * as React from "react";

import type { Branch } from "@/features/branches/branches";

import { SlideTasas } from "./slides/slide-tasas";
import { SlideSucursal } from "./slides/slide-sucursal";
import { SlidePromociones } from "./slides/slide-promociones";

/** How long each slide stays on screen before the carousel advances. */
const ROTATE_MS = 12_000;

const SLIDES: readonly {
  id: string;
  label: string;
  Component: React.ComponentType<{ branch: Branch }>;
}[] = [
  { id: "tasas", label: "Tasas del día", Component: SlideTasas },
  { id: "sucursal", label: "Info de la sucursal", Component: SlideSucursal },
  { id: "promociones", label: "Promociones y avisos", Component: SlidePromociones },
];

/**
 * Auto-rotating carousel for `/kiosk/pantalla`.
 *
 * Nobody navigates this screen — the only key it listens to is Atrás/Esc,
 * to change its sede (see `signage-screen.tsx`) — so rotation is the only
 * navigation its content gets. Recommended over a single fixed view because
 * three genuinely different kinds of
 * information (rates, branch info, promotions) compete for the same space,
 * and none of them should permanently crowd out the others.
 *
 * The position dots are decorative only: nothing here is a button, and
 * nothing on this screen ever expects to be touched.
 */
export function SignageCarousel({ branch }: { branch: Branch }): React.JSX.Element {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => setIndex((current) => (current + 1) % SLIDES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const current = SLIDES[index]!;
  const { Component } = current;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* No sighted TV viewer needs this, but a demo shipped to developers
          should not model an unattended screen as accessibility-exempt. */}
      <p className="sr-only" aria-live="polite">
        {current.label}
      </p>

      <div key={current.id} className="flex min-h-0 flex-1 flex-col animate-in fade-in duration-700">
        <Component branch={branch} />
      </div>

      <div aria-hidden="true" className="mt-[1.25em] flex shrink-0 items-center justify-center gap-[0.6em]">
        {SLIDES.map((slide, i) => (
          <span
            key={slide.id}
            className={
              i === index
                ? "h-[0.5em] w-[1.6em] rounded-pill bg-gold transition-colors duration-300"
                : "h-[0.5em] w-[0.5em] rounded-pill bg-white/20 transition-colors duration-300"
            }
          />
        ))}
      </div>
    </div>
  );
}
