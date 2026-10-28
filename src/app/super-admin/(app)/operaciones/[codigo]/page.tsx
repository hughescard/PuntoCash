import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, User } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Button, Card, CardContent } from "@/components/ui";
import { OperationStatusBadge } from "@/components/patterns/operation-status-badge";
import { operationDocumentLabel } from "@/features/operations/operations-history";
import { GLOBAL_SCOPE } from "@/features/network/scope";
import { redEnAlcance } from "@/features/network/scoped-reads";
import type { OperacionDeRed } from "@/features/network/operaciones";
import { OPERATORS } from "@/features/network/operators";
import { asignacionVigente, operadorVigenteEn } from "@/features/network/assignments";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
/* El detalle se compone con las mismas piezas que el de Worker, en solo
   lectura. Lo que Worker añade como acción —el comprobante— no se trae. */
import { DetailCard, DetailList, DetailRow } from "@/app/worker/(app)/operaciones/[codigo]/detail-parts";
import { GiroDetail } from "@/app/worker/(app)/operaciones/[codigo]/giro-detail";
import { OperationStatusCard } from "@/app/worker/(app)/operaciones/[codigo]/operation-status-card";
import { RemittanceDetail } from "@/app/worker/(app)/operaciones/[codigo]/remittance-detail";
import { OperationCashCard, ServiceDetail } from "@/app/worker/(app)/operaciones/[codigo]/service-detail";
import { EstadoBadge, fechaYHora, nombreDeJornada } from "@/app/admin/(app)/jornadas/formato";

export const metadata: Metadata = {
  title: "Super administración · Operación",
  robots: { index: false, follow: false },
};

/**
 * Una operación de la red. **Ninguna acción**: ni reimprimir, ni anular, ni
 * corregir. Es un registro.
 *
 * El contexto añade sobre el de Admin el **operador responsable en la fecha
 * de la operación**, leído del historial de asignaciones en esa fecha y no
 * de la asignación de hoy. Si la sede cambió de manos después, la pantalla
 * lo dice: una operación de marzo se concilia con quien administraba en
 * marzo, y confundirlos es confundir dos deudas.
 */
export default async function SuperAdminOperacionPage({ params }: { params: Promise<{ codigo: string }> }) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const { codigo } = await params;
  const red = redEnAlcance(GLOBAL_SCOPE);
  const o = red.operacion(decodeURIComponent(codigo));
  if (!o) notFound();

  const sede = red.sede(o.sedeId);
  const jornada = red.jornada(o.jornadaId);

  const entoncesId = operadorVigenteEn(o.sedeId, new Date(o.fechaHora));
  const entonces = entoncesId ? OPERATORS.find((x) => x.id === entoncesId) ?? null : null;
  const hoyId = asignacionVigente(o.sedeId)?.operatorId ?? null;
  const cambioDeManos = hoyId !== entoncesId;
  const ahora = hoyId ? OPERATORS.find((x) => x.id === hoyId) ?? null : null;

  return (
    <>
      <PageHeader
        title={`Operación ${o.codigo}`}
        description={`${o.servicio}${o.transfer ? (o.transfer.transferAction === "send" ? " · giro enviado" : " · giro pagado") : ""} · ${fechaYHora(o.fechaHora)}`}
        actions={
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <span className="self-start sm:self-auto">
              <OperationStatusBadge status={o.estado} />
            </span>
            <Button variant="secondary" asChild>
              <Link href="/super-admin/operaciones">
                <ArrowLeft aria-hidden="true" />
                Volver a Operaciones
              </Link>
            </Button>
          </div>
        }
      />

      <Section title="Contexto de la operación">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Dato
                etiqueta="Sede"
                valor={
                  sede ? (
                    <Link href={`/super-admin/sedes/${o.sedeId}` as Route} className="underline underline-offset-4 hover:text-primary">
                      {sede.name}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Dato
                etiqueta="Operador responsable"
                valor={
                  entonces ? (
                    <span className="flex flex-col">
                      <Link href={`/super-admin/operadores/${entonces.id}` as Route} className="underline underline-offset-4 hover:text-primary">
                        {entonces.name}
                      </Link>
                      {cambioDeManos ? (
                        <span className="text-body-sm text-text-secondary">
                          El que administraba la sede ese día. Hoy la administra {ahora ? ahora.name : "nadie"}.
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-text-secondary">Ninguno ese día</span>
                  )
                }
              />
              <Dato etiqueta="Caja" valor={jornada?.equipo ? `${o.caja} · ${jornada.equipo.label}` : o.caja} />
              <Dato
                etiqueta="Trabajador"
                valor={
                  <Link href={`/super-admin/trabajadores/${o.workerId}` as Route} className="underline underline-offset-4 hover:text-primary">
                    {o.worker}
                  </Link>
                }
              />
              <Dato
                etiqueta="Jornada"
                valor={
                  jornada ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <Link href={`/super-admin/jornadas/${jornada.id}` as Route} className="underline underline-offset-4 hover:text-primary">
                        {nombreDeJornada(jornada)}
                      </Link>
                      <EstadoBadge estado={jornada.estado} />
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <Dato etiqueta="Origen" valor={<Origen operacion={o} />} />
            </dl>
          </CardContent>
        </Card>
      </Section>

      <Section title="La operación">
        <DetalleDeWorker operacion={o} />
      </Section>
    </>
  );
}

function Origen({ operacion: o }: { operacion: OperacionDeRed }): React.JSX.Element {
  if (!o.origenKiosco) return <>En el mostrador</>;
  return (
    <span className="flex flex-col">
      <span>
        Solicitud <span className="pc-numeric font-semibold">{o.origenKiosco.solicitud}</span>
      </span>
      <span className="text-body-sm text-text-secondary">
        Del kiosco {o.origenKiosco.kioscoLabel} · <span className="pc-numeric">{o.origenKiosco.kioscoId}</span>
      </span>
    </span>
  );
}

/** El detalle de Worker para cada servicio, sin su cabecera ni su comprobante. */
function DetalleDeWorker({ operacion: o }: { operacion: OperacionDeRed }): React.JSX.Element {
  if (o.servicio === "Remesa" && o.remittance) return <RemittanceDetail operation={o} />;
  if (o.servicio === "Giros" && o.transfer) {
    return (
      <div className="[&>div>div:first-child]:hidden">
        <GiroDetail operation={o} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1fr)]">
      <DetailCard title="Cliente" icon={User}>
        <DetailList>
          <DetailRow label="Nombre" value={o.cliente.nombre} />
          <DetailRow label="Documento" value={operationDocumentLabel(o)} numeric />
          <DetailRow label="Teléfono" value={o.cliente.telefono} numeric />
          <DetailRow label="Nacionalidad" value={o.cliente.nacionalidad} />
        </DetailList>
      </DetailCard>
      <ServiceDetail operation={o} />
      <div className="flex flex-col gap-6">
        <OperationStatusCard status={o.estado} />
        <OperationCashCard operation={o} />
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption uppercase tracking-wide text-text-secondary">{etiqueta}</dt>
      <dd className="mt-1 text-body text-text-primary">{valor}</dd>
    </div>
  );
}
