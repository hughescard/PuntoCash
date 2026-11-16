import * as React from "react";
import { Calculator, TrendingDown, TrendingUp } from "lucide-react";

import { DetailCard, DetailList, DetailRow } from "@/app/worker/(app)/operaciones/[codigo]/detail-parts";
import { cn } from "@/lib/utils";
import { formatSignedAmount } from "@/lib/format";
import type { CajaMovement } from "@/features/caja/caja-data";
import { EstadoDeAprobacion } from "./fund-movement-detail";

/**
 * "Detalle del ajuste" — the specialized detail for `concepto === "Ajuste de
 * efectivo"`. This is the primary reason this whole detail screen exists:
 * the worker must be able to retrieve the adjustment's reason and
 * observations after the original confirmation flow is long over — every
 * value here comes from the persisted movement record, never recomputed or
 * re-validated. Worker opera a ciegas (decisión del 6/11/2026): aquí no hay
 * saldo esperado ni efectivo contado, solo la diferencia, el motivo y las
 * observaciones. The reason/difference compatibility rule already lives in
 * the domain (`isReasonCompatibleWithDifference`); this screen only reads
 * what was stored, it does not re-enforce it.
 */
export function CashAdjustmentDetail({ movement }: { movement: CajaMovement }): React.JSX.Element {
  const diferencia = movement.amount;
  const tone = diferencia > 0 ? "success" : diferencia < 0 ? "error" : "neutral";
  const Icon = diferencia > 0 ? TrendingUp : diferencia < 0 ? TrendingDown : null;


  return (
    <DetailCard title={movement.concepto === "Ajuste de cierre" ? "Detalle del ajuste de cierre" : "Detalle del ajuste"} icon={Calculator} contentClassName="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
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

      <DetailList>
        {/* El motivo se da justo después de contar; si no llegó, así lo ve también la administración. */}
        <DetailRow label="Motivo" value={movement.motivo ?? "Sin explicar"} strong />
        {movement.observaciones ? <DetailRow label="Observaciones" value={movement.observaciones} /> : null}
        {movement.aprobacion ? (
          <div className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-body-sm text-text-secondary">Aprobación</dt>
            <dd>
              <EstadoDeAprobacion aprobacion={movement.aprobacion} deFondos={!!movement.supervisor} />
            </dd>
          </div>
        ) : null}
      </DetailList>
    </DetailCard>
  );
}
