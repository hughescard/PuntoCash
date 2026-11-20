import * as React from "react";
import { ClipboardList, Send, UserRound } from "lucide-react";

import { Badge, Card, CardContent } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { OperationStatusBadge } from "@/components/patterns/operation-status-badge";
import { formatDateTime, formatMoney, parseIsoDate } from "@/lib/format";
import { findCajaCurrency } from "@/features/caja/caja-data";
import {
  DELIVERY_METHOD_LABEL,
  TRANSFER_STATUS_LABEL,
  type DeliveryMethod,
  type TransferStatus,
} from "@/features/transfers/transfer-provider";
import {
  operationDocumentLabel,
  type OperationRecord,
} from "@/features/operations/operations-history";
import { CardGlyph, DetailCard, DetailList, DetailRow } from "./detail-parts";
import { entregadoAlCliente, difiereDeLoDebido } from "@/features/operations/entregado";
import { desgloseDeTarifa } from "@/app/worker/(app)/nueva-operacion/giros/enviar/cotizacion-de-giro";
import { CuentaDeEfectivo, filasDeUnPago, salidasDeUnPago, type FilaDeCuenta } from "./cuenta-de-efectivo";

/**
 * Specialized historical detail for "Giros".
 *
 * Strictly historical: everything here comes from `operation.transfer` and
 * `operation.amount` as they were stored when the operation was committed.
 * No provider call, no lookup, no recomputation against today's Caja — and no
 * mutation: a giro cannot be completed, cancelled, edited or retried from a
 * detail page.
 *
 * One component serves both local actions because they are the same document
 * seen from two sides. `transferAction` decides who the counterparty was
 * (sender vs. beneficiary), which way the cash moved (Entrada vs. Salida) and
 * the wording around it; everything else is shared.
 */
