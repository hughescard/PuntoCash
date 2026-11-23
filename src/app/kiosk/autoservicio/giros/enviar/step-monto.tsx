"use client";

import * as React from "react";
import { Send } from "lucide-react";

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
import { formatAmount, formatMoney, parseAmountInput } from "@/lib/format";
import { desgloseSiLlevaPorcentaje, type FormaDeGiro } from "@/features/kiosk/giro";
import type { CotizacionDeGiro } from "@/features/network/tarifas-reglas";

const CURRENCY_FIELD: FieldSpec = { id: "giro-moneda", label: "Moneda del giro" };

const FORMAS = [
  {
    valor: "llegar",
    titulo: "Sé cuánto debe recibir",
    detalle: "La tarifa se suma a lo que entregas.",
    campo: "Monto que recibe el beneficiario",
  },
  {
    valor: "enviar",
    titulo: "Sé cuánto voy a entregar",
    detalle: "La tarifa se descuenta de lo que entregas.",
    campo: "Monto que entregas",
  },
] as const;

/**
 * El giro: moneda, cómo lo pide el cliente y el importe. Debajo, la cuenta
 * entera —lo que recibe el beneficiario, la tarifa y lo que tiene que
 * entregar—, con la tarifa de PuntoCash, la misma que aplicará la caja.
 */
export function StepMonto({
  monedas,
  currency,
  forma,
  amountInput,
  amountError,
  cotizacion,
  cotizacionCambiada,
  onCurrencyChange,
  onFormaChange,
  onAmountChange,
}: {
  monedas: readonly { code: string; name: string }[];
  currency: string;
  forma: FormaDeGiro;
  amountInput: string;
  amountError: string | undefined;
  cotizacion: CotizacionDeGiro | null;
  cotizacionCambiada: boolean;
  onCurrencyChange: (currency: string) => void;
  onFormaChange: (forma: FormaDeGiro) => void;
  onAmountChange: (value: string) => void;
}): React.JSX.Element {
  const campo: FieldSpec = { id: "giro-monto", label: FORMAS.find((f) => f.valor === forma)!.campo };

  function normalizeAmountOnBlur() {
    const parsed = parseAmountInput(amountInput);
    if (parsed !== null && parsed > 0) onAmountChange(formatAmount(parsed));
  }

  return (
    <div className="flex flex-col gap-6">
      {cotizacionCambiada ? (
        <Alert variant="warning" title="La tarifa cambió mientras preparabas tu solicitud">
          Esta es la cuenta con la tarifa de ahora. Revísala antes de continuar.
        </Alert>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
            >
              <Send className="size-[18px]" />
            </span>
            <h2 className="text-card-title text-text-primary">¿Cuánto vas a enviar?</h2>
          </div>

          <div className="mt-6 max-w-md">
            <Field {...CURRENCY_FIELD}>
              <Select value={currency} onValueChange={onCurrencyChange}>
                <SelectTrigger size="lg" {...fieldAria(CURRENCY_FIELD)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monedas.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-2">
                        <CurrencyFlag currency={c.code} />
                        {c.code} — {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <fieldset className="mt-6">
            <legend className="mb-3 text-label text-text-primary">¿Qué sabes del giro?</legend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {FORMAS.map((o) => (
                <label
                  key={o.valor}
                  className={`flex min-h-20 cursor-pointer items-center gap-4 rounded-control border px-5 py-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${
                    forma === o.valor ? "border-primary bg-primary-subtle" : "border-border bg-surface hover:border-border-navy"
                  }`}
                >
                  <input
                    type="radio"
                    name="forma-del-giro"
                    value={o.valor}
                    checked={forma === o.valor}
                    onChange={() => onFormaChange(o.valor)}
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

          <div className="mt-6 max-w-md">
            <Field {...campo} error={amountError}>
              <Input
                {...fieldAria({ ...campo, error: amountError })}
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
          </div>
        </CardContent>
      </Card>

      {cotizacion ? <CuentaDelGiro cotizacion={cotizacion} currency={currency} /> : null}
    </div>
  );
}

/**
 * La cuenta del giro, como la verá el cliente en caja: primero lo que recibe
 * el beneficiario, luego la tarifa y, en la última fila, lo que entrega. Si
 * entrega más de lo que hace falta, se dice cuánto se le devuelve y por qué.
 */
export function CuentaDelGiro({ cotizacion: c, currency }: { cotizacion: CotizacionDeGiro; currency: string }) {
  const m = (amount: number) => formatMoney({ amount, currency });
  const desglose = desgloseSiLlevaPorcentaje(c, currency);
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <Fila label="Recibe el beneficiario">{m(c.giro)}</Fila>
        <hr className="border-t border-dashed border-border" />
        <Fila label="Tarifa" detalle={desglose ?? undefined}>
          {m(c.tarifa.cobrada)}
        </Fila>
        <hr className="border-t border-border" />
        <Fila label="Total a entregar" fuerte>
          {m(c.total)}
        </Fila>
        {c.vuelto > 0 ? (
          <p className="rounded-control bg-surface-subtle px-4 py-3 text-body-sm text-text-secondary">
            De los {m(c.entrega)} que entregas se te devuelven {m(c.vuelto)}
            {c.siguiente ? `: con un giro de ${m(c.siguiente.giro)} tendrías que entregar ${m(c.siguiente.total)}` : ""}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Fila({
  label,
  detalle,
  fuerte,
  children,
}: {
  label: string;
  detalle?: string;
  fuerte?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex flex-col">
        <span className={fuerte ? "text-body font-semibold text-text-primary" : "text-body-sm text-text-secondary"}>
          {label}
        </span>
        {detalle ? <span className="text-body-sm text-text-secondary">{detalle}</span> : null}
      </span>
      <span
        className={`pc-numeric text-text-primary ${fuerte ? "text-section-title font-semibold" : "font-semibold"}`}
      >
        {children}
      </span>
    </div>
  );
}
