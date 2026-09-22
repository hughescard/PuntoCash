"use client";

import * as React from "react";
import { ArrowRightLeft, Calendar, FileText, Phone, UserRound, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cn } from "@/lib/utils";
import { formatIsoDate, formatMoney } from "@/lib/format";
import { findCurrency, type ExchangeQuote } from "@/features/exchange/quote";
import {
  customerFullName,
  customerInitials,
  documentTypeShortLabel,
  type Customer,
} from "@/features/customers/customers";
import { CashStatus, formatAppliedRate, type CashCheck } from "./exchange-summary";

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

/**
 * The financial review. This screen is the confirmation checkpoint — there is
 * deliberately no extra modal after it (§18).
 */
export function StepRevision({
  quote,
  customer,
  cash,
  worker,
  register,
}: {
  quote: ExchangeQuote;
  customer: Customer;
  cash: CashCheck;
  worker: string;
  register: string;
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[19rem_minmax(0,1fr)_20rem]">
      {/* ---------------- Client + operation metadata ---------------- */}
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <CardGlyph icon={UserRound} />
              <CardTitle>Cliente</CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-pill bg-info-subtle text-body font-semibold text-info-foreground"
              >
                {customerInitials(customer)}
              </span>
              <div className="min-w-0">
                <p className="text-card-title text-text-primary">{customerFullName(customer)}</p>
                <p className="pc-numeric mt-0.5 text-body-sm text-text-secondary">
                  {documentTypeShortLabel(customer.documentType)} · {customer.documentNumber}
                </p>
                <p className="text-body-sm text-text-secondary">
                  Nacionalidad: {customer.nationality}
                </p>
              </div>
            </div>

            <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              <MetaRow icon={Phone} label="Teléfono" value={customer.phone} numeric />
              <MetaRow
                icon={Calendar}
                label="Fecha de nacimiento"
                value={formatIsoDate(customer.birthDate)}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <CardGlyph icon={FileText} />
              <CardTitle>Operación</CardTitle>
            </div>
          </CardHeader>

          {/* No operation code yet: it is allocated when the operation is
              actually confirmed, so a cancelled flow burns no identifier (§16). */}
          <CardContent className="flex flex-col gap-3">
            <LabelledValue label="Trabajador" value={worker} />
            <LabelledValue label="Caja" value={register} />
          </CardContent>
        </Card>
      </div>

      {/* ---------------- Exchange summary ---------------- */}
      <Card className="self-start">
        <CardHeader>
          <div className="flex min-w-0 items-center gap-3">
            <CardGlyph icon={ArrowRightLeft} />
            <CardTitle>Resumen del cambio</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <ReviewAmount
            label="Cliente entrega"
            amount={quote.sourceAmount}
            currency={quote.sourceCurrency}
          />
          <hr className="border-t border-dashed border-border" />
          <ReviewAmount
            label="Cliente recibe"
            amount={quote.destinationAmount}
            currency={quote.destinationCurrency}
          />
          <hr className="border-t border-dashed border-border" />
          <div className="flex flex-col gap-1">
            <span className="text-caption text-text-secondary">Tasa aplicada</span>
            <span className="pc-numeric text-section-title text-text-primary">
              {formatAppliedRate(quote)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ---------------- Cash state ---------------- */}
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <CardGlyph icon={Wallet} />
              <CardTitle>Estado de caja</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            <LabelledValue label="Caja" value={register} />
            <hr className="border-t border-dashed border-border" />
            <CashLine
              label="Disponible antes de la operación"
              amount={cash.available}
              currency={cash.currency}
            />
            <hr className="border-t border-dashed border-border" />
            <CashLine
              label="Entrega al cliente (esta operación)"
              amount={cash.required}
              currency={cash.currency}
              direction="out"
            />
            <hr className="border-t border-dashed border-border" />
            <CashLine
              label="Disponible después de la operación"
              amount={cash.remaining}
              currency={cash.currency}
              tone={cash.sufficient ? "success" : "error"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <CardGlyph icon={Wallet} />
              <CardTitle>Validación de caja</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <CashStatus cash={cash} />
            <p className="text-caption text-text-secondary">
              {cash.sufficient
                ? "La caja cuenta con efectivo suficiente para realizar esta operación."
                : "Vuelve al paso Cambio y ajusta el monto o la moneda destino."}
            </p>
            <p className="text-caption text-text-secondary">
              Al confirmar se registrarán dos movimientos de caja en la jornada abierta: una
              entrada de {formatMoney({ amount: quote.sourceAmount, currency: quote.sourceCurrency })}{" "}
              y una salida de{" "}
              {formatMoney({ amount: quote.destinationAmount, currency: quote.destinationCurrency })}.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReviewAmount({
  label,
  amount,
  currency,
}: {
  label: string;
  amount: number;
  currency: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption text-text-secondary">{label}</span>
      <span className="flex items-center gap-2.5">
        <CurrencyFlag currency={currency} />
        <span className="pc-numeric text-amount text-text-primary">
          {formatMoney({ amount, currency })}
        </span>
        <span className="ml-auto truncate text-caption text-text-secondary">
          {findCurrency(currency)?.name}
        </span>
      </span>
    </div>
  );
}

function CashLine({
  label,
  amount,
  currency,
  direction,
  tone,
}: {
  label: string;
  amount: number;
  currency: string;
  /** Outgoing cash is signed, so direction survives without colour (§20). */
  direction?: "out";
  tone?: "success" | "error";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption text-text-secondary">{label}</span>
      <span
        className={cn(
          "pc-numeric text-body font-semibold",
          direction === "out" && "text-error-foreground",
          tone === "success" && "text-success-foreground",
          tone === "error" && "text-error-foreground",
          !direction && !tone && "text-text-primary",
        )}
      >
        {direction === "out" ? "− " : ""}
        {formatMoney({ amount: Math.abs(amount), currency })}
      </span>
    </div>
  );
}

function LabelledValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption text-text-secondary">{label}</span>
      <span className="text-body font-semibold text-text-primary">{value}</span>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
  numeric = false,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-2 text-body-sm text-text-secondary">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className={cn("text-body-sm text-text-primary", numeric && "pc-numeric")}>{value}</dd>
    </div>
  );
}
