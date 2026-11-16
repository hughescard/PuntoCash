"use client";

import * as React from "react";
import { ArrowLeftRight, ClipboardCheck, HandCoins, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui";
import { DetailCard } from "@/app/worker/(app)/operaciones/[codigo]/detail-parts";
import { BilletesDelMovimiento } from "@/components/patterns/billetes-del-movimiento";
import type { Denominacion } from "@/features/caja/billetes";
import type { CajaMovement } from "@/features/caja/caja-data";
import { formatDateTime, formatSignedAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Lo propio de los movimientos del bloque 3 en el detalle de Worker:
 * reposiciones, retiros y cambios de billetes, y los recuentos que pidió el
 * sistema. Y, en todo lo que pasó por Aprobaciones, en qué quedó (decisión
 * del 10/11/2026): no es un saldo, y así el trabajador sabe si tiene una
 * incidencia.
 */

/** En qué quedó lo que pasó por Aprobaciones. */
export function EstadoDeAprobacion({
  aprobacion,
  deFondos = false,
}: {
  aprobacion: NonNullable<CajaMovement["aprobacion"]>;
  /** Un movimiento de fondos se confirma; una diferencia se aprueba. */
  deFondos?: boolean;
}): React.JSX.Element {
  const { estado, at, por } = aprobacion;
  const texto = deFondos
    ? { aprobada: "Confirmado", rechazada: "Rechazado", pendiente: "Pendiente de confirmar" }
    : { aprobada: "Aprobada", rechazada: "Rechazada", pendiente: "Pendiente de aprobar" };
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Badge variant={estado === "aprobada" ? "success" : estado === "rechazada" ? "error" : "warning"}>
        {texto[estado]}
      </Badge>
      {por && at ? (
        <span className="text-caption text-text-secondary">
          {por} · {formatDateTime(new Date(at))}
        </span>
      ) : null}
    </span>
  );
}

function Fila({ etiqueta, children, fuerte = false }: { etiqueta: string; children: React.ReactNode; fuerte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 first:pt-0 last:border-b-0 last:pb-0">
      <dt className="shrink-0 text-body-sm text-text-secondary">{etiqueta}</dt>
      <dd className={cn("min-w-0 text-right text-body-sm text-text-primary", fuerte ? "font-semibold" : "font-medium")}>{children}</dd>
    </div>
  );
}

const TIPO_DE_FONDOS: Readonly<Record<NonNullable<CajaMovement["fondos"]>, string>> = {
  reposicion: "Reposición: el supervisor trajo efectivo",
  retiro: "Retiro: el supervisor se llevó efectivo",
  cambio: "Cambio de billetes con el supervisor",
};

/** Reposición, retiro o cambio de billetes (con el supervisor o con un cliente). */
export function FundMovementDetail({ movement }: { movement: CajaMovement }): React.JSX.Element {
  const esCambio = movement.tipo === "cambio";
  return (
    <DetailCard title={esCambio ? "Detalle del cambio de billetes" : "Detalle del movimiento de fondos"} icon={esCambio ? ArrowLeftRight : HandCoins}>
      <dl className="flex flex-col">
        <Fila etiqueta="Qué fue" fuerte>
          {movement.fondos ? TIPO_DE_FONDOS[movement.fondos] : "Cambio de billetes con un cliente"}
        </Fila>
        {movement.supervisor ? <Fila etiqueta="Supervisor">{movement.supervisor}</Fila> : null}
        {movement.observaciones ? <Fila etiqueta="Observaciones">{movement.observaciones}</Fila> : null}
        <Fila etiqueta="Confirmación">
          {movement.aprobacion ? <EstadoDeAprobacion aprobacion={movement.aprobacion} deFondos /> : <span className="text-text-secondary">No hace falta</span>}
        </Fila>
      </dl>
    </DetailCard>
  );
}

/** El recuento que pidió el sistema: la diferencia y su motivo, nunca lo que decían los libros. */
export function RecountDetail({ movement, tipos }: { movement: CajaMovement; tipos: readonly Denominacion[] }): React.JSX.Element {
  const { diferencia, composicion } = movement.recuento!;
  const sinDiferencia = diferencia === 0 && !composicion;
  const tono = diferencia > 0 ? "success" : diferencia < 0 ? "error" : sinDiferencia ? "neutral" : "warning";
  const Icon = diferencia > 0 ? TrendingUp : diferencia < 0 ? TrendingDown : null;
  return (
    <DetailCard title="Detalle del recuento" icon={ClipboardCheck} contentClassName="gap-6">
      <p className="text-body-sm text-text-secondary">
        Iban a salir billetes que los libros no tenían, así que se contó esta moneda. La caja quedó con lo contado.
      </p>
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
        <div
          className={cn(
            "flex items-center justify-between gap-4 rounded-control border px-4 py-4",
            tono === "success"
              ? "border-success-border bg-success-subtle text-success-foreground"
              : tono === "error"
                ? "border-error-border bg-error-subtle text-error-foreground"
                : tono === "warning"
                  ? "border-warning-border bg-warning-subtle text-warning-foreground"
                  : "border-border bg-surface-subtle text-text-secondary",
          )}
        >
          <div>
            <p className="text-caption">{diferencia !== 0 ? "Diferencia" : composicion ? "Billetes distintos" : "Sin diferencia"}</p>
            <p className="pc-numeric text-amount font-semibold">
              {diferencia !== 0 ? `${formatSignedAmount(diferencia)} ${movement.currency}` : composicion ? "Total sin diferencia" : "Solo se desglosó"}
            </p>
          </div>
          {Icon ? <Icon className="size-8 shrink-0" aria-hidden="true" /> : null}
        </div>
        <dl className="flex flex-col">
          {sinDiferencia ? null : (
            <Fila etiqueta="Motivo" fuerte>
              {movement.motivo ?? "Sin explicar"}
            </Fila>
          )}
          {movement.observaciones ? <Fila etiqueta="Observaciones">{movement.observaciones}</Fila> : null}
          {movement.aprobacion ? (
            <Fila etiqueta="Aprobación">
              <EstadoDeAprobacion aprobacion={movement.aprobacion} />
            </Fila>
          ) : null}
        </dl>
      </div>
      {composicion ? (
        <div className="flex flex-col gap-3">
          <p className="text-label text-text-primary">Billetes que no coincidían</p>
          <BilletesDelMovimiento
            billetes={composicion}
            currency={movement.currency}
            tipos={tipos}
            nombre="que no coincidían"
            leyenda="En positivo los que había de más; en negativo los que faltaban de lo que decían los libros."
          />
        </div>
      ) : null}
    </DetailCard>
  );
}
