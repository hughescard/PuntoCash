import { ArrowRightLeft, BanknoteArrowDown, ClipboardList, UserRound } from "lucide-react";

import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatDateTime, formatMoney } from "@/lib/format";
import { DELIVERY_METHOD_LABEL, REMITTANCE_STATUS_LABEL } from "@/features/remittances/remittance-provider";
import type { OperationRecord } from "@/features/operations/operations-history";
import { entregadoAlCliente, difiereDeLoDebido } from "@/features/operations/entregado";
import { DetailCard, DetailList, DetailRow } from "./detail-parts";

export function RemittanceDetail({ operation }: { operation: OperationRecord }): React.JSX.Element | null {
  const snapshot = operation.remittance;
  if (!snapshot) return null;
  return <div className="flex flex-col gap-6"><div className="grid gap-6 xl:grid-cols-2"><DetailCard title="Beneficiario" icon={UserRound}><DetailList><DetailRow label="Nombre completo" value={snapshot.beneficiaryName} /><DetailRow label="Documento de identidad" value={snapshot.beneficiaryIdentification} numeric /></DetailList></DetailCard><DetailCard title="Operación" icon={ClipboardList}><DetailList><DetailRow label="Código de operación" value={operation.codigo} numeric /><DetailRow label="Servicio" value="Remesa" /><DetailRow label="Fecha y hora" value={formatDateTime(new Date(operation.fechaHora))} numeric /><DetailRow label="Trabajador" value={operation.worker} /><DetailRow label="Caja" value={operation.caja} /></DetailList></DetailCard></div><DetailCard title="Remesa" icon={BanknoteArrowDown}><DetailList><DetailRow label="Código de remesa" value={snapshot.code} numeric />{snapshot.reference ? <DetailRow label="Referencia" value={snapshot.reference} numeric /> : null}<DetailRow label="Método de entrega" value={DELIVERY_METHOD_LABEL[snapshot.deliveryMethod]} />{difiereDeLoDebido({ amount: snapshot.payoutAmount, currency: snapshot.payoutCurrency }, operation.liquidacion) ? <DetailRow label="Importe de la remesa" value={formatMoney({ amount: snapshot.payoutAmount, currency: snapshot.payoutCurrency })} numeric /> : null}<DetailRow label="Importe entregado" value={entregadoAlCliente({ amount: snapshot.payoutAmount, currency: snapshot.payoutCurrency }, operation.liquidacion).map(formatMoney).join(" + ")} numeric strong /><DetailRow label="Moneda" value={<span className="inline-flex items-center gap-2"><CurrencyFlag currency={snapshot.payoutCurrency} />{snapshot.payoutCurrency} · {currencyName(snapshot.payoutCurrency)}</span>} /><DetailRow label="Estado de la remesa" value={REMITTANCE_STATUS_LABEL[snapshot.externalStatus]} strong /></DetailList></DetailCard><CashMovement operation={operation} /></div>;
}

/** Lo que la remesa sacó de la caja. Sin saldos: Worker opera a ciegas (6/11/2026). */
function CashMovement({ operation }: { operation: OperationRecord }) {
  const money = operation.amount.kind === "single" ? operation.amount.money : undefined;
  if (!money) return null;
  return <DetailCard title="Movimiento de efectivo" icon={ArrowRightLeft} contentClassName="gap-5"><div className="grid gap-3 sm:grid-cols-3"><MovementValue label="Salida (Remesa)" value={entregadoAlCliente(money, operation.liquidacion).map((m) => `−${formatMoney(m)}`).join(" · ")} negative strong /></div><DetailList><DetailRow label="Tipo de movimiento" value="Salida" /><DetailRow label="Moneda" value={`${money.currency} · ${currencyName(money.currency)}`} /><DetailRow label="Operación vinculada" value={operation.codigo} numeric /></DetailList></DetailCard>;
}
function MovementValue({ label, value, negative, strong }: { label: string; value: string; negative?: boolean; strong?: boolean }) { return <div className="rounded-control border border-border bg-surface-subtle px-4 py-3"><p className="text-caption text-text-secondary">{label}</p><p className={`mt-1 pc-numeric text-body font-semibold ${negative ? "text-error-foreground" : "text-text-primary"}${strong ? " text-primary" : ""}`}>{value}</p></div>; }
function currencyName(currency: string) { return ({ CUP: "Peso cubano", USD: "Dólar estadounidense", EUR: "Euro", GBP: "Libra esterlina" } as Record<string, string>)[currency] ?? currency; }
