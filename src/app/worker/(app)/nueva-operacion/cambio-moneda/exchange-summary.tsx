import * as React from "react";
import { CircleCheck, FileText, TriangleAlert, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cn } from "@/lib/utils";
import { formatMoney, formatRate } from "@/lib/format";
import { findCurrency, type ExchangeQuote } from "@/features/exchange/quote";

/**
 * The two read-only panels that keep the operation's numbers in view on every
 * step, so the worker never loses the figures they are committing to.
 */

/** Quiet navy glyph identifying each card, matching the rest of the product. */
function CardGlyph({ icon: Icon }: { icon: typeof Wallet }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
    >
      <Icon className="size-[18px]" />
    </span>
  );
}

/** One side of the exchange: label, flag and the canonical money string. */
function AmountRow({
  label,
  amount,
  currency,
  currencyName,
}: {
  label: string;
  amount: number;
  currency: string;
  currencyName?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption text-text-secondary">{label}</span>
      <span className="flex items-center gap-2">
        <CurrencyFlag currency={currency} />
        <span className="pc-numeric text-section-title text-text-primary">
          {formatMoney({ amount, currency })}
        </span>
        {currencyName ? (
          <span className="ml-auto truncate text-caption text-text-secondary">{currencyName}</span>
        ) : null}
      </span>
    </div>
  );
}

export function ExchangeSummaryCard({
  quote,
  className,
  showCurrencyNames = false,
}: {
  quote: ExchangeQuote;
  className?: string;
  showCurrencyNames?: boolean;
}): React.JSX.Element {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <CardGlyph icon={FileText} />
          <CardTitle>Resumen del cambio</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <AmountRow
          label="Cliente entrega"
          amount={quote.sourceAmount}
          currency={quote.sourceCurrency}
          {...(showCurrencyNames ? { currencyName: currencyNameOf(quote.sourceCurrency) } : {})}
        />

        <hr className="border-t border-dashed border-border" />

        <AmountRow
          label="Cliente recibe"
          amount={quote.destinationAmount}
          currency={quote.destinationCurrency}
          {...(showCurrencyNames
            ? { currencyName: currencyNameOf(quote.destinationCurrency) }
            : {})}
        />

        <hr className="border-t border-dashed border-border" />

        <div className="flex flex-col gap-1">
          <span className="text-caption text-text-secondary">Tasa aplicada</span>
          <span className="pc-numeric text-body font-semibold text-text-primary">
            {formatAppliedRate(quote)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/** "1 USD = 0,9200 EUR" — the only rate expression the worker ever sees. */
export function formatAppliedRate(quote: ExchangeQuote): string {
  return `1 ${quote.sourceCurrency} = ${formatRate(quote.appliedRate)} ${quote.destinationCurrency}`;
}

function currencyNameOf(code: string): string | undefined {
  return findCurrency(code)?.name;
}

export interface CashCheck {
  currency: string;
  available: number;
  required: number;
  sufficient: boolean;
  remaining: number;
}

/** Availability of the destination currency for this exact operation. */
export function evaluateCash(available: number, required: number, currency: string): CashCheck {
  return {
    currency,
    available,
    required,
    sufficient: available >= required,
    remaining: available - required,
  };
}

/**
 * Cash panel. Shows the arithmetic the worker is accountable for: what the
 * register holds, what leaves it, and what is left.
 */
export function CashValidationCard({
  cash,
  variant = "compact",
  className,
}: {
  cash: CashCheck;
  /** `detailed` adds the before/after breakdown used on the review step. */
  variant?: "compact" | "detailed";
  className?: string;
}): React.JSX.Element {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <CardGlyph icon={Wallet} />
          <CardTitle>Validación de caja</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <CashRow label="Disponible en Caja 03" value={cash.available} currency={cash.currency} />
        <CashRow
          label="Entrega al cliente"
          value={cash.required}
          currency={cash.currency}
          // A deduction states its direction in the sign, not only in colour.
          signed="negative"
        />

        {variant === "detailed" || cash.sufficient ? (
          <CashRow
            label="Disponible después"
            value={cash.remaining}
            currency={cash.currency}
            tone={cash.sufficient ? "success" : "error"}
          />
        ) : null}

        <CashStatus cash={cash} />
      </CardContent>
    </Card>
  );
}

function CashRow({
  label,
  value,
  currency,
  tone,
  signed,
}: {
  label: string;
  value: number;
  currency: string;
  tone?: "success" | "error";
  signed?: "negative";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption text-text-secondary">{label}</span>
      <span
        className={cn(
          "pc-numeric text-body font-semibold",
          tone === "success" && "text-success-foreground",
          tone === "error" && "text-error-foreground",
          !tone && "text-text-primary",
          signed === "negative" && "text-error-foreground",
        )}
      >
        {signed === "negative" ? "− " : ""}
        {formatMoney({ amount: Math.abs(value), currency })}
      </span>
    </div>
  );
}

/** Status is a labelled state, never a bare colour (§20). */
export function CashStatus({ cash }: { cash: CashCheck }): React.JSX.Element {
  return cash.sufficient ? (
    <p className="mt-1 flex items-start gap-2 rounded-control border border-success-border bg-success-subtle px-3 py-2.5 text-label font-semibold text-success-foreground">
      <CircleCheck className="mt-px size-4 shrink-0" aria-hidden="true" />
      Fondos suficientes
    </p>
  ) : (
    <p className="mt-1 flex items-start gap-2 rounded-control border border-error-border bg-error-subtle px-3 py-2.5 text-label font-semibold text-error-foreground">
      <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
      Fondos insuficientes en caja
    </p>
  );
}
