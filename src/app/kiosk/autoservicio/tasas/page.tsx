import * as React from "react";
import type { Metadata } from "next";

import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cifraDeTablero } from "@/lib/format";
import { tableroPublico } from "@/features/network/rates";
import { exigirServicioDeKiosco, getKiosco } from "@/features/kiosk/sesion-servidor";

export const metadata: Metadata = {
  title: "Tasas del día",
  description: "Tasas de cambio vigentes hoy en PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * Consultation-only screen: no action leads anywhere from here. It exists so
 * a client can check the board without starting a service (§21 "consultar
 * información" alongside self-service).
 *
 * El tablero es **el de la sede del kiosco**, leído de `tableroPublico`: lo que
 * su mercante fijó en `/admin/tasas`. La sede sale del vínculo del kiosco, el
 * mismo con el que el layout pinta la cabecera. Una sede que no cambia moneda
 * no tiene tablero, y la pantalla no existe para su kiosco.
 */
export default async function KioskTasasPage(): Promise<React.JSX.Element> {
  await exigirServicioDeKiosco("cambio-moneda");
  const kiosco = await getKiosco();
  const tablero = kiosco.estado === "operando" ? tableroPublico(kiosco.sede.id) : [];

  if (tablero.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center py-8 text-center">
        <p className="text-overline uppercase text-text-secondary">PuntoCash</p>
        <h1 className="mt-2 text-screen-title text-text-primary">Tasas del día</h1>
        <p className="mt-6 text-body text-text-secondary">
          Esta sucursal no publica tasas de cambio en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center py-8">
      <p className="text-overline uppercase text-text-secondary">PuntoCash</p>
      <h1 className="mt-2 text-screen-title text-text-primary">Tasas del día</h1>
      <p className="mt-2 text-body text-text-secondary">Precio en pesos cubanos (CUP)</p>

      <div className="mt-10 w-full overflow-hidden rounded-card border border-border bg-surface">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border bg-surface-subtle px-6 py-4 text-overline uppercase text-text-secondary">
          <span>Moneda</span>
          <span className="text-right">Compra</span>
          <span className="text-right">Venta</span>
        </div>

        {tablero.map((rate) => (
          <div
            key={rate.currency}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border px-6 py-5 last:border-b-0"
          >
            <span className="flex min-w-0 items-center gap-3">
              <CurrencyFlag currency={rate.currency} className="h-5 w-7" />
              <span className="flex flex-col">
                <span className="text-card-title text-text-primary">{rate.currency}</span>
                <span className="text-caption text-text-secondary">{rate.name}</span>
              </span>
            </span>
            <span className="pc-numeric text-right text-amount text-text-primary">
              {cifraDeTablero(rate.buy)}
            </span>
            <span className="pc-numeric text-right text-amount text-text-primary">
              {cifraDeTablero(rate.sell)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-6 text-caption text-text-secondary">
        Tasas informativas, sujetas a cambio sin previo aviso.
      </p>
    </div>
  );
}
