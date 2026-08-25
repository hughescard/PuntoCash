"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { CircleCheck, FileText, Plus, Printer } from "lucide-react";

import { Button, Card, CardContent } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatDateTime, formatMoney } from "@/lib/format";
import { customerFullName } from "@/features/customers/customers";
import { formatAppliedRate } from "./exchange-summary";
import type { CompletedOperation } from "./flow-state";

/**
 * Result screen. There is no Back from here — the operation is registered, so
 * the only ways on are a new operation or its detail (§19).
 */
export function OperationComplete({
  operation,
}: {
  operation: CompletedOperation;
}): React.JSX.Element {
  const { quote, customer } = operation;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-pill border-2 border-success text-success"
      >
        <CircleCheck className="size-8" />
      </span>

      <h2 className="mt-5 text-screen-title text-text-primary">Cambio realizado correctamente</h2>
      <p className="mt-2 text-body text-text-secondary">
        La operación quedó registrada en {operation.register}.
      </p>

      <Card className="mt-8 w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <ResultRow label="Código de operación">
              <span className="pc-numeric text-section-title text-text-primary">
                {operation.code}
              </span>
            </ResultRow>

            <hr className="border-t border-dashed border-border" />

            <ResultRow label="Cliente">
              <span className="text-body font-semibold text-text-primary">
                {customerFullName(customer)}
              </span>
            </ResultRow>

            <hr className="border-t border-dashed border-border" />

            <ResultRow label="Cambio">
              <span className="flex flex-wrap items-center gap-2">
                <CurrencyFlag currency={quote.sourceCurrency} />
                <span className="pc-numeric text-body font-semibold text-text-primary">
                  {formatMoney({
                    amount: quote.sourceAmount,
                    currency: quote.sourceCurrency,
                  })}
                </span>
                <span aria-hidden="true" className="text-text-secondary">
                  →
                </span>
                <CurrencyFlag currency={quote.destinationCurrency} />
                <span className="pc-numeric text-body font-semibold text-text-primary">
                  {formatMoney({
                    amount: quote.destinationAmount,
                    currency: quote.destinationCurrency,
                  })}
                </span>
              </span>
            </ResultRow>

            <hr className="border-t border-dashed border-border" />

            <ResultRow label="Tasa aplicada">
              <span className="pc-numeric text-body font-semibold text-text-primary">
                {formatAppliedRate(quote)}
              </span>
            </ResultRow>

            <hr className="border-t border-dashed border-border" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SmallFact label="Caja" value={operation.register} />
              <SmallFact label="Trabajador" value={operation.worker} />
              <SmallFact
                label="Fecha y hora"
                value={formatDateTime(new Date(operation.completedAt))}
                numeric
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex w-full flex-wrap items-center justify-center gap-3">
        {/* Browser print against a receipt-only stylesheet; no PDF pipeline. */}
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          Imprimir comprobante
        </Button>

        <Button variant="secondary" asChild>
          <Link href={`/worker/operaciones/${operation.code}` as Route}>
            <FileText aria-hidden="true" />
            Ver detalle
          </Link>
        </Button>

        <Button asChild>
          <Link href="/worker/nueva-operacion">
            <Plus aria-hidden="true" />
            Nueva operación
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ResultRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption text-text-secondary">{label}</span>
      {children}
    </div>
  );
}

function SmallFact({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption text-text-secondary">{label}</span>
      <span
        className={`text-body-sm font-medium text-text-primary${numeric ? " pc-numeric" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
