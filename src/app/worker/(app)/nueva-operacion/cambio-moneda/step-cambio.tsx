"use client";

import * as React from "react";
import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  CircleCheck,
  Info,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { formatAmount, parseAmountInput } from "@/lib/format";
import { SUPPORTED_CURRENCIES, type ExchangeQuote } from "@/features/exchange/quote";
import { ExchangeSummaryCard, formatAppliedRate, type CashCheck } from "./exchange-summary";

const SOURCE_CURRENCY: FieldSpec = { id: "moneda-origen", label: "Moneda origen" };
const SOURCE_AMOUNT: FieldSpec = { id: "monto-entregar", label: "Monto a entregar" };
const DEST_CURRENCY: FieldSpec = { id: "moneda-destino", label: "Moneda destino" };
const DEST_AMOUNT: FieldSpec = { id: "monto-recibir", label: "Monto a recibir (calculado)" };

/** Options carry flag, code and name; the code and name are authoritative. */
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

export interface StepCambioProps {
  sourceCurrency: string;
  destinationCurrency: string;
  amountInput: string;
  quote: ExchangeQuote | null;
  cash: CashCheck | null;
  amountError: string | undefined;
  onSourceCurrencyChange: (currency: string) => void;
  onDestinationCurrencyChange: (currency: string) => void;
  onAmountChange: (value: string) => void;
  onSwap: () => void;
}

export function StepCambio({
  sourceCurrency,
  destinationCurrency,
  amountInput,
  quote,
  cash,
  amountError,
  onSourceCurrencyChange,
  onDestinationCurrencyChange,
  onAmountChange,
  onSwap,
}: StepCambioProps): React.JSX.Element {
  /** Reformats to the canonical es-ES figure once the worker leaves the field. */
  function normalizeAmountOnBlur() {
    const parsed = parseAmountInput(amountInput);
    if (parsed !== null && parsed > 0) onAmountChange(formatAmount(parsed));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              {/* ---- Cliente entrega ---- */}
              <div className="flex flex-col gap-4">
                <SideHeading icon={ArrowDownToLine} label="Cliente entrega" />

                <Field {...SOURCE_CURRENCY}>
                  <Select value={sourceCurrency} onValueChange={onSourceCurrencyChange}>
                    <SelectTrigger {...fieldAria(SOURCE_CURRENCY)}>
                      <SelectValue />
                    </SelectTrigger>
                    <CurrencyOptions />
                  </Select>
                </Field>

                <Field {...SOURCE_AMOUNT} error={amountError}>
                  <Input
                    {...fieldAria({ ...SOURCE_AMOUNT, error: amountError })}
                    value={amountInput}
                    onChange={(event) => onAmountChange(event.target.value)}
                    onBlur={normalizeAmountOnBlur}
                    invalid={Boolean(amountError)}
                    inputMode="decimal"
                    autoComplete="off"
                    numeric
                    className="text-left"
                    suffix={<CurrencySuffix code={sourceCurrency} />}
                  />
                </Field>
              </div>

              {/* ---- Swap ---- */}
              <div className="flex justify-center md:pt-20">
                <button
                  type="button"
                  onClick={onSwap}
                  aria-label={`Intercambiar monedas: ${destinationCurrency} pasa a origen y ${sourceCurrency} a destino`}
                  className="grid size-11 shrink-0 place-items-center rounded-control border border-border bg-surface text-primary transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:border-border-navy hover:bg-primary-subtle outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <ArrowRightLeft className="size-[18px]" aria-hidden="true" />
                </button>
              </div>

              {/* ---- Cliente recibe ---- */}
              <div className="flex flex-col gap-4">
                <SideHeading icon={ArrowUpFromLine} label="Cliente recibe" />

                <Field {...DEST_CURRENCY}>
                  <Select value={destinationCurrency} onValueChange={onDestinationCurrencyChange}>
                    <SelectTrigger {...fieldAria(DEST_CURRENCY)}>
                      <SelectValue />
                    </SelectTrigger>
                    <CurrencyOptions />
                  </Select>
                </Field>

                {/* Calculated: shown as read-only text in a field, never editable. */}
                <Field {...DEST_AMOUNT}>
                  <Input
                    {...fieldAria(DEST_AMOUNT)}
                    readOnly
                    tabIndex={-1}
                    value={quote ? formatAmount(quote.destinationAmount) : "—"}
                    numeric
                    className="text-left"
                    suffix={<CurrencySuffix code={destinationCurrency} />}
                  />
                </Field>
              </div>
            </div>

            {/* ---- Applied rate ---- */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <span className="flex items-center gap-1.5 text-label text-text-secondary">
                Tasa aplicada
                <Info className="size-3.5" aria-hidden="true" />
              </span>
              <p className="w-full rounded-control border border-border bg-surface-subtle py-3 text-center">
                <span className="pc-numeric text-section-title text-text-primary">
                  {quote ? formatAppliedRate(quote) : "—"}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {quote ? <ExchangeSummaryCard quote={quote} className="self-start" /> : null}
      </div>

      {cash ? <CashValidationWide cash={cash} /> : null}
    </div>
  );
}

/** Currency segment inside an amount field, divided as in the reference. */
function CurrencySuffix({ code }: { code: string }) {
  return <span className="border-l border-border py-2 pl-3">{code}</span>;
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

/**
 * Step 1 shows the cash check as one wide band rather than the narrow column
 * used later, matching the approved layout.
 */
function CashValidationWide({ cash }: { cash: CashCheck }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
          >
            <Wallet className="size-[18px]" />
          </span>
          <CardTitle>Validación de caja</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <CashFigure
            label="Disponible en Caja 03"
            value={cash.available}
            currency={cash.currency}
            hint="Efectivo disponible"
          />
          <CashFigure
            label="Esta operación requiere"
            value={cash.required}
            currency={cash.currency}
            hint="Para entregar al cliente"
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-caption text-text-secondary">Estado de la operación</span>
            <CashStatusBlock cash={cash} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CashFigure({
  label,
  value,
  currency,
  hint,
}: {
  label: string;
  value: number;
  currency: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption text-text-secondary">{label}</span>
      <span className="pc-numeric text-amount text-text-primary">
        {formatAmount(value)} {currency}
      </span>
      <span className="text-caption text-text-secondary">{hint}</span>
    </div>
  );
}

function CashStatusBlock({ cash }: { cash: CashCheck }) {
  return cash.sufficient ? (
    <div className="rounded-control border border-success-border bg-success-subtle px-4 py-3">
      <p className="flex items-center gap-2 text-card-title text-success-foreground">
        <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
        Fondos suficientes
      </p>
      <p className="mt-1 text-caption text-text-secondary">Puedes continuar con la operación.</p>
    </div>
  ) : (
    <div className="rounded-control border border-error-border bg-error-subtle px-4 py-3">
      <p className="flex items-center gap-2 text-card-title text-error-foreground">
        <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
        Fondos insuficientes en caja
      </p>
      <p className="mt-1 text-caption text-text-secondary">
        Reduce el monto o selecciona otra moneda para continuar.
      </p>
    </div>
  );
}
