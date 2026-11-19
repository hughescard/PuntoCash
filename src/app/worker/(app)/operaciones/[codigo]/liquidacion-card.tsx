import * as React from "react";
import { Banknote } from "lucide-react";

import type { OperationRecord } from "@/features/operations/operations-history";
import { liquidacionComoLineas } from "../../nueva-operacion/liquidacion";
import { DetailCard, DetailList, DetailRow } from "./detail-parts";

/**
 * Cómo se movió el efectivo cuando no fue exactamente el importe de la
 * operación (bloque 4): el vuelto, lo pagado en CUP por falta de billetes y lo
 * que quedó a favor de la casa, con su causa. No es un saldo. Sin nada de eso,
 * no se pinta.
 */
export function LiquidacionCard({ operation }: { operation: OperationRecord }): React.JSX.Element | null {
  /* El giro enviado lo cuenta en su propia tarjeta, junto a la tarifa y la entrada en caja (19/11/2026). */
  if (operation.transfer?.transferAction === "send") return null;
  const lineas = liquidacionComoLineas(operation.liquidacion);
  if (lineas.length === 0) return null;
  return (
    <DetailCard title="Cómo se movió el efectivo" icon={Banknote}>
      <DetailList>
        {lineas.map((l) => (
          <DetailRow key={l.etiqueta} label={l.etiqueta} value={l.valor} numeric />
        ))}
      </DetailList>
    </DetailCard>
  );
}
