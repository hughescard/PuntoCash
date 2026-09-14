"use client";

import * as React from "react";
import { FileText, Printer } from "lucide-react";

import { Button, Card, CardContent } from "@/components/ui";
import { formatDateTime, formatMoney, formatRate } from "@/lib/format";
import { operationDocumentLabel, type OperationRecord } from "@/features/operations/operations-history";

/**
 * "Comprobante" — the receipt strip at the foot of the detail screen.
 *
 * There is deliberately no "Descargar comprobante" action: nothing in the
 * product produces a downloadable artifact, and a button that only opened the
 * print dialog under a download label would misrepresent what happened. The
 * printed output comes from `PrintableReceipt` below plus the existing print
 * rules in `globals.css`, which hide the app chrome — the same mechanism the
 * Cambio de moneda result screen already uses. No PDF pipeline is introduced.
 */
export function ReceiptSection({
  operation,
  description = "Se generó el comprobante de la operación.",
}: {
  operation: OperationRecord;
  /** Overridable wording; the default is what every existing detail shows. */
  description?: string;
}): React.JSX.Element {
  return (
    <>
      <Card className="print:hidden">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
            >
              <FileText className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-card-title text-text-primary">Comprobante</p>
              <p className="text-body-sm text-text-secondary">{description}</p>
            </div>
          </div>

          <Button onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Imprimir comprobante
          </Button>
        </CardContent>
      </Card>

      <PrintableReceipt operation={operation} />
    </>
  );
}

/**
 * Print-only comprobante, mirroring the one the Cambio de moneda flow prints
 * so the same operation produces the same paper from either screen.
 * Deliberately plain markup — `globals.css` handles hiding the shell.
 */
function PrintableReceipt({ operation }: { operation: OperationRecord }) {
  const { amount } = operation;

  return (
    <section className="hidden print:block" aria-hidden="true">
      <h1 style={{ fontSize: "18px", fontWeight: 700 }}>PuntoCash · Comprobante de operación</h1>
      <p style={{ marginTop: 4 }}>{operation.servicio}</p>

      <dl style={{ marginTop: 16, lineHeight: 1.7 }}>
        <ReceiptLine label="Código de operación" value={operation.codigo} />
        <ReceiptLine label="Estado" value={operation.estado} />
        <ReceiptLine label="Fecha y hora" value={formatDateTime(new Date(operation.fechaHora))} />
        <ReceiptLine label="Cliente" value={operation.cliente.nombre} />
        <ReceiptLine label="Documento" value={operationDocumentLabel(operation)} />

        {amount.kind === "exchange" ? (
          <>
            <ReceiptLine label="Cliente entrega" value={formatMoney(amount.source)} />
            <ReceiptLine label="Cliente recibe" value={formatMoney(amount.destination)} />
            <ReceiptLine
              label="Tasa aplicada"
              value={`1 ${amount.source.currency} = ${formatRate(amount.appliedRate)} ${amount.destination.currency}`}
            />
          </>
        ) : (
          <ReceiptLine label="Importe" value={formatMoney(amount.money)} />
        )}

        <ReceiptLine label="Caja" value={operation.caja} />
        <ReceiptLine label="Trabajador" value={operation.worker} />
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
