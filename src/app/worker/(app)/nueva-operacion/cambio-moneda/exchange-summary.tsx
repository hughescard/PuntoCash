import * as React from "react";
import { FileText, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatAppliedRateLine, formatMoney, formatTasa } from "@/lib/format";
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
  /** Null while there is nothing to quote yet: the row reads «—». */
  amount: number | null;
  currency: string;
  currencyName?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption text-text-secondary">{label}</span>
      <span className="flex items-center gap-2">
        {amount === null ? null : <CurrencyFlag currency={currency} />}
        <span className="pc-numeric text-section-title text-text-primary">
          {amount === null ? "—" : formatMoney({ amount, currency })}
        </span>
        {currencyName ? (
          <span className="ml-auto truncate text-caption text-text-secondary">{currencyName}</span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * The summary of the exchange. With no quote yet (the amount is still empty or
 * invalid) every figure reads «—», so the card is in place from the start
 * and never shows numbers nobody entered.
 */
export function ExchangeSummaryCard({
  quote,
  className,
  showCurrencyNames = false,
}: {
  quote: ExchangeQuote | null;
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
          amount={quote ? quote.sourceAmount : null}
          currency={quote?.sourceCurrency ?? ""}
          {...(showCurrencyNames && quote ? { currencyName: currencyNameOf(quote.sourceCurrency) } : {})}
        />

        <hr className="border-t border-dashed border-border" />

        <AmountRow
          label="Cliente recibe"
          amount={quote ? quote.destinationAmount : null}
          currency={quote?.destinationCurrency ?? ""}
          {...(showCurrencyNames && quote
            ? { currencyName: currencyNameOf(quote.destinationCurrency) }
            : {})}
        />

        <hr className="border-t border-dashed border-border" />

        <div className="flex flex-col gap-1">
          <span className="text-caption text-text-secondary">Tasa aplicada</span>
          <span className="pc-numeric text-body font-semibold text-text-primary">
            {quote ? formatAppliedRate(quote) : "—"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * «1 USD = 326,00 CUP» — la única expresión de tasa que el trabajador ve, y la
 * misma en las dos direcciones del cambio: la que su sede cotiza.
 */
export function formatAppliedRate(quote: ExchangeQuote): string {
  const linea = formatAppliedRateLine(quote.sourceCurrency, quote.destinationCurrency, quote.appliedRate);
  /* Entre dos divisas se pivota por el peso: se dicen las dos tasas de la sede
     con que se calculó, para que el trabajador pueda explicárselo al cliente. */
  if (quote.tasasAplicadas && quote.tasasAplicadas.length === 2) {
    const [a, b] = quote.tasasAplicadas;
    return `${linea} · ${a!.code} a ${formatTasa(a!.valor)} y ${b!.code} a ${formatTasa(b!.valor)} CUP`;
  }
  return linea;
}

function currencyNameOf(code: string): string | undefined {
  return findCurrency(code)?.name;
}
