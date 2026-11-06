"use client";

import * as React from "react";
import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  Info,
} from "lucide-react";

import {
  Alert,
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
import { formatAmount, parseAmountInput } from "@/lib/format";
import { findCurrency, type ExchangeQuote } from "@/features/exchange/quote";
import { ExchangeSummaryCard, formatAppliedRate } from "./exchange-summary";

const SOURCE_CURRENCY: FieldSpec = { id: "moneda-origen", label: "Moneda origen" };
const SOURCE_AMOUNT: FieldSpec = { id: "monto-entregar", label: "Monto a entregar" };
const DEST_CURRENCY: FieldSpec = { id: "moneda-destino", label: "Moneda destino" };
const DEST_AMOUNT: FieldSpec = { id: "monto-recibir", label: "Monto a recibir (calculado)" };

/** Options carry flag, code and name; the code and name are authoritative. */
function CurrencyOptions({ monedas }: { monedas: readonly string[] }) {
  return (
    <SelectContent>
      {monedas.map((code) => (
        <SelectItem key={code} value={code}>
          <span className="flex items-center gap-2">
            <CurrencyFlag currency={code} />
            {code} — {findCurrency(code)?.name ?? code}
          </span>
        </SelectItem>
      ))}
    </SelectContent>
  );
}

function tituloSinTasa(monedas: readonly string[]): string {
  return monedas.length === 1
    ? `${monedas[0]} no se puede cambiar en este servicio`
    : "Hay monedas de tu caja que no se pueden cambiar";
}

/** "CAD", "CAD y JPY", "CAD, JPY y CHF" — en español, no con comas sueltas. */
function listar(monedas: readonly string[]): string {
  if (monedas.length <= 1) return monedas[0] ?? "";
  return `${monedas.slice(0, -1).join(", ")} y ${monedas[monedas.length - 1]}`;
}

export interface StepCambioProps {
  /**
   * Monedas habilitadas en la caja que este servicio **no** puede cambiar,
   * porque PuntoCash no tiene definida una tasa para ellas.
   *
   * No es un estado raro: la lista de monedas de una sede es «lo que un
   * trabajador puede tener en su caja» y **no depende** del servicio de Cambio
   * de moneda (Admin FRD **FR-AD-MON-2**, **FR-AD-MON-5**), porque una remesa y
   * un giro también se pagan en una moneda. Los **pares** con tasa son otro
   * objeto, de §13, y solo existen donde PuntoCash tiene un rango.
   *
   * Lo que no vale es omitirlas del selector sin decir nada: quien tiene saldo
   * en CAD y no lo encuentra aquí no puede saber si es un fallo o una regla.
   */
  monedasSinTasa: readonly string[];
  /** Las monedas de la caja que se pueden cambiar con las tasas en vigor de la sede. */
  monedasCambiables: readonly string[];
  sourceCurrency: string;
  destinationCurrency: string;
  amountInput: string;
  quote: ExchangeQuote | null;
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
  amountError,
  monedasSinTasa,
  monedasCambiables,
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
      {monedasSinTasa.length > 0 ? (
        <Alert variant="info" title={tituloSinTasa(monedasSinTasa)}>
          PuntoCash no tiene una tasa definida para {listar(monedasSinTasa)}, así que no{" "}
          {monedasSinTasa.length === 1 ? "aparece" : "aparecen"} en estos selectores. Puedes seguir
          usándol{monedasSinTasa.length === 1 ? "a" : "as"} en remesas y giros; para cambiarl
          {monedasSinTasa.length === 1 ? "a" : "as"}, el administrador de tu sede tiene que definir
          el par en su panel.
        </Alert>
      ) : null}

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
                    <CurrencyOptions monedas={monedasCambiables} />
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
                    <CurrencyOptions monedas={monedasCambiables} />
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
