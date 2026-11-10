import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DatosDeBilletes } from "../datos-de-billetes";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert, Button, Card, CardContent } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatAmount } from "@/lib/format";
import { getAdminSession } from "@/features/admin/session-server";
import { MOTIVO_RESOLUCION_MIN, TIPO_DE_SOLICITUD, type Solicitud, quienConfirma } from "@/features/network/aprobaciones";
import { SUPERVISOR_CAMBIO_BILLETES } from "@/features/network/jornadas";
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
  cierre: "Saldo esperado",
  apertura: "Dejado al cierre anterior",
  composicion: "Saldo esperado",
  fondos: "Antes del movimiento",
  recuento: "Saldo en libros",
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
  const confirma = s.estado === "pendiente" ? quienConfirma(s) : null;

  return (
    <>
      <PageHeader
        title={TIPO_DE_SOLICITUD[s.tipo]}
        description={jornada ? `Jornada ${nombreDeJornada(jornada)} · ${sede?.name ?? ""}` : (sede?.name ?? "")}
        actions={
          <div className="pc-botonera">
            <span className="pc-botonera-fija">
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
              <Dato etiqueta={referenciaDe(s)} valor={<span className="pc-numeric">{formatAmount(s.referencia)}</span>} />
              <Dato
                etiqueta={s.origen === "jornada" ? "Después del movimiento" : "Contado"}
                valor={<span className="pc-numeric">{formatAmount(s.contado)}</span>}
              />
              {/* FR-AD-APR-6: signo y motivo juntos, sin reinterpretar. */}
              <Dato
                etiqueta="Diferencia"
                valor={<DiferenciaDeApertura currency={s.currency} diferencia={s.diferencia} motivo={s.motivo} />}
              />
              <Dato etiqueta="Motivo del trabajador" valor={s.motivo} />
              <DatosDeBilletes s={s} />
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
                  {s.tipo === "fondos"
                    ? "La administración no confirma este movimiento: queda como incidencia a nombre del trabajador."
                    : "La administración no asume esta diferencia: queda como incidencia a nombre del trabajador."}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : confirma && confirma.id !== session.user.id ? (
          /* Decisión del 10/11/2026: confirmar es que quien trajo o se llevó el dinero diga que fue así. */
          <Alert variant="info" title={`Solo ${confirma.nombre} puede confirmarlo`}>
            Es el supervisor que, según el trabajador, {verboDeFondos(s)}. Hasta que lo confirme o lo rechace desde su consola,
            queda pendiente.
          </Alert>
        ) : (
          <>
            {confirma ? (
              <p className="mb-4 text-body-sm text-text-secondary">
                El trabajador dice que fuiste tú quien {verboDeFondos(s)}. Confírmalo si fue así; recházalo si no.
              </p>
            ) : null}
            <Resolver id={s.id} motivoMin={MOTIVO_RESOLUCION_MIN} />
          </>
        )}
      </Section>
    </>
  );
}

/** Qué hizo el supervisor, para decirlo en una frase. */
function verboDeFondos(s: Solicitud): string {
  if (s.fondos === "cambio" || s.motivo === SUPERVISOR_CAMBIO_BILLETES) return "cambió los billetes";
  if (s.fondos === "retiro" || s.diferencia < 0) return "se llevó el efectivo";
  return "trajo el efectivo";
}

/** Al abrir, la referencia es lo dejado por el cierre anterior; al cerrar, lo esperado por los libros. */
function referenciaDe(s: Solicitud): string {
  if (s.origen === "recuento") return "Saldo en libros";
  if (s.id.includes(`-A-${s.currency}`)) return "Dejado al cierre anterior";
  if (s.id.includes(`-C-${s.currency}`)) return "Saldo esperado";
  return REFERENCIA[s.tipo];
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption uppercase tracking-wide text-text-secondary">{etiqueta}</dt>
      <dd className="mt-1 text-body text-text-primary">{valor}</dd>
    </div>
  );
}
