import * as React from "react";
import { ArrowDown, ArrowLeftRight, FileText, Wallet } from "lucide-react";

import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cn } from "@/lib/utils";
import { formatMoney, formatRate, type Money } from "@/lib/format";
import { findCurrency } from "@/features/exchange/quote";
import type { OperationRecord } from "@/features/operations/operations-history";
import { DetailCard, DetailList, DetailRow } from "./detail-parts";

/**
 * "Detalle del servicio" — the service-specific half of the detail screen.
 *
 * Dispatch is a plain typed switch on the record's own `amount` shape rather
 * than a registry or plugin layer: there is exactly one specialized detail
 * today, and each new one arrives only after its operation flow has been
 * designed. Everything else falls back to `GenericServiceDetail`, which shows
 * only what the domain genuinely holds.
 */
export function ServiceDetail({ operation }: { operation: OperationRecord }): React.JSX.Element {
  if (operation.amount.kind === "exchange") {
    return <CurrencyExchangeDetail amount={operation.amount} />;
  }
  return <GenericServiceDetail operation={operation} />;
}

/**
 * "Estado de caja" — the register's own arithmetic for this operation, as it
 * stood when it was processed. A historical snapshot read straight off the
 * record, never recomputed from today's Caja balance.
 *
 * Rendered as its own card (rather than inside `ServiceDetail`) so the page
 * can place it beside the outcome, and so services that move no cash simply
 * render nothing.
 */
export function OperationCashCard({
  operation,
}: {
  operation: OperationRecord;
}): React.JSX.Element | null {
  if (operation.amount.kind !== "exchange") return null;
  const { cashSnapshot } = operation.amount;

  return (
    <DetailCard title="Estado de caja" icon={Wallet}>
      <DetailList>
        <DetailRow label="Disponible antes" value={formatMoney(cashSnapshot.before)} numeric />
        <DetailRow
          label="Entregado al cliente"
          value={formatMoney(cashSnapshot.movement)}
          numeric
        />
        <DetailRow
          label="Disponible después"
          value={formatMoney(cashSnapshot.after)}
          numeric
          strong
        />
      </DetailList>
    </DetailCard>
  );
}

/** One side of the exchange: flag, canonical amount, and the currency's name. */
function ExchangeSide({
  label,
  money,
  tone,
}: {
  label: string;
  money: Money;
  /** `source` is what the client hands over; `destination` is what they get. */
  tone: "source" | "destination";
}) {
  const currencyName = findCurrency(money.currency)?.name;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption text-text-secondary">{label}</span>
      {/* A quiet tinted plate, matching the reference's emphasis on the two
          figures without becoming a large coloured surface (§16). */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-control border px-4 py-3",
          tone === "source"
            ? "border-accent-border bg-surface-brand"
            : "border-success-border bg-success-subtle",
        )}
      >
        <CurrencyFlag currency={money.currency} className="h-5 w-7" />
        <span className="min-w-0">
          <span className="pc-numeric block text-amount whitespace-nowrap text-text-primary">
            {formatMoney(money)}
          </span>
          {currencyName ? (
            <span className="block text-caption text-text-secondary">{currencyName}</span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

/**
 * The first fully specialized operation detail. Every figure comes from the
 * record's own structured snapshot — the committed quote and the register
 * state captured when the operation ran — never re-derived from a live rate
 * or the current Caja balance, and never parsed back out of a display string.
 */
function CurrencyExchangeDetail({
  amount,
}: {
  amount: Extract<OperationRecord["amount"], { kind: "exchange" }>;
}): React.JSX.Element {
  const { source, destination, appliedRate } = amount;

  return (
    <DetailCard title="Detalle del servicio" icon={ArrowLeftRight} contentClassName="gap-4">
      <ExchangeSide label="Cliente entrega" money={source} tone="source" />

      {/* Direction is stated by an arrow between the two plates, so the pair
          reads as one movement rather than two unrelated figures. */}
      <span
        aria-hidden="true"
        className="mx-auto grid size-8 place-items-center rounded-pill border border-border bg-surface text-text-secondary"
      >
        <ArrowDown className="size-4" />
      </span>

      <ExchangeSide label="Cliente recibe" money={destination} tone="destination" />

      <hr className="border-t border-dashed border-border" />

      <div className="flex flex-col gap-1">
        <span className="text-caption text-text-secondary">Tasa aplicada</span>
        <span className="pc-numeric text-body font-semibold whitespace-nowrap text-text-primary">
          1 {source.currency} = {formatRate(appliedRate)} {destination.currency}
        </span>
      </div>
    </DetailCard>
  );
}

/**
 * Fallback for services whose operation flow has not been designed yet
 * (Remesa nacional, Extracción tarjeta, Pago de servicio). It shows the one
 * service figure the record actually carries and nothing more — inventing
 * service-specific rows here would be inventing business data.
 */
function GenericServiceDetail({ operation }: { operation: OperationRecord }): React.JSX.Element {
  const money = operation.amount.kind === "single" ? operation.amount.money : null;

  return (
    <DetailCard title="Detalle del servicio" icon={FileText} contentClassName="gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-caption text-text-secondary">Importe</span>
        <span className="flex items-center gap-3">
          {money ? <CurrencyFlag currency={money.currency} className="h-5 w-7" /> : null}
          <span className="pc-numeric text-amount whitespace-nowrap text-text-primary">
            {money ? formatMoney(money) : "—"}
          </span>
        </span>
      </div>

      <p className="text-body-sm text-text-secondary">
        El detalle específico de {operation.servicio} estará disponible cuando se defina su flujo
        de operación.
      </p>
    </DetailCard>
  );
}
