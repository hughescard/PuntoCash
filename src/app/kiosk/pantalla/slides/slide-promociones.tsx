import * as React from "react";
import { Megaphone } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PromocionPublica } from "../tableros";
import { SlideHeading } from "./slide-tasas";

/**
 * Una promoción por diapositiva (**FR-AD-PROM-6**, decisión del 16/10/2026).
 *
 * Grande y sola: se lee desde el otro lado de la sala, y por eso el título y el
 * texto tienen un largo máximo al publicarse (40 y 120 caracteres) en lugar de
 * recortarse aquí. Con imagen (**FR-AD-PROM-12**), la imagen va a la izquierda
 * en una pantalla horizontal y arriba en una vertical, **entera**: se ajusta
 * sin recortarse, porque quien la diseñó puso el texto donde quiso.
 */
export function SlidePromocion({ promo }: { promo: PromocionPublica }): React.JSX.Element {
  const conImagen = Boolean(promo.imagen);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SlideHeading eyebrow="PuntoCash" title="Promociones y avisos" />

      <div
        className={cn(
          "mt-[1.5em] flex min-h-0 flex-1 flex-col gap-[1.5em] overflow-hidden rounded-card border border-white/10 bg-white/[0.04] landscape:flex-row landscape:items-center",
          conImagen ? "justify-center p-[1.5em] landscape:gap-[2em]" : "justify-center p-[2.5em] landscape:gap-[2.5em]",
        )}
      >
        {promo.imagen ? (
          /* En horizontal, la imagen ocupa su mitad entera; en vertical, va
             arriba con su altura natural hasta un tope, y el bloque se centra
             para no dejar un hueco entre la imagen y el texto. */
          <div className="flex min-h-0 justify-center landscape:relative landscape:flex-1 landscape:basis-[55%] landscape:self-stretch">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen subida, servida por la propia aplicación */}
            <img
              src={promo.imagen}
              alt=""
              className="max-h-[55vh] max-w-full rounded-card object-contain landscape:absolute landscape:inset-0 landscape:size-full landscape:max-h-none"
            />
          </div>
        ) : (
          <span
            aria-hidden="true"
            className="grid size-[5.5em] shrink-0 place-items-center rounded-pill bg-gold/15 text-gold"
          >
            <Megaphone className="size-[2.6em]" />
          </span>
        )}
        <div className={cn("min-w-0", conImagen && "shrink-0 landscape:shrink landscape:basis-[45%]")}>
          <p className={cn("font-bold text-white", conImagen ? "text-[2.8em]" : "text-[3.4em]", "leading-tight")}>
            {promo.titulo}
          </p>
          <p
            className={cn(
              "mt-[0.5em] text-text-on-primary-muted",
              conImagen ? "text-[1.7em]" : "text-[2em]",
              "leading-snug",
            )}
          >
            {promo.texto}
          </p>
        </div>
      </div>
    </div>
  );
}
