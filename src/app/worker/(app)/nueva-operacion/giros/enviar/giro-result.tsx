"use client";

import * as React from "react";
import Link from "next/link";
import { CircleCheck, FileText, Printer } from "lucide-react";

import { Button, Card, CardContent } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatDateTime, formatMoney } from "@/lib/format";
import { findCajaCurrency, CAJA_SUMMARY } from "@/features/caja/caja-data";
import { senderFullName, type BeneficiaryValues, type SenderValues } from "./giro-types";
import { municipalityLabel, provinceLabel } from "./giro-validation";

/** "🇨🇺 500,00 CUP" — the approved amount treatment for Importe. */
function MoneyWithFlag({ amount, currency }: { amount: number; currency: string }) {
  return (
    <span className="flex items-center gap-2 pc-numeric">
      <CurrencyFlag currency={currency} />
      {formatMoney({ amount, currency })}
    </span>
  );
}

/** Everything the Result screen and its printable receipt need — frozen at confirmation time. */
export interface GiroCompleted {
  operationCode: string;
  giroCode: string;
  giroReference?: string;
  sender: SenderValues;
  beneficiary: BeneficiaryValues;
  senderCurrency: string;
  deliveryAmount: number;
  /** ISO datetime, captured only at the moment confirmation succeeded. */
  completedAt: string;
}

/** Step 4 — Success. */
export function GiroResult({ completed }: { completed: GiroCompleted }): React.JSX.Element {
  const currencyEntry = findCajaCurrency(completed.senderCurrency);
  const currencyLabel = currencyEntry ? `${currencyEntry.code} · ${currencyEntry.name}` : completed.senderCurrency;

  return (
    <>
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center print:hidden">
        <span
          aria-hidden="true"
          className="grid size-14 place-items-center rounded-pill border-2 border-success text-success"
        >
          <CircleCheck className="size-8" />
        </span>

        <h1 className="mt-5 text-screen-title text-text-primary">Giro registrado correctamente</h1>
        <p className="mt-2 text-body text-text-secondary">
          La operación fue creada y registrada en PuntoCash.
        </p>

        <Card className="mt-8 w-full">
          <CardContent className="grid grid-cols-1 gap-x-8 gap-y-0 pt-6 sm:grid-cols-2">
            <SummaryRow label="Código de operación" value={completed.operationCode} />
            <SummaryRow label="Código del giro" value={completed.giroCode} strong />
            <SummaryRow label="Remitente" value={senderFullName(completed.sender)} />
            <SummaryRow label="Beneficiario" value={completed.beneficiary.receiverName} />
            <SummaryRow label="Documento del beneficiario" value={completed.beneficiary.receiverIdentification} />
            <SummaryRow
              label="Importe"
              value={<MoneyWithFlag amount={completed.deliveryAmount} currency={completed.senderCurrency} />}
            />
            <SummaryRow label="Moneda" value={currencyLabel} />
            <SummaryRow label="Método de entrega" value="Recogida" />
            <SummaryRow label="Caja" value={CAJA_SUMMARY.register} />
            <SummaryRow label="Trabajador" value={CAJA_SUMMARY.worker} />
            <SummaryRow label="Fecha y hora" value={formatDateTime(new Date(completed.completedAt))} />
          </CardContent>
        </Card>

        <p className="mt-5 max-w-xl text-center text-body-sm text-text-secondary">
          El giro fue registrado correctamente y ya puede ser gestionado para su pago al
          beneficiario.
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

      <PrintableGiroReceipt completed={completed} currencyLabel={currencyLabel} />
    </>
  );
}

/** Same `hidden print:block` mechanism every other PuntoCash receipt already uses. */
function PrintableGiroReceipt({
  completed,
  currencyLabel,
}: {
  completed: GiroCompleted;
  currencyLabel: string;
}) {
  const { beneficiary } = completed;
  return (
    <section className="hidden print:block" aria-hidden="true">
      <h1 style={{ fontSize: "18px", fontWeight: 700 }}>PuntoCash · Comprobante de giro</h1>
      <p style={{ marginTop: 4 }}>Giros</p>

      <dl style={{ marginTop: 16, lineHeight: 1.7 }}>
        <ReceiptLine label="Código de operación" value={completed.operationCode} />
        <ReceiptLine label="Código del giro" value={completed.giroCode} />
        {completed.giroReference ? <ReceiptLine label="Referencia" value={completed.giroReference} /> : null}
        <ReceiptLine label="Remitente" value={senderFullName(completed.sender)} />
        <ReceiptLine label="Beneficiario" value={beneficiary.receiverName} />
        <ReceiptLine label="Documento del beneficiario" value={beneficiary.receiverIdentification} />
        <ReceiptLine
          label="Provincia / Municipio"
          value={`${provinceLabel(beneficiary.receiverProvince)} / ${municipalityLabel(beneficiary.receiverProvince, beneficiary.receiverMunicipality)}`}
        />
        <ReceiptLine
          label="Importe"
          value={formatMoney({ amount: completed.deliveryAmount, currency: completed.senderCurrency })}
        />
        <ReceiptLine label="Moneda" value={currencyLabel} />
        <ReceiptLine label="Método de entrega" value="Recogida" />
        <ReceiptLine label="Caja" value={CAJA_SUMMARY.register} />
        <ReceiptLine label="Trabajador" value={CAJA_SUMMARY.worker} />
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
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 sm:odd:pr-4 sm:even:pl-4">
      <dt className="text-body-sm text-text-secondary">{label}</dt>
      <dd className={strong ? "pc-numeric text-body-sm font-bold text-text-primary" : "pc-numeric text-body-sm font-semibold text-text-primary"}>
        {value}
      </dd>
    </div>
  );
}
