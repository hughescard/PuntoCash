import * as React from "react";
import type { Metadata } from "next";

import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { tarifaDelTramo } from "@/components/patterns/tarifa-de-giro";
import { inicioDeTramo, tarifasPublicas, type TarifaPublica } from "@/features/network/tarifas";
import { exigirServicioDeKiosco, getKiosco } from "@/features/kiosk/sesion-servidor";
import { importe, textoDelTramo } from "@/lib/formato-de-tarifa";

export const metadata: Metadata = {
  title: "Tarifas de los servicios",
  description: "Lo que cuesta cada servicio de PuntoCash además del importe.",
  robots: { index: false, follow: false },
};

/**
 * Pantalla de consulta, pareja de «Tasas del día»: nada lleva a una operación.
 * Se agrupa **por servicio** —hoy solo Giros lleva tarifa—, de modo que un
 * servicio nuevo con tarifa es un grupo más y no otra pantalla.
 *
 * Las tarifas son **las de la sede del kiosco**: las monedas de su lista en las
 * que PuntoCash definió política, lo mismo que cobraría su caja. Una sede sin
 * Giros no tiene esta pantalla (404), como tampoco tiene la del servicio.
 */
export default async function KioskTarifasPage(): Promise<React.JSX.Element> {
  await exigirServicioDeKiosco("giros");
  const kiosco = await getKiosco();
  const tarifas = kiosco.estado === "operando" ? tarifasPublicas(kiosco.sede.id) : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center py-8">
      <p className="text-overline uppercase text-text-secondary">PuntoCash</p>
      <h1 className="mt-2 text-screen-title text-text-primary">Tarifas de los servicios</h1>
      <p className="mt-2 text-body text-text-secondary">Lo que cuesta cada servicio además del importe</p>

      <section aria-labelledby="tarifa-giros" className="mt-10 w-full">
        <h2 id="tarifa-giros" className="text-card-title font-semibold text-text-primary">
          Enviar un giro
        </h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          La paga quien envía, al enviar. Se calcula sobre lo que recibe quien cobra el giro. Cobrar un giro no tiene
          tarifa.
        </p>

        {tarifas.length === 0 ? (
          <p className="mt-6 rounded-card border border-border bg-surface px-6 py-5 text-body text-text-secondary">
            Esta sucursal no publica tarifas de giros en este momento.
          </p>
        ) : (
          <ul className="mt-6 flex flex-col gap-5">
            {tarifas.map((t) => (
              <TarifaDeMoneda key={t.moneda} tarifa={t} />
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-caption text-text-secondary">
        Las fija PuntoCash y son iguales en todas las sucursales. El cambio de moneda no tiene tarifa: su precio es la tasa.
      </p>
    </div>
  );
}

function TarifaDeMoneda({ tarifa }: { tarifa: TarifaPublica }): React.JSX.Element {
  const { moneda, nombre, minimo, tramos } = tarifa;
  return (
    <li aria-label={`Tarifa de giros en ${moneda}`} className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-surface-subtle px-6 py-4">
        <span className="flex min-w-0 items-center gap-3">
          <CurrencyFlag currency={moneda} className="h-5 w-7" />
          <span className="flex flex-col">
            <span className="text-card-title text-text-primary">{moneda}</span>
            <span className="text-caption text-text-secondary">{nombre}</span>
          </span>
        </span>
        <span className="text-right text-caption text-text-secondary">
          Giro mínimo
          <span className="pc-numeric ml-2 text-body font-semibold text-text-primary">
            {importe(minimo)} {moneda}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-6 py-3 text-overline uppercase text-text-secondary">
        <span>Si quien cobra recibe</span>
        <span className="text-right">Pagas de tarifa</span>
      </div>
      {tramos.map((t, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-6 py-4 last:border-b-0"
        >
          <span className="pc-numeric text-body text-text-primary">
            {textoDelTramo({ ...t, ...inicioDeTramo(tarifa, i) })}
          </span>
          <span className="pc-numeric text-right text-amount text-text-primary">{tarifaDelTramo(t, moneda)}</span>
        </div>
      ))}
    </li>
  );
}
