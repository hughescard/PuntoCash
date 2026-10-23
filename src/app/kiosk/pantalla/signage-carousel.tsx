"use client";

import * as React from "react";

import type { Branch } from "@/features/branches/branches";

import { usePromociones, useTablero } from "./tableros";

import { SlideTasas } from "./slides/slide-tasas";
import { SlideSucursal } from "./slides/slide-sucursal";
import { SlidePromocion } from "./slides/slide-promociones";

/** How long each slide stays on screen before the carousel advances. */
const ROTATE_MS = 12_000;

interface Slide {
  id: string;
  label: string;
  render: () => React.ReactNode;
}

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

  /* Una sede sin tasas publicadas —sin Cambio de moneda, o sin ninguna tasa
     fijada— no enseña un tablero vacío: la diapositiva no entra en la
     rotación. Y **cada promoción vigente es su propia diapositiva**, grande,
     porque se lee desde el otro lado de la sala (decisión del 16/10/2026); sin
     ninguna, no hay diapositiva de promociones. */
  const conTasas = useTablero(branch.id).length > 0;
  const promociones = usePromociones(branch.id);
  const slides: Slide[] = [
    ...(conTasas ? [{ id: "tasas", label: "Tasas del día", render: () => <SlideTasas branch={branch} /> }] : []),
    { id: "sucursal", label: "Info de la sucursal", render: () => <SlideSucursal branch={branch} /> },
    ...promociones.map((promo) => ({
      id: `promo-${promo.id}`,
      label: promo.titulo,
      render: () => <SlidePromocion promo={promo} />,
    })),
  ];

  React.useEffect(() => {
    const id = setInterval(() => setIndex((current) => current + 1), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const current = slides[index % slides.length]!;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* No sighted TV viewer needs this, but a demo shipped to developers
          should not model an unattended screen as accessibility-exempt. */}
      <p className="sr-only" aria-live="polite">
        {current.label}
      </p>

      <div key={current.id} className="flex min-h-0 flex-1 flex-col animate-in fade-in duration-700">
        {current.render()}
      </div>

      <div aria-hidden="true" className="mt-[1.25em] flex shrink-0 items-center justify-center gap-[0.6em]">
        {slides.map((slide) => (
          <span
            key={slide.id}
            className={
              slide.id === current.id
                ? "h-[0.5em] w-[1.6em] rounded-pill bg-gold transition-colors duration-300"
                : "h-[0.5em] w-[0.5em] rounded-pill bg-white/20 transition-colors duration-300"
            }
          />
        ))}
      </div>
    </div>
  );
}
