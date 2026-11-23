"use client";

import * as React from "react";
import { ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine } from "lucide-react";

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
import { KioskAvisoDeCaja } from "@/components/patterns/kiosk-aviso-de-caja";
import { formatAmount, formatRate, parseAmountInput } from "@/lib/format";
import type { ExchangeQuote } from "@/features/exchange/quote";
import type { ModoDeCambio } from "@/features/kiosk/cambio";

const SOURCE_CURRENCY: FieldSpec = { id: "moneda-origen", label: "Moneda que entregas" };
const SOURCE_AMOUNT: FieldSpec = { id: "monto-entregar", label: "Monto a entregar" };
const DEST_CURRENCY: FieldSpec = { id: "moneda-destino", label: "Moneda que recibes" };
const DEST_AMOUNT: FieldSpec = { id: "monto-recibir", label: "Monto a recibir" };

function CurrencyOptions({ monedas }: { monedas: readonly { code: string; name: string }[] }) {
  return (
    <SelectContent>
      {monedas.map((currency) => (
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

const MODOS = [
  { valor: "cambiar", titulo: "Sé cuánto voy a entregar", detalle: "Escribes el monto que traes." },
  { valor: "recibir", titulo: "Sé cuánto quiero recibir", detalle: "Te decimos cuánto tienes que entregar." },
] as const;

/**
 * Primer paso: qué cambia el cliente. Las monedas y las tasas son las de la
 * sede del kiosco —las mismas que aplicará la caja—. El cliente puede decir lo
 * que entrega o lo que quiere recibir; en el segundo caso se calcula lo mínimo
 * que tiene que entregar para llegar, en algo que se pueda cobrar.
 */
export function StepDatos({
  monedas,
  modo,
  sourceCurrency,
  destinationCurrency,
  amountInput,
  quote,
  amountError,
  cotizacionCambiada,
  onModoChange,
  onSourceCurrencyChange,
  onDestinationCurrencyChange,
  onAmountChange,
  onSwap,
}: {
  monedas: readonly { code: string; name: string }[];
  modo: ModoDeCambio;
  sourceCurrency: string;
  destinationCurrency: string;
  amountInput: string;
  quote: ExchangeQuote | null;
  amountError: string | undefined;
  cotizacionCambiada: boolean;
  onModoChange: (modo: ModoDeCambio) => void;
  onSourceCurrencyChange: (currency: string) => void;
  onDestinationCurrencyChange: (currency: string) => void;
  onAmountChange: (value: string) => void;
  onSwap: () => void;
}): React.JSX.Element {
  function normalizeAmountOnBlur() {
    const parsed = parseAmountInput(amountInput);
    if (parsed !== null && parsed > 0) onAmountChange(formatAmount(parsed));
  }

  const campoEditable = (spec: FieldSpec, currency: string) => (
    <Field {...spec} error={amountError}>
      <Input
        {...fieldAria({ ...spec, error: amountError })}
        size="lg"
        value={amountInput}
        onChange={(event) => onAmountChange(event.target.value)}
        onBlur={normalizeAmountOnBlur}
        invalid={Boolean(amountError)}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        numeric
        suffix={<span className="border-l border-border py-2 pl-3">{currency}</span>}
      />
    </Field>
  );

  /* Lo calculado se muestra en un campo de solo lectura, nunca editable. */
  const campoCalculado = (spec: FieldSpec, valor: number | undefined, currency: string) => (
    <Field {...spec}>
      <Input
        {...fieldAria(spec)}
        size="lg"
        readOnly
        tabIndex={-1}
        value={valor !== undefined ? formatAmount(valor) : "—"}
        numeric
        className="bg-surface-subtle"
        suffix={<span className="border-l border-border py-2 pl-3">{currency}</span>}
      />
    </Field>
  );

  return (
    <div className="flex flex-col gap-6">
      {cotizacionCambiada ? (
        <Alert variant="warning" title="La tasa cambió mientras preparabas tu solicitud">
          Estos son los montos con la tasa de ahora. Revísalos antes de continuar.
        </Alert>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <fieldset className="mb-8">
            <legend className="mb-3 text-label text-text-primary">¿Qué sabes del cambio?</legend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {MODOS.map((o) => (
                <label
                  key={o.valor}
                  className={`flex min-h-20 cursor-pointer items-center gap-4 rounded-control border px-5 py-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${
                    modo === o.valor ? "border-primary bg-primary-subtle" : "border-border bg-surface hover:border-border-navy"
                  }`}
                >
                  <input
                    type="radio"
                    name="modo-de-cambio"
                    value={o.valor}
                    checked={modo === o.valor}
                    onChange={() => onModoChange(o.valor)}
                    className="size-5 shrink-0 accent-primary"
                  />
                  <span>
                    <span className="block text-body font-semibold text-text-primary">{o.titulo}</span>
                    <span className="block text-body-sm text-text-secondary">{o.detalle}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <SideHeading icon={ArrowDownToLine} label="Entregas" />

              <Field {...SOURCE_CURRENCY}>
                <Select value={sourceCurrency} onValueChange={onSourceCurrencyChange}>
                  <SelectTrigger size="lg" {...fieldAria(SOURCE_CURRENCY)}>
                    <SelectValue />
                  </SelectTrigger>
                  <CurrencyOptions monedas={monedas} />
                </Select>
              </Field>

              {modo === "cambiar"
                ? campoEditable(SOURCE_AMOUNT, sourceCurrency)
                : campoCalculado(SOURCE_AMOUNT, quote?.sourceAmount, sourceCurrency)}
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
                  <CurrencyOptions monedas={monedas} />
                </Select>
              </Field>

              {modo === "recibir"
                ? campoEditable(DEST_AMOUNT, destinationCurrency)
                : campoCalculado(DEST_AMOUNT, quote?.destinationAmount, destinationCurrency)}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-2">
            <span className="text-label text-text-secondary">Tasa de esta sucursal</span>
            <p className="w-full rounded-control border border-border bg-surface-subtle py-3 text-center">
              <span className="pc-numeric text-section-title text-text-primary">
                {quote ? formatAppliedRate(quote) : "—"}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <KioskAvisoDeCaja />
    </div>
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
