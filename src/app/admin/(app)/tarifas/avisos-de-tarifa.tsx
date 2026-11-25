"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { Alert, Button } from "@/components/ui";
import { enviarSinReiniciar } from "@/lib/enviar-sin-reiniciar";
import { useHydrated } from "@/lib/use-hydrated";
import { darPorVistoAvisoAction, type ResultadoAviso } from "./_actions";

/**
 * Lo que PuntoCash hizo con una tarifa y nadie de la empresa ha visto todavía.
 * Como la tasa que ajustó PuntoCash: sigue aquí, y en Inicio, hasta que
 * alguien pulsa «Entendido». Los textos llegan hechos del servidor para que
 * Inicio y Tarifas digan lo mismo.
 */
export interface AvisoMostrado {
  moneda: string;
  sedeIds: readonly string[];
  titulo: string;
  detalle: string;
  /** La tarifa que conocía la sede, en una línea; solo si cambió. */
  antes: string | null;
}

export function AvisosDeTarifa({ avisos }: { avisos: readonly AvisoMostrado[] }): React.JSX.Element | null {
  if (avisos.length === 0) return null;
  return (
    <section aria-label="Avisos de PuntoCash sobre las tarifas" className="mb-8 flex flex-col gap-3">
      {avisos.map((a) => (
        <Aviso key={`${a.moneda}-${a.titulo}`} aviso={a} />
      ))}
    </section>
  );
}

function Aviso({ aviso: a }: { aviso: AvisoMostrado }): React.JSX.Element {
  const hydrated = useHydrated();
  const [estado, accion, enviando] = React.useActionState<ResultadoAviso, FormData>(darPorVistoAvisoAction, null);

  return (
    <Alert variant="warning" title={a.titulo}>
      <p>{a.detalle}</p>
      {a.antes ? <p className="mt-1 text-text-secondary">Antes: {a.antes}</p> : null}
      {estado && !estado.ok ? (
        <p role="alert" className="mt-2 font-medium text-error-foreground">
          {estado.error}
        </p>
      ) : null}
      {/* Debajo del texto y no al lado: en el teléfono, al lado lo estrujaba. */}
      <form onSubmit={enviarSinReiniciar(accion)} className="mt-3">
        <input type="hidden" name="moneda" value={a.moneda} />
        {a.sedeIds.map((id) => (
          <input key={id} type="hidden" name="sede" value={id} />
        ))}
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          loading={enviando}
          disabled={!hydrated}
          aria-label={`Entendido: ${a.titulo}`}
        >
          <Check aria-hidden="true" />
          Entendido
        </Button>
      </form>
    </Alert>
  );
}
