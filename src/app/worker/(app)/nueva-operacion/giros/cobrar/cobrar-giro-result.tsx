"use client";

import * as React from "react";
import Link from "next/link";
import { Check, FileText, Printer } from "lucide-react";

import { Button, Card, CardContent } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import { MoneyWithFlag, currencyLabel } from "./cobrar-giro-parts";
import type { GiroPayoutCompleted } from "./confirm-payout";

/** Step 4 — Giro entregado correctamente. */
export function GiroPayoutResult({ completed }: { completed: GiroPayoutCompleted }): React.JSX.Element {
  const currency = currencyLabel(completed.payoutCurrency);

  return (
    <>
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center print:hidden">
        <span
          aria-hidden="true"
          className="grid size-14 place-items-center rounded-pill bg-success text-surface"
        >
          <Check className="size-8" strokeWidth={3} />
        </span>

        <h1 className="mt-5 text-screen-title text-text-primary">Giro entregado correctamente</h1>
        <p className="mt-2 text-body text-text-secondary">
          El giro ha sido completado y entregado al beneficiario.
        </p>

        <Card className="mt-8 w-full">
          <CardContent className="pt-6">
            <dl className="flex flex-col">
              <SummaryRow label="Código del giro" value={completed.giroCode} strong />
              <SummaryRow label="Beneficiario" value={completed.beneficiaryName} />
              <SummaryRow label="Documento de identidad" value={completed.beneficiaryIdentification} />
              <SummaryRow
                label="Importe entregado"
                value={<MoneyWithFlag amount={completed.payoutAmount} currency={completed.payoutCurrency} />}
              />
              <SummaryRow label="Moneda" value={currency} />
              <SummaryRow label="Caja" value={completed.caja} />
              <SummaryRow label="Trabajador" value={completed.worker} />
              <SummaryRow label="Fecha y hora" value={formatDateTime(new Date(completed.completedAt))} />
            </dl>
          </CardContent>
        </Card>

        <p className="mt-5 max-w-xl text-center text-body-sm text-text-secondary">
          El giro fue entregado correctamente y registrado en PuntoCash.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Imprimir comprobante
          </Button>
          <Button asChild>
            <Link href="/worker/operaciones">
              <FileText aria-hidden="true" />
              Ir a Operaciones
            </Link>
          </Button>
        </div>
      </div>

      <PrintablePayoutReceipt completed={completed} currency={currency} />
    </>
  );
}

/**
 * Browser print only — no PDF engine, the same mechanism every other
 * PuntoCash receipt uses. Internal ids and provider metadata are deliberately
 * absent: a receipt carries the operation code and the Giro code, nothing the
 * beneficiary has no business holding.
 */
function PrintablePayoutReceipt({
  completed,
  currency,
}: {
  completed: GiroPayoutCompleted;
  currency: string;
}) {
  return (
    <section className="hidden print:block" aria-hidden="true">
      <h1 style={{ fontSize: "18px", fontWeight: 700 }}>PuntoCash · Comprobante de entrega de giro</h1>
      <p style={{ marginTop: 4 }}>Giros</p>

      <dl style={{ marginTop: 16, lineHeight: 1.7 }}>
        <ReceiptLine label="Código de operación" value={completed.operationCode} />
        <ReceiptLine label="Código del giro" value={completed.giroCode} />
        {completed.giroReference ? <ReceiptLine label="Referencia" value={completed.giroReference} /> : null}
        <ReceiptLine label="Beneficiario" value={completed.beneficiaryName} />
        <ReceiptLine label="Documento de identidad" value={completed.beneficiaryIdentification} />
        <ReceiptLine
          label="Importe entregado"
          value={formatMoney({ amount: completed.payoutAmount, currency: completed.payoutCurrency })}
        />
        <ReceiptLine label="Moneda" value={currency} />
        <ReceiptLine label="Método de entrega" value="Recogida" />
        <ReceiptLine label="Caja" value={completed.caja} />
        <ReceiptLine label="Trabajador" value={completed.worker} />
        <ReceiptLine label="Fecha y hora" value={formatDateTime(new Date(completed.completedAt))} />
      </dl>
    </section>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
      <dt style={{ color: "#6B7280" }}>{label}</dt>
      <dd style={{ fontWeight: 600 }}>{value}</dd>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <dt className="text-body-sm text-text-secondary">{label}</dt>
      <dd
        className={
          strong
            ? "pc-numeric text-body-sm font-bold text-text-primary"
            : "pc-numeric text-body-sm font-semibold text-text-primary"
        }
      >
        {value}
      </dd>
    </div>
  );
}
