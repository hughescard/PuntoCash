import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, User } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Button, Card, CardContent } from "@/components/ui";
import { OperationStatusBadge } from "@/components/patterns/operation-status-badge";
import { getAdminSession } from "@/features/admin/session-server";
import { operationDocumentLabel } from "@/features/operations/operations-history";
import { redEnAlcance } from "@/features/network/scoped-reads";
import type { OperacionDeRed } from "@/features/network/operaciones";
/* FR-AD-OPS-3: el detalle se compone con las mismas piezas que el de Worker,
   en solo lectura. Lo que Worker añade como acción —el comprobante para
   imprimir— no se trae (FR-AD-OPS-5). */
import { DetailCard, DetailList, DetailRow } from "@/app/worker/(app)/operaciones/[codigo]/detail-parts";
import { GiroDetail } from "@/app/worker/(app)/operaciones/[codigo]/giro-detail";
import { OperationStatusCard } from "@/app/worker/(app)/operaciones/[codigo]/operation-status-card";
import { RemittanceDetail } from "@/app/worker/(app)/operaciones/[codigo]/remittance-detail";
import { OperationCashCard, ServiceDetail } from "@/app/worker/(app)/operaciones/[codigo]/service-detail";
import { EstadoBadge, fechaYHora, nombreDeJornada } from "../../jornadas/formato";

export const metadata: Metadata = {
  title: "Administración de sede · Operación",
  robots: { index: false, follow: false },
};

/**
 * Una operación — **FR-AD-OPS-3** a **FR-AD-OPS-7**.
 *
 * Arriba, el contexto que el mercante necesita y el trabajador no: dónde se hizo, quién
 * la hizo, en qué jornada y, si vino de un kiosco, qué solicitud la originó
 * (**FR-AD-OPS-4**). Debajo, el detalle tal como lo ve Worker. Ninguna acción:
 * ni reimprimir, ni anular, ni corregir (**FR-AD-OPS-5**). Una operación de
 * otra empresa responde como inexistente (**FR-AD-NAV-3**).
 */
export default async function AdminOperacionPage({ params }: { params: Promise<{ codigo: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { codigo } = await params;
  const red = redEnAlcance(session.scope);
  const o = red.operacion(decodeURIComponent(codigo));
  if (!o) notFound();

  const sede = session.sedes.find((s) => s.id === o.sedeId);
  const jornada = red.jornada(o.jornadaId);
  const trabajadorVisible = session.sedes.some((s) => red.trabajadores(s.id).some((w) => w.id === o.workerId));

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
              <Link href="/admin/operaciones">
                <ArrowLeft aria-hidden="true" />
                Volver a Operaciones
              </Link>
            </Button>
          </div>
        }
      />

      {/* FR-AD-OPS-4: el contexto que Worker no necesita. */}
      <Section title="Contexto de la operación">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Dato etiqueta="Sede" valor={sede?.name ?? "—"} />
              <Dato etiqueta="Caja" valor={jornada?.equipo ? `${o.caja} · ${jornada.equipo.label}` : o.caja} />
              <Dato
                etiqueta="Trabajador"
                valor={
                  trabajadorVisible ? (
                    <Link href={`/admin/trabajadores/${o.workerId}` as Route} className="underline underline-offset-4 hover:text-primary">
                      {o.worker}
                    </Link>
                  ) : (
                    o.worker
                  )
                }
              />
              <Dato
                etiqueta="Jornada"
                valor={
                  jornada ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/jornadas/${jornada.id}` as Route} className="underline underline-offset-4 hover:text-primary">
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
    /* GiroDetail trae su propia cabecera de página; aquí la cabecera es la de
       la consola, así que la suya se oculta en lugar de repetir el título. */
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
