import * as React from "react";
import { Calculator, TrendingDown, TrendingUp } from "lucide-react";

import { DetailCard, DetailList, DetailRow } from "@/app/worker/(app)/operaciones/[codigo]/detail-parts";
import { cn } from "@/lib/utils";
import { formatMoney, formatSignedAmount } from "@/lib/format";
import type { CajaMovement } from "@/features/caja/caja-data";

/**
 * "Detalle del ajuste" — the specialized detail for `concepto === "Ajuste de
 * efectivo"`. This is the primary reason this whole detail screen exists:
 * the worker must be able to retrieve the adjustment's reason and
 * observations after the original confirmation flow is long over — every
 * value here comes from the persisted movement record, never recomputed or
 * re-validated. The reason/difference compatibility rule already lives in
 * the domain (`isReasonCompatibleWithDifference`); this screen only reads
 * what was stored, it does not re-enforce it.
 */
export function CashAdjustmentDetail({ movement }: { movement: CajaMovement }): React.JSX.Element {
  const diferencia = movement.amount;
  const tone = diferencia > 0 ? "success" : diferencia < 0 ? "error" : "neutral";
  const Icon = diferencia > 0 ? TrendingUp : diferencia < 0 ? TrendingDown : null;

  const hasReasonInfo = Boolean(movement.motivo || movement.observaciones);

  return (
    <DetailCard title={movement.concepto === "Ajuste de cierre" ? "Detalle del ajuste de cierre" : "Detalle del ajuste"} icon={Calculator} contentClassName="gap-4">
      <DetailList>
        {movement.saldoAntes !== undefined ? (
          <DetailRow
            label={movement.concepto === "Ajuste de cierre" ? "Saldo esperado" : "Saldo registrado antes del ajuste"}
            value={formatMoney({ amount: movement.saldoAntes, currency: movement.currency })}
            numeric
          />
        ) : null}
        {movement.saldoDespues !== undefined ? (
          <DetailRow
            label="Efectivo contado"
            value={formatMoney({ amount: movement.saldoDespues, currency: movement.currency })}
            numeric
          />
        ) : null}
      </DetailList>

      <div
        className={cn(
          "flex items-center justify-between gap-4 rounded-control border px-4 py-4",
          tone === "success"
            ? "border-success-border bg-success-subtle text-success-foreground"
            : tone === "error"
              ? "border-error-border bg-error-subtle text-error-foreground"
              : "border-border bg-surface-subtle text-text-secondary",
        )}
      >
        <div>
          <p className="text-caption">Diferencia</p>
          <p className="pc-numeric text-amount font-semibold">
            {formatSignedAmount(diferencia)} {movement.currency}
          </p>
        </div>
        {Icon ? <Icon className="size-8 shrink-0" aria-hidden="true" /> : null}
      </div>

      {hasReasonInfo ? (
        <DetailList>
          {movement.motivo ? <DetailRow label="Motivo" value={movement.motivo} strong /> : null}
          {movement.observaciones ? (
            <DetailRow label="Observaciones" value={movement.observaciones} />
          ) : null}
        </DetailList>
      ) : null}
    </DetailCard>
  );
}
