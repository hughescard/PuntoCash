import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Building2, ClipboardList, Zap } from "lucide-react";

import { DetailCard, DetailList, DetailRow } from "@/app/worker/(app)/operaciones/[codigo]/detail-parts";
import { MovementTypeBadge } from "@/app/worker/(app)/caja/caja-movements-table";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { CAJA_SUMMARY, findCajaCurrency, type CajaMovement } from "@/features/caja/caja-data";
import { formatDateTime, formatMoney, formatSignedAmount } from "@/lib/format";

/**
 * Shared building blocks for Cash Movement Detail — the common cards every
 * internal movement gets, whatever its concept. Mirrors the same shell
 * (`DetailCard`/`DetailList`/`DetailRow`) Operation Detail already
 * established, imported directly rather than re-implemented.
 */

export function BackLink(): React.JSX.Element {
  return (
    <Link
      href="/worker/caja"
      className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Volver a Caja
    </Link>
  );
}

/** Identity line: movementId, type badge, timestamp — the approved header composition. */
export function MovementDetailHeader({ movement }: { movement: CajaMovement }): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
      <div className="min-w-0">
        <h1 className="text-screen-title text-text-primary">Movimiento de caja</h1>
        <p className="mt-1 pc-numeric text-body-sm text-text-secondary">{movement.id}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <MovementTypeBadge tipo={movement.tipo} />
        <p className="pc-numeric text-body-sm text-text-secondary">
          {formatDateTime(new Date(movement.fechaHora))}
        </p>
      </div>
    </div>
  );
}

/** "Movimiento" — the record's own identity, from structured data only (never parsed table strings). */
export function MovementInfoCard({ movement }: { movement: CajaMovement }): React.JSX.Element {
  const currency = findCajaCurrency(movement.currency);

  return (
    <DetailCard title="Movimiento" icon={Zap}>
      <DetailList>
        <DetailRow label="ID de movimiento" value={movement.id} numeric />
        <DetailRow label="Concepto" value={movement.concepto} />
        <DetailRow
          label="Tipo"
          value={movement.tipo === "entrada" ? "Entrada" : "Salida"}
          strong
        />
        <DetailRow
          label="Moneda"
          value={
            <span className="inline-flex items-center gap-2">
              <CurrencyFlag currency={movement.currency} />
              {currency ? `${currency.code} · ${currency.name}` : movement.currency}
            </span>
          }
        />
        <DetailRow
          label="Importe"
          value={`${formatSignedAmount(movement.amount)} ${movement.currency}`}
          numeric
          strong
        />
        <DetailRow
          label="Fecha y hora"
          value={formatDateTime(new Date(movement.fechaHora))}
          numeric
        />
      </DetailList>
    </DetailCard>
  );
}

/**
 * "Caja y jornada" — describes the jornada THIS movement belongs to, from
 * its own snapshot (`movement.jornada`), never a live read of whichever
 * jornada happens to be open right now (§8).
 */
export function CashJornadaCard({ movement }: { movement: CajaMovement }): React.JSX.Element {
  const jornada = movement.jornada;

  return (
    <DetailCard title="Caja y jornada" icon={Building2}>
      <DetailList>
        <DetailRow label="Caja" value={jornada?.register ?? CAJA_SUMMARY.register} />
        <DetailRow label="Trabajador" value={jornada?.worker ?? CAJA_SUMMARY.worker} />
        {jornada ? (
          <DetailRow
            label="Jornada"
            value={
              <span className="flex flex-col items-end gap-0.5">
                <span className={jornada.status === "CLOSED" ? "font-semibold text-text-secondary" : "font-semibold text-success-foreground"}>
                  {jornada.status === "CLOSED" ? "Cerrada" : "Abierta"}
                </span>
                <span className="text-caption font-normal text-text-secondary">
                  {jornada.status === "CLOSED" && jornada.closedAt
                    ? `Cerrada el: ${formatDateTime(new Date(jornada.closedAt))}`
                    : `Abierta el: ${formatDateTime(new Date(jornada.openedAt))}`}
                </span>
              </span>
            }
          />
        ) : null}
      </DetailList>
    </DetailCard>
  );
}

/**
 * "Resultado del movimiento" — the accounting before/movement/after
 * relationship. Unlike the Ajustar efectivo entry/review form (which
 * deliberately never duplicates "Efectivo contado" as "Saldo después"), this
 * historical ledger detail intentionally shows all three for audit purposes.
 *
 * "Saldo anterior" only renders when the movement actually carries one
 * (`saldoAntes`) — a Fondeo inicial movement has no meaningful "before" (its
 * whole point is that nothing from the previous jornada carries forward), so
 * it shows only the resulting balance rather than fabricating one.
 */
export function MovementResultCard({ movement }: { movement: CajaMovement }): React.JSX.Element {
  return (
    <DetailCard title="Resultado del movimiento" icon={ClipboardList}>
      <DetailList>
        {movement.saldoAntes !== undefined ? (
          <>
            <DetailRow
              label="Saldo anterior"
              value={formatMoney({ amount: movement.saldoAntes, currency: movement.currency })}
              numeric
            />
            <DetailRow
              label="Movimiento"
              value={`${formatSignedAmount(movement.amount)} ${movement.currency}`}
              numeric
              strong
            />
          </>
        ) : null}
        <DetailRow
          label="Saldo resultante"
          value={
            movement.saldoDespues !== undefined
              ? formatMoney({ amount: movement.saldoDespues, currency: movement.currency })
              : "—"
          }
          numeric
          strong
        />
      </DetailList>
    </DetailCard>
  );
}
