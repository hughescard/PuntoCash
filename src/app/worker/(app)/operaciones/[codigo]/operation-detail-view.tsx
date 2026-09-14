"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ClipboardList, FileSearch, Lock, User } from "lucide-react";

import { Button, Card, CardContent } from "@/components/ui";
import { OperationStatusBadge } from "@/components/patterns/operation-status-badge";
import { formatDateTime } from "@/lib/format";
import {
  findOperation,
  operationDocumentLabel,
  type OperationRecord,
} from "@/features/operations/operations-history";
import { DetailCard, DetailList, DetailRow } from "./detail-parts";
import { OperationStatusCard } from "./operation-status-card";
import { ReceiptSection } from "./receipt-section";
import { OperationCashCard, ServiceDetail } from "./service-detail";
import { RemittanceDetail } from "./remittance-detail";
import { GiroDetail } from "./giro-detail";

/**
 * Operation detail.
 *
 * Client Component on purpose: an operation completed moments ago in the
 * Cambio de moneda flow (`registerCompletedOperation`) is only ever recorded
 * in the browser's copy of the mock history — mutating shared module state is
 * invisible across the client/server boundary, so a Server Component here
 * would render the not-found card for an operation that genuinely exists.
 *
 * Composition follows the approved reference: identity and provenance on the
 * left, the service's own figures in the centre, status on the right, and the
 * comprobante across the foot.
 */
export function OperationDetailView({ codigo }: { codigo: string }): React.JSX.Element {
  const operation = findOperation(codigo);

  if (!operation) return <OperationNotFound codigo={codigo} />;
  if (operation.servicio === "Remesa" && operation.remittance) return <RemittanceOperationDetail operation={operation} />;
  // Both Giro actions — Enviar (`send`) and Cobrar (`payout`) — resolve to the
  // same specialized historical detail; it reads only the stored snapshot.
  if (operation.servicio === "Giros" && operation.transfer) {
    return <GiroOperationDetail operation={operation} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <OperationDetailHeader operation={operation} />

      {/* Three columns at desktop width: who and what on the left, the
          service's own figures in the centre, the outcome on the right. The
          register snapshot sits under the status because both describe what
          the operation left behind — and because the approved reference's
          second right-hand card ("Información adicional") is deliberately
          omitted here, having no genuine data behind it.

          Three columns from `xl` (1280px), the product's minimum supported
          desktop width, so the approved composition holds across the whole
          supported range; narrower than that the cards stack in reading order
          rather than cramping. There is deliberately no intermediate
          two-column rule: a `lg:` variant here outranks `xl:` in the emitted
          cascade (see the breakpoint note in `tokens.css`) and would pin the
          grid to two columns at 1280. */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <ClientSnapshotCard operation={operation} />
          <CommonOperationCard operation={operation} />
        </div>

        <ServiceDetail operation={operation} />

        <div className="flex flex-col gap-6">
          <OperationStatusCard status={operation.estado} />
          <OperationCashCard operation={operation} />
        </div>
      </div>

      <ReceiptSection operation={operation} />

      <p className="flex items-center justify-center gap-2 pb-2 text-caption text-text-secondary print:hidden">
        <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        La información de esta operación está protegida y solo puede ser vista por personal
        autorizado.
      </p>
    </div>
  );
}

/**
 * Giro detail keeps the page shell every other detail uses — back link,
 * comprobante strip and the confidentiality note — and lets `GiroDetail` own
 * everything between them, including its own header (the approved reference
 * puts the local action badge beside the title).
 */
function GiroOperationDetail({ operation }: { operation: OperationRecord }) {
  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <GiroDetail operation={operation} />
      <ReceiptSection
        operation={operation}
        description="Puedes imprimir el detalle registrado de esta operación."
      />

      <p className="flex items-center justify-center gap-2 pb-2 text-caption text-text-secondary print:hidden">
        <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        La información de esta operación está protegida y solo puede ser vista por personal
        autorizado.
      </p>
    </div>
  );
}

function RemittanceOperationDetail({ operation }: { operation: OperationRecord }) {
  return <div className="flex flex-col gap-6"><BackLink /><OperationDetailHeader operation={operation} remittance /><RemittanceDetail operation={operation} /><ReceiptSection operation={operation} /></div>;
}

function BackLink() {
  return (
    <Link
      href="/worker/operaciones"
      className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Volver a Operaciones
    </Link>
  );
}

/** Code, status and timestamp — the operation's identity line. */
function OperationDetailHeader({ operation, remittance = false }: { operation: OperationRecord; remittance?: boolean }) {
  return (
    <div className="flex flex-col gap-2 print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-screen-title text-text-primary">
          {remittance ? "Detalle de operación" : <>Operación <span className="pc-numeric">{operation.codigo}</span></>}
        </h1>
        <OperationStatusBadge status={operation.estado} />
      </div>

      <p className="flex items-center gap-2 text-body-sm text-text-secondary">
        <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
        <span className="pc-numeric">{formatDateTime(new Date(operation.fechaHora))}</span>
      </p>
      {remittance ? <p className="pc-numeric text-body-sm font-medium text-text-primary">{operation.codigo}</p> : null}
    </div>
  );
}

/**
 * The client as they were recorded on this operation. Reads the record's own
 * `cliente` snapshot, never the live customer directory — a later edit to that
 * customer's profile must not rewrite what this operation says (§15).
 */
function ClientSnapshotCard({ operation }: { operation: OperationRecord }) {
  const { cliente } = operation;

  return (
    <DetailCard title="Cliente" icon={User}>
      <DetailList>
        <DetailRow label="Nombre" value={cliente.nombre} />
        <DetailRow label="Documento" value={operationDocumentLabel(operation)} numeric />
        <DetailRow label="Teléfono" value={cliente.telefono} numeric />
        <DetailRow label="Nacionalidad" value={cliente.nacionalidad} />
      </DetailList>
    </DetailCard>
  );
}

/** Provenance shared by every service, whatever the operation did. */
function CommonOperationCard({ operation }: { operation: OperationRecord }) {
  return (
    <DetailCard title="Operación" icon={ClipboardList}>
      <DetailList>
        <DetailRow label="Servicio" value={operation.servicio} />
        <DetailRow label="Trabajador" value={operation.worker} />
        <DetailRow label="Caja" value={operation.caja} />
        <DetailRow
          label="Fecha y hora"
          value={formatDateTime(new Date(operation.fechaHora))}
          numeric
        />
        <DetailRow label="Código de operación" value={operation.codigo} numeric />
      </DetailList>
    </DetailCard>
  );
}

/**
 * An unrecognised code renders a graceful card rather than a hard 404:
 * operation codes are a growing runtime dataset, and a worker who mistypes or
 * revisits a stale link should get a clear way back, not a framework error.
 */
function OperationNotFound({ codigo }: { codigo: string }) {
  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
          <span
            aria-hidden="true"
            className="grid size-12 place-items-center rounded-control bg-primary-subtle text-primary"
          >
            <FileSearch className="size-6" />
          </span>
          <p className="mt-2 text-section-title text-text-primary">Operación no encontrada</p>
          <p className="max-w-sm text-body text-text-secondary">
            No hay ninguna operación con el código{" "}
            <span className="pc-numeric font-medium text-text-primary">{codigo}</span>.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/worker/operaciones">Volver a Operaciones</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
