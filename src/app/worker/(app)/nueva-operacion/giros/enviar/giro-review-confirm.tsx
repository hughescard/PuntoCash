"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, CircleCheck, ClipboardList, CreditCard, Send, UserRound } from "lucide-react";

import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatIsoDate, formatMoney } from "@/lib/format";
import { documentTypeShortLabel } from "@/features/customers/customers";
import { CAJA_SUMMARY, findCajaCurrency } from "@/features/caja/caja-data";
import { senderFullName, type GiroDraft } from "./giro-types";
import { municipalityLabel, provinceLabel } from "./giro-validation";

/** "🇨🇺 500,00 CUP" — the approved amount treatment for Importe (a)/(a entregar). */
function MoneyWithFlag({ amount, currency }: { amount: number; currency: string }) {
  return (
    <span className="flex items-center gap-2 pc-numeric">
      <CurrencyFlag currency={currency} />
      {formatMoney({ amount, currency })}
    </span>
  );
}

/* -------------------------------------------------------------------------
 * Step 2 — Revisar giro
 * ---------------------------------------------------------------------- */

export function GiroReview({
  draft,
  worker,
  onBack,
  onCancel,
  onContinue,
}: {
  draft: GiroDraft;
  worker: string;
  onBack: () => void;
  onCancel: () => void;
  onContinue: () => void;
}): React.JSX.Element {
  const currencyEntry = findCajaCurrency(draft.senderCurrency);
  const currencyLabel = currencyEntry ? `${currencyEntry.code} · ${currencyEntry.name}` : draft.senderCurrency;

  return (
    <div className="flex flex-col gap-6">
      <StepBackLink label="Volver a Giros" onClick={onBack} />

      <div>
        <h1 className="text-screen-title text-text-primary">Revisar giro</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">
          Verifica la información antes de confirmar el envío.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 wide:grid-cols-2">
        <SectionCard title="Datos del remitente" icon={UserRound}>
          <Rows
            rows={[
              ["Nombre completo", senderFullName(draft.sender)],
              ["Documento", `${documentTypeShortLabel(draft.sender.documentType)} · ${draft.sender.documentNumber}`],
              ["Fecha de nacimiento", formatIsoDate(draft.sender.birthDate)],
              ["Teléfono", draft.sender.phone],
              ["Nacionalidad", draft.sender.nationality],
            ]}
          />
        </SectionCard>

        <SectionCard title="Beneficiario" icon={UserRound}>
          <Rows
            rows={[
              ["Nombre", draft.beneficiary.receiverName],
              ["Documento de identidad", draft.beneficiary.receiverIdentification],
              ["Teléfono", draft.beneficiary.receiverPhone],
              ["Correo electrónico", draft.beneficiary.receiverEmail || "—"],
              ["Dirección", draft.beneficiary.receiverAddress],
              [
                "Provincia / Municipio",
                `${provinceLabel(draft.beneficiary.receiverProvince)} / ${municipalityLabel(draft.beneficiary.receiverProvince, draft.beneficiary.receiverMunicipality)}`,
              ],
            ]}
          />
        </SectionCard>

        <SectionCard title="Datos del giro" icon={Send}>
          <Rows
            rows={[
              ["Método de entrega", "Recogida"],
              ["Moneda", currencyLabel],
              ["Importe a entregar", <MoneyWithFlag key="importe" amount={draft.deliveryAmount} currency={draft.senderCurrency} />],
            ]}
          />
        </SectionCard>

        <SectionCard title="Caja" icon={CreditCard}>
          <Rows
            rows={[
              ["Caja", CAJA_SUMMARY.register],
              ["Trabajador", worker],
              ["Impacto en caja", "Entrada de efectivo"],
            ]}
          />
        </SectionCard>
      </div>

      <Alert variant="warning" title="Verificación de datos">
        Confirma que la información del remitente y del beneficiario sea correcta antes de
        registrar el giro.
      </Alert>

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onContinue}>
          Continuar a confirmar
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Step 3 — Confirmar envío
 * ---------------------------------------------------------------------- */

export function GiroConfirmation({
  draft,
  submitting,
  error,
  onBack,
  onCancel,
  onConfirm,
}: {
  draft: GiroDraft;
  submitting: boolean;
  error?: string;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}): React.JSX.Element {
  const currencyEntry = findCajaCurrency(draft.senderCurrency);
  const currencyLabel = currencyEntry ? `${currencyEntry.code} · ${currencyEntry.name}` : draft.senderCurrency;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <StepBackLink label="Volver a Revisar giro" onClick={onBack} />

      <div>
        <h1 className="text-screen-title text-text-primary">Confirmar envío de giro</h1>
        <p className="mt-2 text-body text-text-secondary">Confirma el registro del giro en el sistema.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de confirmación</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-8 gap-y-0 pt-0 sm:grid-cols-2">
          <ConfirmRow label="Remitente" value={senderFullName(draft.sender)} />
          <ConfirmRow label="Beneficiario" value={draft.beneficiary.receiverName} />
          <ConfirmRow label="Documento del beneficiario" value={draft.beneficiary.receiverIdentification} />
          <ConfirmRow
            label="Provincia / Municipio"
            value={`${provinceLabel(draft.beneficiary.receiverProvince)} / ${municipalityLabel(draft.beneficiary.receiverProvince, draft.beneficiary.receiverMunicipality)}`}
          />
          <ConfirmRow label="Método de entrega" value="Recogida" />
          <ConfirmRow label="Moneda" value={currencyLabel} />
          <ConfirmRow
            label="Importe a entregar"
            value={<MoneyWithFlag amount={draft.deliveryAmount} currency={draft.senderCurrency} />}
          />
          <ConfirmRow label="Caja" value={CAJA_SUMMARY.register} />
        </CardContent>
      </Card>

      <Alert variant="warning" title="Acción irreversible">
        Confirma esta operación solo cuando hayas recibido el efectivo y verificado los datos del
        giro. La operación quedará registrada en el sistema.
      </Alert>

      {error ? <Alert variant="error" title={error} /> : null}

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="button" loading={submitting} onClick={onConfirm}>
          {submitting ? null : <CircleCheck aria-hidden="true" />}
          {submitting ? "Confirmando…" : "Confirmar envío"}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Shared bits
 * ---------------------------------------------------------------------- */

function StepBackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof ClipboardList;
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

function Rows({ rows }: { rows: readonly (readonly [string, React.ReactNode])[] }) {
  return (
    <dl className="flex flex-col">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-b-0 last:pb-0">
          <dt className="min-w-0 text-body-sm text-text-secondary">{label}</dt>
          <dd className="shrink-0 text-right text-body-sm font-medium text-text-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ConfirmRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5">
      <dt className="text-body-sm text-text-secondary">{label}</dt>
      <dd className="text-body-sm font-semibold text-text-primary">{value}</dd>
    </div>
  );
}