export function GiroDetail({ operation }: { operation: OperationRecord }): React.JSX.Element | null {
  const snapshot = operation.transfer;
  if (!snapshot) return null;

  const isPayout = snapshot.transferAction === "payout";

  return (
    <div className="flex flex-col gap-6">
      <GiroDetailHeader operation={operation} isPayout={isPayout} />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        {isPayout ? (
          <BeneficiaryCard operation={operation} />
        ) : (
          <SenderCard operation={operation} />
        )}
        <OperationCard operation={operation} isPayout={isPayout} />
      </div>

      <GiroCard operation={operation} isPayout={isPayout} />

      {isPayout ? <CuentaDelCobro operation={operation} /> : <CuentaDelEnvio operation={operation} />}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Header
 * ---------------------------------------------------------------------- */

function GiroDetailHeader({ operation, isPayout }: { operation: OperationRecord; isPayout: boolean }) {
  return (
    <div className="flex flex-col gap-1 print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-screen-title text-text-primary">Detalle de operación</h1>
        {/* The local action, not a provider status: "Giro enviado" and "Giro
            cobrado" describe what this branch did at the counter. */}
        <Badge variant={isPayout ? "error" : "info"} icon={<Send className="size-3.5" aria-hidden="true" />}>
          {isPayout ? "Giro cobrado" : "Giro enviado"}
        </Badge>
        <OperationStatusBadge status={operation.estado} />
      </div>
      <p className="pc-numeric text-body text-text-secondary">{operation.codigo}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Counterparty — whoever stood at the counter for THIS operation
 * ---------------------------------------------------------------------- */

/** Enviar giro: the sender created the giro and handed over the cash. */
function SenderCard({ operation }: { operation: OperationRecord }) {
  const sender = operation.transfer?.sender;

  return (
    <DetailCard title="Remitente" icon={UserRound}>
      <DetailList>
        <DetailRow label="Nombre completo" value={operation.cliente.nombre} />
        <DetailRow label="Documento" value={operationDocumentLabel(operation)} numeric />
        {sender?.birthDate ? (
          <DetailRow label="Fecha de nacimiento" value={birthDateLabel(sender.birthDate)} numeric />
        ) : null}
        <DetailRow label="Teléfono" value={operation.cliente.telefono} numeric />
        <DetailRow label="Nacionalidad" value={operation.cliente.nacionalidad} />
      </DetailList>
    </DetailCard>
  );
}

/** Cobrar giro: the beneficiary presented the code and received the cash. */
function BeneficiaryCard({ operation }: { operation: OperationRecord }) {
  const snapshot = operation.transfer!;
  const location = locationLabel(snapshot);

  return (
    <DetailCard title="Beneficiario" icon={UserRound}>
      <DetailList>
        <DetailRow label="Nombre completo" value={snapshot.receiverName} />
        <DetailRow label="Documento de identidad" value={snapshot.receiverIdentification} numeric />
        {snapshot.receiverPhone ? (
          <DetailRow label="Teléfono" value={snapshot.receiverPhone} numeric />
        ) : null}
        {location ? <DetailRow label="Provincia / Municipio" value={location} /> : null}
      </DetailList>
    </DetailCard>
  );
}

/* -------------------------------------------------------------------------
 * Operación
 * ---------------------------------------------------------------------- */

function OperationCard({ operation, isPayout }: { operation: OperationRecord; isPayout: boolean }) {
  return (
    <DetailCard title="Operación" icon={ClipboardList}>
      <DetailList>
        <DetailRow label="Código de operación" value={operation.codigo} numeric />
        <DetailRow label="Servicio" value={operation.servicio} />
        {/* The Spanish label for the stored `transferAction` discriminator —
            the raw value itself is never rendered. */}
        <DetailRow label="Tipo de operación" value={isPayout ? "Cobro" : "Envío"} />
        <DetailRow
          label="Fecha y hora"
          value={formatDateTime(new Date(operation.fechaHora))}
          numeric
        />
        <DetailRow label="Trabajador" value={operation.worker} />
        <DetailRow label="Caja" value={operation.caja} />
      </DetailList>
    </DetailCard>
  );
}

/* -------------------------------------------------------------------------
 * Giro — the external document, as it was recorded
 * ---------------------------------------------------------------------- */

function GiroCard({ operation, isPayout }: { operation: OperationRecord; isPayout: boolean }) {
  const snapshot = operation.transfer!;
  const location = locationLabel(snapshot);

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <CardGlyph icon={Send} />
          <h2 className="text-card-title font-semibold text-text-primary">Giro</h2>
        </div>

        <div className="grid grid-cols-1 gap-x-10 gap-y-6 xl:grid-cols-2 xl:divide-x xl:divide-border">
          <section className="min-w-0 xl:pr-10">
            <h3 className="text-body-sm font-semibold text-text-primary">Datos del giro</h3>
            <DetailList className="mt-2">
              <DetailRow label="Código del giro" value={snapshot.code} numeric />
              {snapshot.reference ? (
                <DetailRow label="Referencia" value={snapshot.reference} numeric />
              ) : null}
              <DetailRow label="Método de entrega" value={deliveryMethodLabel(snapshot.deliveryMethod)} />
              {isPayout && difiereDeLoDebido({ amount: snapshot.deliveryAmount, currency: snapshot.senderCurrency }, operation.liquidacion) ? (
                <DetailRow label="Importe del giro" value={formatMoney({ amount: snapshot.deliveryAmount, currency: snapshot.senderCurrency })} numeric />
              ) : null}
              <DetailRow
                label={isPayout ? "Importe entregado" : "Importe enviado"}
                value={
                  isPayout
                    ? entregadoAlCliente({ amount: snapshot.deliveryAmount, currency: snapshot.senderCurrency }, operation.liquidacion)
                        .map(formatMoney)
                        .join(" + ")
                    : formatMoney({ amount: snapshot.deliveryAmount, currency: snapshot.senderCurrency })
                }
                numeric
                strong
              />
              <DetailRow
                label="Moneda"
                value={
                  <span className="inline-flex items-center gap-2">
                    <CurrencyFlag currency={snapshot.senderCurrency} />
                    {currencyLabel(snapshot.senderCurrency)}
                  </span>
                }
              />
              {snapshot.externalStatus ? (
                <DetailRow
                  label="Estado del giro"
                  value={<GiroStatusBadge status={snapshot.externalStatus} />}
                />
              ) : null}
            </DetailList>
          </section>

          <section className="min-w-0">
            {isPayout ? (
              <>
                <h3 className="text-body-sm font-semibold text-text-primary">Resumen</h3>
                <DetailList className="mt-2">
                  <DetailRow label="Beneficiario" value={snapshot.receiverName} />
                  <DetailRow label="Documento" value={snapshot.receiverIdentification} numeric />
                  <DetailRow label="Tipo de operación" value="Cobro" />
                </DetailList>
              </>
            ) : (
              <>
                <div className="flex min-w-0 items-center gap-3">
                  <CardGlyph icon={UserRound} />
                  <h3 className="text-card-title font-semibold text-text-primary">Beneficiario</h3>
                </div>
                <DetailList className="mt-2">
                  <DetailRow label="Nombre" value={snapshot.receiverName} />
                  <DetailRow
                    label="Documento de identidad"
                    value={snapshot.receiverIdentification}
                    numeric
                  />
                  {snapshot.receiverPhone ? (
                    <DetailRow label="Teléfono" value={snapshot.receiverPhone} numeric />
                  ) : null}
                  {snapshot.receiverEmail ? (
                    <DetailRow label="Correo electrónico" value={snapshot.receiverEmail} prosa />
                  ) : null}
                  {snapshot.receiverAddress ? (
                    <DetailRow label="Dirección" value={snapshot.receiverAddress} prosa />
                  ) : null}
                  {location ? <DetailRow label="Provincia / Municipio" value={location} /> : null}
                </DetailList>
              </>
            )}
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------
 * Movimiento de efectivo — la cuenta del giro (19/11/2026)
 * ---------------------------------------------------------------------- */

/**
 * Lo que costó el giro y lo que movió en la caja, leído como una cuenta de
 * arriba abajo: lo que recibe el beneficiario y la tarifa; lo que entregó el
 * cliente y el vuelto, si lo hubo; y al final el total cobrado, al que llegan
 * las dos cuentas. Debajo, la entrada en caja, que es el único movimiento del
 * libro, neto.
 */
function CuentaDelEnvio({ operation }: { operation: OperationRecord }) {
  const snapshot = operation.transfer!;
  const money = operation.amount.kind === "single" ? operation.amount.money : undefined;
  if (!money) return null;
  const currency = money.currency;
  const m = (amount: number) => formatMoney({ amount, currency });
  const tarifa = snapshot.tarifa;
  const vuelto = operation.liquidacion?.vuelto?.currency === currency ? operation.liquidacion.vuelto.importe : 0;
  const total = tarifa?.total ?? money.amount;

  const filas: FilaDeCuenta[] = [
    ...(tarifa
      ? [
          { etiqueta: "Recibe el beneficiario", valor: m(snapshot.deliveryAmount) },
          {
            etiqueta: "Tarifa",
            valor: m(tarifa.cobrada),
            ...(tarifa.porcentaje > 0 ? { detalle: desgloseDeTarifa(tarifa, currency) } : {}),
          },
        ]
      : []),
    ...(vuelto > 0
      ? [
          { etiqueta: "Entregó el cliente", valor: m(total + vuelto) },
          { etiqueta: "Vuelto", valor: `−${m(vuelto)}`, resta: true },
        ]
      : []),
    /* Cierra la cuenta: es a lo que llegan las dos sumas, giro + tarifa y entregó − vuelto. */
    { etiqueta: "Total cobrado", valor: m(total), total: true },
  ];

  return (
    <CuentaDeEfectivo
      filas={filas}
      movimientos={[{ sentido: "entrada", money }]}
      servicio="Giro"
      pie={<PieDeLaCuenta currency={currency} codigo={operation.codigo} />}
    />
  );
}

/**
 * Cobrar giro: lo que se debía al beneficiario y cómo se le pagó —con lo que
 * quedó a favor de la casa por redondeo y la parte pagada en CUP, si la hubo—;
 * debajo, lo que salió de la caja, por moneda.
 */
function CuentaDelCobro({ operation }: { operation: OperationRecord }) {
  const money = operation.amount.kind === "single" ? operation.amount.money : undefined;
  if (!money) return null;
  const debido = { amount: operation.transfer!.deliveryAmount, currency: money.currency };
  return (
    <CuentaDeEfectivo
      filas={filasDeUnPago(debido, "Importe del giro", operation.liquidacion, "Entregado al beneficiario")}
      movimientos={salidasDeUnPago(debido, operation.liquidacion)}
      servicio="Giro"
      pie={<PieDeLaCuenta currency={money.currency} codigo={operation.codigo} />}
    />
  );
}

function PieDeLaCuenta({ currency, codigo }: { currency: string; codigo: string }) {
  return (
    <div className="grid grid-cols-1 gap-x-10 xl:grid-cols-2">
      <DetailList>
        <DetailRow label="Moneda" value={currencyLabel(currency)} />
      </DetailList>
      <DetailList>
        <DetailRow label="Operación vinculada" value={codigo} numeric />
      </DetailList>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Label mapping — raw API values never reach the screen
 * ---------------------------------------------------------------------- */

/** `"COMPLETED"` → "Completado". An unmapped value falls back to no badge text. */
function GiroStatusBadge({ status }: { status: string }) {
  const label = transferStatusLabel(status);
  if (!label) return null;
  const variant =
    status === "READY" || status === "COMPLETED" || status === "PAYED"
      ? "success"
      : status === "DENIED_PAYMENT" || status === "PAYOUT_DENIED"
        ? "error"
        : "warning";
  return <Badge variant={variant}>{label}</Badge>;
}

function transferStatusLabel(status: string): string | undefined {
  return TRANSFER_STATUS_LABEL[status as TransferStatus];
}

/** `"pickup"` → "Recogida". */
function deliveryMethodLabel(method: DeliveryMethod): string {
  return DELIVERY_METHOD_LABEL[method] ?? method;
}

/**
 * "01/01/1985" — the numeric form the approved detail reference uses, which
 * is not `formatIsoDate`'s "1 ene 1985". Built from parts through
 * `parseIsoDate` so a stored calendar date never shifts across a timezone.
 */
function birthDateLabel(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** "CUP · Peso cubano", falling back to the bare code for anything uncatalogued. */
function currencyLabel(currency: string): string {
  const entry = findCajaCurrency(currency);
  return entry ? `${entry.code} · ${entry.name}` : currency;
}

/** "La Habana · Plaza de la Revolución" from the labels frozen at capture time. */
function locationLabel(snapshot: NonNullable<OperationRecord["transfer"]>): string | undefined {
  const parts = [snapshot.receiverProvinceLabel, snapshot.receiverMunicipalityLabel].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}
