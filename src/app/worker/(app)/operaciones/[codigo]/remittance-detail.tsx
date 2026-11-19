import { BanknoteArrowDown, ClipboardList, UserRound } from "lucide-react";

import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatDateTime, formatMoney } from "@/lib/format";
import { DELIVERY_METHOD_LABEL, REMITTANCE_STATUS_LABEL } from "@/features/remittances/remittance-provider";
import type { OperationRecord } from "@/features/operations/operations-history";
import { entregadoAlCliente, difiereDeLoDebido } from "@/features/operations/entregado";
import { DetailCard, DetailList, DetailRow } from "./detail-parts";
import { CuentaDeEfectivo, filasDeUnPago, salidasDeUnPago } from "./cuenta-de-efectivo";

export function RemittanceDetail({ operation }: { operation: OperationRecord }): React.JSX.Element | null {
  const snapshot = operation.remittance;
  if (!snapshot) return null;
  return <div className="flex flex-col gap-6"><div className="grid gap-6 xl:grid-cols-2"><DetailCard title="Beneficiario" icon={UserRound}><DetailList><DetailRow label="Nombre completo" value={snapshot.beneficiaryName} /><DetailRow label="Documento de identidad" value={snapshot.beneficiaryIdentification} numeric /></DetailList></DetailCard><DetailCard title="Operación" icon={ClipboardList}><DetailList><DetailRow label="Código de operación" value={operation.codigo} numeric /><DetailRow label="Servicio" value="Remesa" /><DetailRow label="Fecha y hora" value={formatDateTime(new Date(operation.fechaHora))} numeric /><DetailRow label="Trabajador" value={operation.worker} /><DetailRow label="Caja" value={operation.caja} /></DetailList></DetailCard></div><DetailCard title="Remesa" icon={BanknoteArrowDown}><DetailList><DetailRow label="Código de remesa" value={snapshot.code} numeric />{snapshot.reference ? <DetailRow label="Referencia" value={snapshot.reference} numeric /> : null}<DetailRow label="Método de entrega" value={DELIVERY_METHOD_LABEL[snapshot.deliveryMethod]} />{difiereDeLoDebido({ amount: snapshot.payoutAmount, currency: snapshot.payoutCurrency }, operation.liquidacion) ? <DetailRow label="Importe de la remesa" value={formatMoney({ amount: snapshot.payoutAmount, currency: snapshot.payoutCurrency })} numeric /> : null}<DetailRow label="Importe entregado" value={entregadoAlCliente({ amount: snapshot.payoutAmount, currency: snapshot.payoutCurrency }, operation.liquidacion).map(formatMoney).join(" + ")} numeric strong /><DetailRow label="Moneda" value={<span className="inline-flex items-center gap-2"><CurrencyFlag currency={snapshot.payoutCurrency} />{snapshot.payoutCurrency} · {currencyName(snapshot.payoutCurrency)}</span>} /><DetailRow label="Estado de la remesa" value={REMITTANCE_STATUS_LABEL[snapshot.externalStatus]} strong /></DetailList></DetailCard><CashMovement operation={operation} /></div>;
}

/**
 * Lo que se debía al beneficiario y cómo se le pagó, con lo que salió de la
 * caja debajo, por moneda: la misma cuenta que el cobro de un giro (19/11/2026).
 * Sin saldos: Worker opera a ciegas (6/11/2026).
 */
function CashMovement({ operation }: { operation: OperationRecord }) {
  const money = operation.amount.kind === "single" ? operation.amount.money : undefined;
  if (!money) return null;
  const r = operation.remittance!;
  const debido = { amount: r.payoutAmount, currency: r.payoutCurrency };
  return (
    <CuentaDeEfectivo
      filas={filasDeUnPago(debido, "Importe de la remesa", operation.liquidacion, "Entregado al beneficiario")}
      movimientos={salidasDeUnPago(debido, operation.liquidacion)}
      servicio="Remesa"
      pie={
        <div className="grid grid-cols-1 gap-x-10 xl:grid-cols-2">
          <DetailList>
            <DetailRow label="Moneda" value={`${money.currency} · ${currencyName(money.currency)}`} />
          </DetailList>
          <DetailList>
            <DetailRow label="Operación vinculada" value={operation.codigo} numeric />
          </DetailList>
        </div>
      }
    />
  );
}
function currencyName(currency: string) { return ({ CUP: "Peso cubano", USD: "Dólar estadounidense", EUR: "Euro", GBP: "Libra esterlina" } as Record<string, string>)[currency] ?? currency; }
