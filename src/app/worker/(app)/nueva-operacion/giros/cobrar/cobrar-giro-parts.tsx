"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Banknote, CalendarClock, User, Wallet } from "lucide-react";

import { Card, CardContent } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { CAJA_BALANCES, CAJA_SUMMARY, findCajaCurrency } from "@/features/caja/caja-data";

/** Where Cobrar giro returns to — the Giros operation selector, never Enviar. */
export const GIROS_ROUTE = "/worker/nueva-operacion/giros";

export function BackLink({ href, label }: { href?: string; label: string }): React.JSX.Element {
  const className =
    "inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden";

  return (
    <Link href={(href ?? GIROS_ROUTE) as Route} className={className}>
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}

/** The in-flow "step back" control — a button, because it only moves the step pointer. */
export function StepBackLink({ label, onClick }: { label: string; onClick: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}

/** Caja · Trabajador · Jornada · Monedas habilitadas — the same strip Enviar giro carries. */
export function ContextStrip({ worker }: { worker: string }): React.JSX.Element {
  return (
    <Card>
      <CardContent className="grid grid-cols-2 gap-6 py-5 wide:grid-cols-4">
        <InfoItem icon={Wallet} label="Caja" value={CAJA_SUMMARY.register} />
        <InfoItem icon={User} label="Trabajador" value={worker} />
        <InfoItem
          icon={CalendarClock}
          label="Jornada actual"
          value="Abierta"
          valueClassName="text-success-foreground"
        />
        <InfoItem icon={Banknote} label="Monedas habilitadas" value={String(CAJA_BALANCES.length)} />
      </CardContent>
    </Card>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-caption text-text-secondary">{label}</span>
        <span className={cn("text-body-sm font-semibold text-text-primary", valueClassName)}>{value}</span>
      </span>
    </span>
  );
}

/** "🇨🇺 2.500,00 CUP" — the approved amount treatment across every Giro screen. */
export function MoneyWithFlag({ amount, currency }: { amount: number; currency: string }): React.JSX.Element {
  return (
    <span className="flex items-center gap-2 pc-numeric">
      <CurrencyFlag currency={currency} />
      {formatMoney({ amount, currency })}
    </span>
  );
}

/** "CUP · Peso cubano", falling back to the bare code for anything uncatalogued. */
export function currencyLabel(currency: string): string {
  const entry = findCajaCurrency(currency);
  return entry ? `${entry.code} · ${entry.name}` : currency;
}

export function Rows({
  rows,
}: {
  rows: readonly (readonly [string, React.ReactNode])[];
}): React.JSX.Element {
  return (
    <dl className="flex flex-col">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-b-0 last:pb-0"
        >
          <dt className="min-w-0 text-body-sm text-text-secondary">{label}</dt>
          <dd className="shrink-0 text-right text-body-sm font-medium text-text-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function row(label: string, value: React.ReactNode): readonly [string, React.ReactNode] {
  return [label, value];
}
