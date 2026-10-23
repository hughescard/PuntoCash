import * as React from "react";
import Link from "next/link";

import { Alert, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { monedaDelCatalogo } from "@/features/network/currencies";
import {
  MONEDA_LOCAL,
  SERVICIO_CAMBIO,
  rangoDe,
  type MotivoSinCotizacion,
} from "@/features/network/rates";
import type { RedEnAlcance } from "@/features/network/scoped-reads";
import type { Sede } from "@/features/network/sedes";
import { TasasDeSede, type SinTasaRow, type TasaRow } from "./tasas-de-sede";

/**
 * El detalle de las tasas de **una** sede, con su edición. Lo pinta
 * `/admin/tasas/[sedeId]`; vive aparte porque un archivo `page.tsx` no puede
 * exportar nada más que la página.
 */

/* -------------------------------------------------------------------------
 * Una sede — FR-AD-TASA-1 a 8 y 10 a 15
 * ---------------------------------------------------------------------- */

const TEXTO_MOTIVO: Record<MotivoSinCotizacion, (code: string) => string> = {
  "sin-servicio": () => "PuntoCash no ha habilitado el Cambio de moneda en esta sede.",
  "moneda-local": () => "El peso cubano no tiene tasa propia.",
  "fuera-de-la-lista": (code) =>
    `${code} no está en la lista de esta sede. Añádela en Monedas antes de fijar su tasa.`,
  "sin-moneda-local": () =>
    "El peso cubano no está en la lista de esta sede, y sin él no se puede cotizar nada.",
  "sin-rango": (code) =>
    `PuntoCash todavía no ha definido un rango para ${code}. Solicítaselo para poder cotizarla.`,
};

export function DetalleDeSede({ red, sede }: { red: RedEnAlcance; sede: Sede }): React.JSX.Element {
  const conServicio = sede.services.includes(SERVICIO_CAMBIO);
  const editable = conServicio && sede.status !== "cerrada";
  const lista = red.monedas(sede.id);
  const tieneCup = lista.some((m) => m.code === MONEDA_LOCAL);

  const definidas = red.tasas(sede.id);
  const conTasa = new Set(definidas.map((t) => t.code));

  const filas: TasaRow[] = definidas.map((t) => {
    const rango = rangoDe(t.code);
    const motivo = red.motivoSinCotizacion(sede.id, t.code);
    return {
      code: t.code,
      name: monedaDelCatalogo(t.code)?.name ?? t.code,
      compra: t.compra,
      venta: t.venta,
      rango: rango
        ? { compra: rango.compra, venta: rango.venta, version: rango.version }
        : null,
      actualizada: `${formatDate(new Date(t.updatedAt))} · ${t.updatedBy}`,
      ...(t.fijadaAlLimite
        ? {
            fijada: {
              fecha: formatDate(new Date(t.fijadaAlLimite.at)),
              anterior: t.fijadaAlLimite.anterior,
            },
          }
        : {}),
      /* Sin el servicio, la razón ya la dice el aviso de arriba para todas. */
      fueraDeVigor: motivo && motivo !== "sin-servicio" ? TEXTO_MOTIVO[motivo](t.code) : null,
    };
  });

  const sinTasa: SinTasaRow[] = lista
    .filter((m) => m.code !== MONEDA_LOCAL && !conTasa.has(m.code))
    .map((m) => {
      const rango = rangoDe(m.code);
      const motivo = red.motivoSinCotizacion(sede.id, m.code);
      return {
        code: m.code,
        name: monedaDelCatalogo(m.code)?.name ?? m.code,
        rango: rango
          ? { compra: rango.compra, venta: rango.venta, version: rango.version }
          : null,
        motivo: motivo ? TEXTO_MOTIVO[motivo](m.code) : null,
      };
    });

  return (
    <>
      <TituloDeSede sede={sede} />

      {/* **FR-AD-TASA-4** y **FR-AD-TASA-14**: la sede no desaparece, dice por
          qué no tiene controles, y lo que tenía se conserva. */}
      {!conServicio ? (
        <Alert variant="info" title="PuntoCash no ha habilitado el Cambio de moneda en esta sede" className="mb-8">
          {filas.length > 0
            ? "Sus tasas se conservan para cuando vuelva a habilitarse, pero no se cotizan ni se muestran en el tablero."
            : "Hasta que lo habilite, esta sede no cotiza ninguna moneda y su tablero no muestra tasas."}
        </Alert>
      ) : !tieneCup ? (
        <Alert variant="warning" title="El peso cubano no está en la lista de esta sede" className="mb-8">
          Todas las tasas se fijan contra el peso cubano.{" "}
          <Link href="/admin/monedas" className="font-semibold underline underline-offset-4">
            Añádelo en Monedas
          </Link>{" "}
          para poder cotizar.
        </Alert>
      ) : null}

      <TasasDeSede
        sede={{ id: sede.id, name: sede.name }}
        filas={filas}
        sinTasa={conServicio ? sinTasa : []}
        editable={editable}
      />
    </>
  );
}

function TituloDeSede({ sede }: { sede: Sede }): React.JSX.Element {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <h2 className="text-section-title text-text-primary">{sede.name}</h2>
      {sede.status === "suspendida" ? <Badge variant="warning">Sede suspendida</Badge> : null}
    </div>
  );
}

