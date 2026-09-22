"use client";

import * as React from "react";
import { ArrowRight, CircleCheck, CreditCard, UserRound } from "lucide-react";

import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { CAJA_SUMMARY } from "@/features/caja/caja-data";
import { findMunicipality, findProvince } from "@/features/geography/cuba-provinces";
import {
  DELIVERY_METHOD_LABEL,
  TRANSFER_STATUS_LABEL,
  type TransferPayoutSnapshot,
  type TransferStatus,
} from "@/features/transfers/transfer-provider";
import {
  ContextStrip,
  MoneyWithFlag,
  Rows,
  StepBackLink,
  currencyLabel,
  row,
} from "./cobrar-giro-parts";

/** Why a looked-up giro cannot be paid right now. `null` means it can. */
export type PayoutBlock = "estado" | "moneda" | "fondos" | null;

/* -------------------------------------------------------------------------
 * Step 2 — Revisar giro
 * ---------------------------------------------------------------------- */

export function GiroPayoutReview({
  transfer,
  worker,
  block,
  availableCash,
  onBack,
  onCancel,
  onContinue,
}: {
  transfer: TransferPayoutSnapshot;
  worker: string;
  block: PayoutBlock;
  availableCash?: number;
  onBack: () => void;
  onCancel: () => void;
  onContinue: () => void;
}): React.JSX.Element {
  const provinceLabel = transfer.receiverProvince
    ? (findProvince(transfer.receiverProvince)?.label ?? transfer.receiverProvince)
    : undefined;
  const municipalityLabel =
    transfer.receiverProvince && transfer.receiverMunicipality
      ? (findMunicipality(transfer.receiverProvince, transfer.receiverMunicipality)?.label ??
        transfer.receiverMunicipality)
      : transfer.receiverMunicipality;

  const giroRows = [
    row("Código del giro", transfer.code),
    row("Importe a entregar", <MoneyWithFlag key="importe" amount={transfer.deliveryAmount} currency={transfer.payoutCurrency} />),
    row("Moneda", currencyLabel(transfer.payoutCurrency)),
    row("Método de entrega", DELIVERY_METHOD_LABEL[transfer.deliveryMethod]),
    ...(transfer.reference ? [row("Referencia", transfer.reference)] : []),
    row("Estado del giro", <StatusBadge key="estado" status={transfer.status} />),
  ];

  const beneficiaryRows = [
    row("Nombre", transfer.receiverName),
    row("Documento de identidad", transfer.receiverIdentification),
    ...(transfer.receiverPhone ? [row("Teléfono", transfer.receiverPhone)] : []),
    ...(transfer.receiverAddress ? [row("Dirección", transfer.receiverAddress)] : []),
    ...(provinceLabel || municipalityLabel
      ? [row("Provincia / Municipio", [provinceLabel, municipalityLabel].filter(Boolean).join(" / "))]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <StepBackLink label="Volver a Cobrar giro" onClick={onBack} />

      <div>
        <h1 className="text-screen-title text-text-primary">Revisar giro</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">
          Verifica los datos del giro y la identidad del beneficiario antes de continuar.
        </p>
      </div>

      <ContextStrip worker={worker} />

      <div className="grid grid-cols-1 gap-4 wide:grid-cols-2">
        <SectionCard title="Datos del giro" icon={CreditCard}>
          <Rows rows={giroRows} />
        </SectionCard>
        <SectionCard title="Beneficiario" icon={UserRound}>
          <Rows rows={beneficiaryRows} />
        </SectionCard>
      </div>

      <Alert variant="warning" title="Verificación de identidad">
        Pide el carné al beneficiario, comprueba que la foto corresponde a la persona y que el
        número coincide con el mostrado antes de continuar.
      </Alert>

      {block === "estado" ? (
        <Alert variant="info" title="Este giro no está disponible para pago." />
      ) : block === "moneda" ? (
        <Alert
          variant="error"
          title={`${transfer.payoutCurrency} no está habilitada en esta caja.`}
        >
          No es posible entregar este giro desde la caja actual.
        </Alert>
      ) : block === "fondos" ? (
        <Alert
          variant="error"
          title={`La caja no dispone de suficiente ${transfer.payoutCurrency} para entregar este giro.`}
        >
          Disponible:{" "}
          {availableCash === undefined
            ? "—"
            : formatMoney({ amount: availableCash, currency: transfer.payoutCurrency })}
        </Alert>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button disabled={block !== null} onClick={onContinue}>
          Continuar a confirmar
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Step 3 — Confirmar entrega del giro
 * ---------------------------------------------------------------------- */

export function GiroPayoutConfirmation({
  transfer,
  worker,
  submitting,
  error,
  onBack,
  onCancel,
  onConfirm,
}: {
  transfer: TransferPayoutSnapshot;
  worker: string;
  submitting: boolean;
  error?: string;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <StepBackLink label="Volver a Revisar giro" onClick={onBack} />

      <div>
        <h1 className="text-screen-title text-text-primary">Confirmar entrega del giro</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">
          Confirma la entrega del efectivo al beneficiario.
        </p>
      </div>

      <ContextStrip worker={worker} />

      <Card>
        <CardHeader>
          <CardTitle>Resumen de entrega</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Rows
            rows={[
              row("Código del giro", transfer.code),
              row("Beneficiario", transfer.receiverName),
              row("Documento de identidad", transfer.receiverIdentification),
              row(
                "Importe a entregar",
                <MoneyWithFlag key="importe" amount={transfer.deliveryAmount} currency={transfer.payoutCurrency} />,
              ),
              row("Moneda", currencyLabel(transfer.payoutCurrency)),
              row("Caja", CAJA_SUMMARY.register),
            ]}
          />
        </CardContent>
      </Card>

      <Alert variant="warning" title="Acción irreversible">
        Confirma la operación únicamente después de verificar la identidad del beneficiario y
        entregar el efectivo correspondiente. El giro quedará marcado como completado.
      </Alert>

      {error ? <Alert variant="error" title={error} /> : null}

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" loading={submitting} onClick={onConfirm}>
          {submitting ? null : <CircleCheck aria-hidden="true" />}
          {submitting ? "Confirmando…" : "Confirmar entrega"}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Shared bits
 * ---------------------------------------------------------------------- */

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof CreditCard;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
          >
            <Icon className="size-[18px]" />
          </span>
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

/** Spanish is presentation only — the raw enum is what the record keeps. */
function StatusBadge({ status }: { status: TransferStatus }) {
  const variant =
    status === "READY"
      ? "success"
      : status === "COMPLETED" || status === "PAYED"
        ? "neutral"
        : status === "DENIED_PAYMENT" || status === "PAYOUT_DENIED"
          ? "error"
          : "warning";
  return <Badge variant={variant}>{TRANSFER_STATUS_LABEL[status]}</Badge>;
}
