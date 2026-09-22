"use client";

import * as React from "react";
import { Send } from "lucide-react";

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
import { formatAmount, parseAmountInput } from "@/lib/format";
import { SUPPORTED_CURRENCIES } from "@/features/exchange/quote";

const CURRENCY_FIELD: FieldSpec = { id: "giro-moneda", label: "Moneda a enviar" };
const AMOUNT_FIELD: FieldSpec = { id: "giro-monto", label: "Monto a entregar" };

export function StepMonto({
  currency,
  amountInput,
  amountError,
  onCurrencyChange,
  onAmountChange,
}: {
  currency: string;
  amountInput: string;
  amountError: string | undefined;
  onCurrencyChange: (currency: string) => void;
  onAmountChange: (value: string) => void;
}): React.JSX.Element {
  function normalizeAmountOnBlur() {
    const parsed = parseAmountInput(amountInput);
    if (parsed !== null && parsed > 0) onAmountChange(formatAmount(parsed));
  }

  return (
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

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field {...CURRENCY_FIELD}>
            <Select value={currency} onValueChange={onCurrencyChange}>
              <SelectTrigger size="lg" {...fieldAria(CURRENCY_FIELD)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((c) => (
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

          <Field {...AMOUNT_FIELD} error={amountError}>
            <Input
              {...fieldAria({ ...AMOUNT_FIELD, error: amountError })}
              size="lg"
              value={amountInput}
              onChange={(event) => onAmountChange(event.target.value)}
              onBlur={normalizeAmountOnBlur}
              invalid={Boolean(amountError)}
              inputMode="decimal"
              autoComplete="off"
              numeric
              suffix={<span className="border-l border-border py-2 pl-3">{currency}</span>}
            />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
