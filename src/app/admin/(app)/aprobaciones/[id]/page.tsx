import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatAmount } from "@/lib/format";
import { getAdminSession } from "@/features/admin/session-server";
import { MOTIVO_RESOLUCION_MIN, TIPO_DE_SOLICITUD, type Solicitud } from "@/features/network/aprobaciones";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { DiferenciaDeApertura, EstadoBadge, fechaYHora, nombreDeJornada } from "../../jornadas/formato";
import { antiguedad, EstadoSolicitudBadge } from "../formato";
import { Resolver } from "./resolver";
import { mensaje } from "../../mensajes";

export const metadata: Metadata = {
  title: "Administración de sede · Solicitud de aprobación",
  robots: { index: false, follow: false },
};

/** Cómo se llama lo que había antes de contar, según de dónde venga la diferencia. */
const REFERENCIA: Readonly<Record<Solicitud["tipo"], string>> = {
  ajuste: "Saldo registrado",
  cierre: "Saldo esperado",
  apertura: "Dejado al cierre anterior",
};

/**
 * Una solicitud — **FR-AD-APR-5** a **FR-AD-APR-12**.
 *
 * El hecho tal como lo registró el trabajador, con su signo y su motivo juntos
 * (**FR-AD-APR-6**), el enlace al movimiento o a la jornada, y la decisión: o
 * los dos botones, o la resolución ya tomada con su motivo junto al del
 * trabajador (**FR-AD-APR-8**). Una solicitud de otra empresa responde como
 * inexistente (**FR-AD-NAV-3**).
 */
export default async function AdminSolicitudPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resuelta?: string; yaResuelta?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const { resuelta, yaResuelta } = await searchParams;
  const red = redEnAlcance(session.scope);
  const s = red.solicitud(decodeURIComponent(id));
  if (!s) notFound();

  const sede = session.sedes.find((x) => x.id === s.sedeId);
  const jornada = red.jornada(s.jornadaId);
  const ahora = new Date();

  return (
    <>
      <PageHeader
        title={TIPO_DE_SOLICITUD[s.tipo]}
        description={jornada ? `Jornada ${nombreDeJornada(jornada)} · ${sede?.name ?? ""}` : (sede?.name ?? "")}
        actions={
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <span className="self-start sm:self-auto">
              <EstadoSolicitudBadge estado={s.estado} />
            </span>
            <Button variant="secondary" asChild>
              <Link href={(s.estado === "pendiente" ? "/admin/aprobaciones" : "/admin/aprobaciones?pestana=resueltas") as Route}>
                <ArrowLeft aria-hidden="true" />
                Volver a Aprobaciones
              </Link>
            </Button>
          </div>
        }
      />

      {resuelta === "1" && s.resolucion ? (
        <Alert variant="success" title={s.estado === "aprobada" ? "Solicitud aprobada" : "Solicitud rechazada"} className="mb-8">
          Queda constancia de tu decisión. El saldo de la caja y el movimiento registrado no cambian.
        </Alert>
      ) : null}

      {yaResuelta === "1" && s.resolucion ? (
        <Alert variant="info" title={mensaje("aprobaciones", "ya-resuelta")} className="mb-8">
          Otro administrador de tu empresa la resolvió mientras decidías; tu decisión no se ha guardado. Abajo está
          la que quedó.
        </Alert>
      ) : null}

      <Section title="Lo que registró el trabajador">
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
              {/* FR-AD-APR-6: signo y motivo juntos, sin reinterpretar. */}
              <Dato
                etiqueta="Diferencia"
                valor={<DiferenciaDeApertura currency={s.currency} diferencia={s.diferencia} motivo={s.motivo} />}
              />
              <Dato etiqueta="Motivo del trabajador" valor={s.motivo} />
              {s.observaciones ? <Dato etiqueta="Observaciones" valor={s.observaciones} /> : null}
              {s.movimientoId && jornada ? (
                <Dato
                  etiqueta="Movimiento"
                  valor={
                    <Link
                      href={`/admin/jornadas/${jornada.id}/movimientos/${s.movimientoId}` as Route}
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      Ver el movimiento
                    </Link>
                  }
                />
              ) : null}
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
                <Dato etiqueta="Por" valor={s.resolucion.por} />
                <Dato etiqueta="Fecha y hora" valor={fechaYHora(s.resolucion.at)} />
                <Dato etiqueta="Motivo de la administración" valor={s.resolucion.motivo} />
              </dl>
              {s.estado === "rechazada" ? (
                <p className="mt-5 text-body-sm text-text-secondary">
                  La administración no asume esta diferencia: queda para revisarla fuera del sistema.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Resolver id={s.id} motivoMin={MOTIVO_RESOLUCION_MIN} />
        )}
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
