import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatAmount } from "@/lib/format";
import {
  esHuerfana,
  MOTIVO_RESOLUCION_MIN,
  operadorDeLaSolicitud,
  solicitudPorId,
  TIPO_DE_SOLICITUD,
  type Solicitud,
} from "@/features/network/aprobaciones";
import { operadorVigente } from "@/features/network/assignments";
import { jornadaPorId } from "@/features/network/jornadas";
import { findOperatorById } from "@/features/network/operators";
import { findSedeById } from "@/features/network/sedes";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { DiferenciaDeApertura, EstadoBadge, fechaYHora, nombreDeJornada } from "@/app/admin/(app)/jornadas/formato";
import { antiguedad, EstadoSolicitudBadge } from "@/app/admin/(app)/aprobaciones/formato";
import { Resolver } from "@/app/admin/(app)/aprobaciones/[id]/resolver";
import { resolverHuerfanaAction } from "../_actions";

export const metadata: Metadata = {
  title: "Super administración · Diferencia de efectivo",
  robots: { index: false, follow: false },
};

const REFERENCIA: Readonly<Record<Solicitud["tipo"], string>> = {
  ajuste: "Saldo registrado",
  cierre: "Saldo esperado",
  apertura: "Dejado al cierre anterior",
};

/**
 * Una diferencia sin quien la resuelva — **FR-SA-APR-2** a **FR-SA-APR-4**.
 * Solo se abren aquí las huérfanas y las que ya resolvió PuntoCash; el resto
 * son de su mercante y responden como inexistentes.
 */
export default async function SuperAdminSolicitudPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resuelta?: string; yaResuelta?: string; yaTieneQuien?: string }>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const { id } = await params;
  const aviso = await searchParams;
  const s = solicitudPorId(decodeURIComponent(id));
  if (!s || !(esHuerfana(s) || s.resolucion?.puntoCash || aviso.yaResuelta || aviso.yaTieneQuien)) notFound();

  const sede = findSedeById(s.sedeId);
  const jornada = jornadaPorId(s.jornadaId);
  const entonces = operadorDeLaSolicitud(s);
  const hoy = operadorVigente(s.sedeId);
  const nombre = (op: string | null) => (op ? (findOperatorById(op)?.name ?? op) : null);
  const ahora = new Date();

  return (
    <>
      <PageHeader
        title={TIPO_DE_SOLICITUD[s.tipo]}
        description={`${sede?.name ?? ""}${jornada ? ` · Jornada ${nombreDeJornada(jornada)}` : ""}`}
        actions={
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <span className="self-start sm:self-auto">
              <EstadoSolicitudBadge estado={s.estado} />
            </span>
            <Button variant="secondary" asChild>
              <Link href={"/super-admin/aprobaciones" as Route}>
                <ArrowLeft aria-hidden="true" />
                Volver a Aprobaciones
              </Link>
            </Button>
          </div>
        }
      />

      {aviso.resuelta === "1" && s.resolucion ? (
        <Alert variant="success" title={s.estado === "aprobada" ? "Diferencia aprobada" : "Diferencia rechazada"} className="mb-8">
          Queda constancia de la decisión de PuntoCash. El saldo de la caja y el movimiento registrado no cambian.
        </Alert>
      ) : null}
      {aviso.yaResuelta === "1" ? (
        <Alert variant="info" title="Ya estaba resuelta" className="mb-8">
          Otra persona la resolvió mientras decidías; tu decisión no se ha guardado.
        </Alert>
      ) : null}
      {aviso.yaTieneQuien === "1" ? (
        <Alert variant="info" title="Ya la puede resolver su mercante" className="mb-8">
          La sede volvió a la empresa que la tenía ese día, así que la resuelve su administración. Tu decisión no se ha
          guardado.
        </Alert>
      ) : null}

      <Section
        title="Por qué la resuelve PuntoCash"
        description={`Se registró cuando la sede era de ${nombre(entonces) ?? "nadie"}. Hoy ${hoy ? `la administra ${nombre(hoy)}` : "no tiene operador"}, que no ve lo anterior a su etapa, y ${nombre(entonces) ?? "la empresa de entonces"} ya no la tiene.`}
      >
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Dato etiqueta="Fecha y hora" valor={fechaYHora(s.fechaHora)} />
              <Dato etiqueta="Trabajador" valor={s.workerName} />
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
              <Dato
                etiqueta="Moneda"
                valor={
                  <span className="inline-flex items-center gap-2">
                    <CurrencyFlag currency={s.currency} />
                    <span className="pc-numeric">{s.currency}</span>
                  </span>
                }
              />
              <Dato etiqueta={REFERENCIA[s.tipo]} valor={<span className="pc-numeric">{formatAmount(s.referencia)}</span>} />
              <Dato etiqueta="Contado" valor={<span className="pc-numeric">{formatAmount(s.contado)}</span>} />
              <Dato
                etiqueta="Diferencia"
                valor={<DiferenciaDeApertura currency={s.currency} diferencia={s.diferencia} motivo={s.motivo} />}
              />
              <Dato etiqueta="Motivo del trabajador" valor={s.motivo} />
              {s.observaciones ? <Dato etiqueta="Observaciones" valor={s.observaciones} /> : null}
            </dl>
          </CardContent>
        </Card>
      </Section>

      <Section
        title="Resolución"
        description={s.estado === "pendiente" ? `Pendiente ${antiguedad(s.fechaHora, ahora)}.` : undefined}
      >
        {s.resolucion ? (
          <Card>
            <CardContent className="pt-6">
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                <Dato etiqueta="Decisión" valor={<EstadoSolicitudBadge estado={s.estado} />} />
                <Dato etiqueta="Por" valor={`${s.resolucion.por}${s.resolucion.puntoCash ? " · PuntoCash" : ""}`} />
                <Dato etiqueta="Fecha y hora" valor={fechaYHora(s.resolucion.at)} />
                <Dato etiqueta="Motivo" valor={s.resolucion.motivo} />
              </dl>
            </CardContent>
          </Card>
        ) : esHuerfana(s) ? (
          <Resolver id={s.id} motivoMin={MOTIVO_RESOLUCION_MIN} accionDelServidor={resolverHuerfanaAction} quien="PuntoCash" />
        ) : null}
      </Section>
    </>
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
