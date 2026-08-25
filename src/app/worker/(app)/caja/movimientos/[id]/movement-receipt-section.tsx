"use client";

import * as React from "react";
import { FileText, Printer } from "lucide-react";

import { Button, Card, CardContent } from "@/components/ui";
import { formatDateTime, formatMoney, formatSignedAmount } from "@/lib/format";
import { CAJA_SUMMARY, type CajaMovement } from "@/features/caja/caja-data";

/**
 * "Comprobante" — same `hidden print:block` mechanism as every other
 * PuntoCash receipt (Operation Detail, Ajustar efectivo, Registrar fondeo
 * inicial). No PDF pipeline, no "Descargar comprobante".
 */
export function MovementReceiptSection({ movement }: { movement: CajaMovement }): React.JSX.Element {
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
              <p className="text-body-sm text-text-secondary">
                Puedes imprimir el detalle registrado de este movimiento.
              </p>
            </div>
          </div>

          <Button onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Imprimir comprobante
          </Button>
        </CardContent>
      </Card>

      <PrintableMovementReceipt movement={movement} />
    </>
  );
}

function PrintableMovementReceipt({ movement }: { movement: CajaMovement }) {
  const jornada = movement.jornada;

  return (
    <section className="hidden print:block" aria-hidden="true">
      <h1 style={{ fontSize: "18px", fontWeight: 700 }}>PuntoCash · Comprobante de movimiento</h1>
      <p style={{ marginTop: 4 }}>{movement.concepto}</p>

      <dl style={{ marginTop: 16, lineHeight: 1.7 }}>
        <ReceiptLine label="ID de movimiento" value={movement.id} />
        <ReceiptLine label="Concepto" value={movement.concepto} />
        <ReceiptLine label="Tipo" value={movement.tipo === "entrada" ? "Entrada" : "Salida"} />
        <ReceiptLine label="Caja" value={jornada?.register ?? CAJA_SUMMARY.register} />
        <ReceiptLine label="Trabajador" value={jornada?.worker ?? CAJA_SUMMARY.worker} />
        <ReceiptLine label="Fecha y hora" value={formatDateTime(new Date(movement.fechaHora))} />
        <ReceiptLine label="Moneda" value={movement.currency} />
        {movement.saldoAntes !== undefined ? (
          <ReceiptLine
            label="Saldo anterior"
            value={formatMoney({ amount: movement.saldoAntes, currency: movement.currency })}
          />
        ) : null}
        <ReceiptLine
          label={movement.concepto === "Ajuste de efectivo" || movement.concepto === "Ajuste de cierre" ? "Efectivo contado" : "Importe"}
          value={
            (movement.concepto === "Ajuste de efectivo" || movement.concepto === "Ajuste de cierre") && movement.saldoDespues !== undefined
              ? formatMoney({ amount: movement.saldoDespues, currency: movement.currency })
              : `${formatSignedAmount(movement.amount)} ${movement.currency}`
          }
        />
        {movement.concepto === "Ajuste de efectivo" || movement.concepto === "Ajuste de cierre" ? (
          <ReceiptLine label="Diferencia" value={`${formatSignedAmount(movement.amount)} ${movement.currency}`} />
        ) : null}
        {movement.saldoDespues !== undefined ? (
          <ReceiptLine
            label="Saldo resultante"
            value={formatMoney({ amount: movement.saldoDespues, currency: movement.currency })}
          />
        ) : null}
        {movement.motivo ? <ReceiptLine label="Motivo" value={movement.motivo} /> : null}
        {movement.observaciones ? <ReceiptLine label="Observaciones" value={movement.observaciones} /> : null}
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
