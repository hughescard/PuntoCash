"use client";

import * as React from "react";
import { ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine } from "lucide-react";

import {
  Card,
  CardContent,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  fieldAria,
  type FieldSpec,
} from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatAmount, formatRate, parseAmountInput } from "@/lib/format";
import { SUPPORTED_CURRENCIES, type ExchangeQuote } from "@/features/exchange/quote";

const SOURCE_CURRENCY: FieldSpec = { id: "moneda-origen", label: "Entregas" };
const SOURCE_AMOUNT: FieldSpec = { id: "monto-entregar", label: "Monto a entregar" };
const DEST_CURRENCY: FieldSpec = { id: "moneda-destino", label: "Recibes" };

function CurrencyOptions() {
  return (
    <SelectContent>
      {SUPPORTED_CURRENCIES.map((currency) => (
        <SelectItem key={currency.code} value={currency.code}>
          <span className="flex items-center gap-2">
            <CurrencyFlag currency={currency.code} />
            {currency.code} — {currency.name}
          </span>
        </SelectItem>
      ))}
    </SelectContent>
  );
}

export function formatAppliedRate(quote: ExchangeQuote): string {
  return `1 ${quote.sourceCurrency} = ${formatRate(quote.appliedRate)} ${quote.destinationCurrency}`;
}

export function StepDatos({
  sourceCurrency,
  destinationCurrency,
  amountInput,
  quote,
  amountError,
  onSourceCurrencyChange,
  onDestinationCurrencyChange,
  onAmountChange,
  onSwap,
}: {
  sourceCurrency: string;
  destinationCurrency: string;
  amountInput: string;
  quote: ExchangeQuote | null;
  amountError: string | undefined;
  onSourceCurrencyChange: (currency: string) => void;
  onDestinationCurrencyChange: (currency: string) => void;
  onAmountChange: (value: string) => void;
  onSwap: () => void;
}): React.JSX.Element {
  function normalizeAmountOnBlur() {
    const parsed = parseAmountInput(amountInput);
    if (parsed !== null && parsed > 0) onAmountChange(formatAmount(parsed));
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <SideHeading icon={ArrowDownToLine} label="Entregas" />

            <Field {...SOURCE_CURRENCY}>
              <Select value={sourceCurrency} onValueChange={onSourceCurrencyChange}>
                <SelectTrigger size="lg" {...fieldAria(SOURCE_CURRENCY)}>
                  <SelectValue />
                </SelectTrigger>
                <CurrencyOptions />
              </Select>
            </Field>

            <Field {...SOURCE_AMOUNT} error={amountError}>
              <Input
                {...fieldAria({ ...SOURCE_AMOUNT, error: amountError })}
                size="lg"
                value={amountInput}
                onChange={(event) => onAmountChange(event.target.value)}
                onBlur={normalizeAmountOnBlur}
                invalid={Boolean(amountError)}
                inputMode="decimal"
                autoComplete="off"
                numeric
                suffix={<span className="border-l border-border py-2 pl-3">{sourceCurrency}</span>}
              />
            </Field>
          </div>

          <div className="flex justify-center md:pt-20">
            <button
              type="button"
              onClick={onSwap}
              aria-label={`Intercambiar monedas: ${destinationCurrency} pasa a origen y ${sourceCurrency} a destino`}
              className="grid size-14 shrink-0 place-items-center rounded-control border border-border bg-surface text-primary transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:border-border-navy hover:bg-primary-subtle outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ArrowRightLeft className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <SideHeading icon={ArrowUpFromLine} label="Recibes" />

            <Field {...DEST_CURRENCY}>
              <Select value={destinationCurrency} onValueChange={onDestinationCurrencyChange}>
                <SelectTrigger size="lg" {...fieldAria(DEST_CURRENCY)}>
                  <SelectValue />
                </SelectTrigger>
                <CurrencyOptions />
              </Select>
            </Field>

            <div className="flex h-control-lg items-center justify-between rounded-control border border-border bg-surface-subtle px-4">
              <span className="pc-numeric text-amount font-semibold text-text-primary">
                {quote ? formatAmount(quote.destinationAmount) : "—"}
              </span>
              <span className="text-label font-medium text-text-secondary">
                {destinationCurrency}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <span className="text-label text-text-secondary">Tasa aplicada</span>
          <p className="w-full rounded-control border border-border bg-surface-subtle py-3 text-center">
            <span className="pc-numeric text-section-title text-text-primary">
              {quote ? formatAppliedRate(quote) : "—"}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SideHeading({ icon: Icon, label }: { icon: typeof ArrowDownToLine; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
      >
        <Icon className="size-[18px]" />
      </span>
      <h2 className="text-card-title text-text-primary">{label}</h2>
    </div>
  );
}
