"use client";

import * as React from "react";

import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { tarifaDelTramo } from "@/components/patterns/tarifa-de-giro";
import { inicioDeTramo } from "@/features/network/tarifas-reglas";
import { importe, textoDelTramo } from "@/lib/formato-de-tarifa";
import { useTarifas, type SedePublica } from "../tableros";
import { SlideHeading } from "./slide-tasas";

/**
 * "Tarifas de giros" — lo mismo que la pantalla de consulta del kiosco
 * (`/kiosk/autoservicio/tarifas`), con el formato de un televisor: una columna
 * por moneda, cada una con su giro mínimo y sus tramos. De cada sede, las suyas
 * (`tarifasPublicas`); sin ninguna, la diapositiva no entra en la rotación.
 * Los tamaños son `em` de la base de la pantalla, como en las demás.
 */
export function SlideTarifas({ sede }: { sede: SedePublica }): React.JSX.Element {
  const tarifas = useTarifas(sede.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SlideHeading eyebrow="PuntoCash · Enviar un giro" title="Tarifas de giros" />

      <div className="mt-[1.5em] grid min-h-0 flex-1 grid-cols-[repeat(auto-fit,minmax(16em,1fr))] gap-[1.2em]">
        {tarifas.map((t) => (
          <section
            key={t.moneda}
            aria-label={`Tarifa de giros en ${t.moneda}`}
            className="flex min-h-0 flex-col overflow-hidden rounded-card border border-white/10 bg-white/[0.04]"
          >
            <div className="flex shrink-0 items-center gap-[0.9em] border-b border-white/10 px-[1.2em] py-[0.9em]">
              <CurrencyFlag currency={t.moneda} className="h-[1.5em] w-[2.15em]" />
              <span className="flex min-w-0 flex-col">
                <span className="text-[1.3em] font-bold leading-tight text-white">{t.moneda}</span>
                <span className="truncate text-[0.85em] leading-snug text-text-on-primary-muted">{t.nombre}</span>
              </span>
            </div>

            <p className="shrink-0 border-b border-white/10 px-[1.2em] py-[0.7em] text-[0.85em] text-text-on-primary-muted">
              Giro mínimo <span className="pc-numeric font-semibold text-white">{importe(t.minimo)} {t.moneda}</span>
            </p>

            <div className="grid min-h-0 flex-1 auto-rows-fr">
              {t.tramos.map((tramo, i) => (
                <div
                  key={i}
                  className="flex flex-col justify-center gap-[0.2em] border-b border-white/10 px-[1.2em] py-[0.5em] last:border-b-0"
                >
                  <span className="pc-numeric text-[0.9em] leading-snug text-text-on-primary-muted">
                    {textoDelTramo({ ...tramo, ...inicioDeTramo(t, i) })}
                  </span>
                  <span className="pc-numeric text-[1.6em] font-bold leading-none tracking-[-0.02em] text-gold">
                    {tarifaDelTramo(tramo, t.moneda)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-[1em] shrink-0 text-[0.85em] leading-snug text-text-on-primary-muted">
        La paga quien envía, al enviar, sobre lo que recibe quien cobra. Cobrar un giro no tiene tarifa. Las fija PuntoCash
        y son iguales en todas las sucursales.
      </p>
    </div>
  );
}
