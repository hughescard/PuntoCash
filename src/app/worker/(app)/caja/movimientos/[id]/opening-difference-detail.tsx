"use client";

import * as React from "react";
import { CircleCheck, DoorOpen, TrendingDown, TrendingUp } from "lucide-react";

import { DetailCard } from "@/app/worker/(app)/operaciones/[codigo]/detail-parts";
import { BilletesDelMovimiento } from "@/components/patterns/billetes-del-movimiento";
import type { AperturaDelMovimiento } from "@/features/caja/caja-data";
import type { Denominacion } from "@/features/caja/billetes";
import { formatDateTime, formatMoney, formatSignedAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Lo que pasó al abrir, en el detalle del «Fondeo inicial» (decisión del
 * 10/11/2026): si lo recibido coincidió con lo que declaró quien cerró y, si
 * no, la diferencia y lo que dijo el trabajador. Es la constancia de lo que
 * firmó al recibir la caja. Solo cifras que el trabajador ya vio al abrir:
 * ningún saldo de la caja.
 */
export function OpeningDifferenceDetail({
  apertura,
  currency,
  tipos,
}: {
  apertura: AperturaDelMovimiento;
  currency: string;
  tipos: readonly Denominacion[];
}): React.JSX.Element {
  const { cierreAnterior: ca, diferencia, composicion } = apertura;
  const cerro = `${ca.workerName} · ${formatDateTime(new Date(ca.closedAt))}`;
  const entregadoEtiqueta = ca.sinArqueo ? "En libros al forzar el cierre" : "Entregado";

  if (diferencia === 0 && !composicion) {
    return (
      <DetailCard title="Apertura" icon={DoorOpen}>
        <p className="flex items-start gap-3 rounded-control border border-success-border bg-success-subtle px-4 py-3 text-body-sm text-success-foreground">
          <CircleCheck className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
          <span>
            <span className="block font-semibold">
              {ca.sinArqueo ? "Coincidió con lo que había en libros" : "Coincidió con lo que entregó quien cerró"}
            </span>
            <span className="text-text-secondary">
              {ca.sinArqueo ? "Cierre forzado" : "Cerró"}: {cerro}
            </span>
          </span>
        </p>
      </DetailCard>
    );
  }

  const tono = diferencia > 0 ? "success" : diferencia < 0 ? "error" : "warning";
  const Icon = diferencia > 0 ? TrendingUp : diferencia < 0 ? TrendingDown : null;

  return (
    <DetailCard title="Diferencia con el cierre anterior" icon={DoorOpen} contentClassName="gap-6">
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
        <div
          className={cn(
            "flex items-center justify-between gap-4 rounded-control border px-4 py-4",
            tono === "success"
              ? "border-success-border bg-success-subtle text-success-foreground"
              : tono === "error"
                ? "border-error-border bg-error-subtle text-error-foreground"
                : "border-warning-border bg-warning-subtle text-warning-foreground",
          )}
        >
          <div>
            <p className="text-caption">{diferencia === 0 ? "Billetes distintos" : "Diferencia"}</p>
            <p className="pc-numeric text-amount font-semibold">
              {diferencia === 0 ? "Total sin diferencia" : `${formatSignedAmount(diferencia)} ${currency}`}
            </p>
          </div>
          {Icon ? <Icon className="size-8 shrink-0" aria-hidden="true" /> : null}
        </div>

        <dl className="flex flex-col">
          <Fila etiqueta={entregadoEtiqueta} valor={formatMoney({ amount: apertura.entregado, currency })} numerica />
          <Fila etiqueta="Recibido" valor={formatMoney({ amount: apertura.recibido, currency })} numerica />
          <Fila etiqueta={ca.sinArqueo ? "Cierre forzado" : "Cerró"} valor={cerro} />
          <Fila etiqueta="Motivo" valor={apertura.motivo ?? "Sin explicar"} fuerte />
          {apertura.supervisor ? <Fila etiqueta="Supervisor" valor={apertura.supervisor} /> : null}
          {apertura.observaciones ? <Fila etiqueta="Observaciones" valor={apertura.observaciones} /> : null}
        </dl>
      </div>

      {composicion ? (
        <div className="flex flex-col gap-3">
          <p className="text-label text-text-primary">Billetes que cambiaron</p>
          <BilletesDelMovimiento
            billetes={composicion}
            currency={currency}
            tipos={tipos}
            nombre="que cambiaron al abrir"
            leyenda="En positivo los que recibiste de más; en negativo los que faltaban de lo entregado."
          />
        </div>
      ) : null}
    </DetailCard>
  );
}

/** Como `DetailRow`, pero el texto largo (motivo, observaciones) puede partirse en varias líneas. */
function Fila({ etiqueta, valor, numerica = false, fuerte = false }: { etiqueta: string; valor: string; numerica?: boolean; fuerte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 first:pt-0 last:border-b-0 last:pb-0">
      <dt className="shrink-0 text-body-sm text-text-secondary">{etiqueta}</dt>
      <dd className={cn("min-w-0 text-right text-body-sm text-text-primary", numerica && "pc-numeric", fuerte ? "font-semibold" : "font-medium")}>{valor}</dd>
    </div>
  );
}
