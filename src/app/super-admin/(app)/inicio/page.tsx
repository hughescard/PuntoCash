import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, CircleCheck, CircleDot, TriangleAlert } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Card, CardContent } from "@/components/ui";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import {
  HORAS_SOLICITUD_ATASCADA,
  panoramaDeRed,
  type AvisoDeSede,
  type DecisionDePuntoCash,
  type PanoramaDeRed,
} from "@/features/super-admin/panorama";
import { antiguedad } from "@/app/admin/(app)/aprobaciones/formato";
import { fechaCorta, fechaYHora, hora } from "@/app/admin/(app)/jornadas/formato";
import { ContactoDeOperador } from "../_compartido/contacto";
import { EstadoDeRed, type FilaEstadoDeRed } from "./estado-de-red";

export const metadata: Metadata = {
  title: "Super administración · Inicio",
  robots: { index: false, follow: false },
};

/**
 * Inicio — «¿cómo está la red ahora mismo?» (§3 del FRD).
 *
 * Tres bloques, en el orden en que PuntoCash los atiende:
 *
 *   1. **Decisiones de PuntoCash**: lo que solo esta consola resuelve. Cada una
 *      lleva a donde se resuelve.
 *   2. **Lo que resuelve cada operador**: lo que pasa dentro de las sedes,
 *      agrupado por mercante y con su contacto. No hay botones que lo
 *      arreglen, y la pantalla dice por qué (FR-SA-HOME-4 y 5) [A14].
 *   3. **Estado de la red**: una fila por sede, ordenable y filtrable por
 *      operador (FR-SA-HOME-6).
 *
 * Sin volumen: por moneda son varias cifras y en una tarjeta se vuelven una
 * lista; está en Reportes, como en Admin de sede.
 */
export default async function SuperAdminInicioPage({
  searchParams,
}: {
  searchParams: Promise<{ operador?: string }>;
}) {
  const { operador } = await searchParams;
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const ahora = new Date();
  const { metricas, red, decisiones, porOperador, filas } = panoramaDeRed(ahora);
  const avisosTotales = porOperador.reduce((n, g) => n + g.total, 0);

  const filasTabla: FilaEstadoDeRed[] = filas.map((f) => ({
    id: f.sede.id,
    nombre: f.sede.name,
    codigo: f.sede.code,
    localidad: f.sede.locality,
    estado: f.estado,
    operadorId: f.operador?.id ?? null,
    operador: f.operador?.name ?? null,
    cajas: f.cajas,
    sinEquipo: f.sinEquipo,
    abiertas: f.dia.abiertas,
    primeraApertura: f.dia.primeraApertura ? hora(f.dia.primeraApertura) : null,
    operacionesHoy: f.dia.operacionesHoy,
    avisos: f.avisos,
  }));

  return (
    <>
      <PageHeader
        title={`Hola, ${session.firstName}`}
        description={descripcionDeRed(red)}
      />

      <Section title="Hoy en la red">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Metric label="Sedes operando" value={`${metricas.sedesOperando} de ${metricas.sedesActivas}`} />
          <Metric label="Cajas abiertas" value={`${metricas.cajasAbiertas} de ${metricas.cajasActivas}`} />
          <Metric label="Trabajadores en turno" value={metricas.enTurno} />
          <Metric label="Operaciones del día" value={metricas.operacionesHoy} />
        </div>
      </Section>

      <Section title="Decisiones de PuntoCash" description="Lo que solo PuntoCash puede resolver.">
        {decisiones.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <CircleCheck className="size-5 shrink-0 text-success-foreground" aria-hidden="true" />
              <p className="text-body text-text-primary">No hay nada pendiente de PuntoCash.</p>
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {decisiones.map((d) => (
              <Decision key={claveDeDecision(d)} {...textoDeDecision(d)} />
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Lo que resuelve cada operador"
        description="PuntoCash observa la red. Lo que ocurre dentro de una sede lo resuelve su administrador: aquí está a quién pedírselo."
      >
        {avisosTotales === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <CircleCheck className="size-5 shrink-0 text-success-foreground" aria-hidden="true" />
              <p className="text-body text-text-primary">Ninguna sede tiene nada que atender.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {porOperador.map(({ operador, sedes, total }) => (
              <Card key={operador.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-2 border-b border-border pb-4 xl:flex-row xl:items-start xl:justify-between xl:gap-6">
                    <div className="min-w-0">
                      <Link
                        href={`/super-admin/operadores/${operador.id}` as Route}
                        className="text-body font-semibold text-text-primary underline-offset-4 hover:underline"
                      >
                        {operador.name}
                      </Link>
                      <p className="mt-0.5 text-body-sm text-text-secondary">
                        {total === 1 ? "Un asunto" : `${total} asuntos`} en{" "}
                        {sedes.length === 1 ? "una sede" : `${sedes.length} sedes`}
                      </p>
                    </div>
                    <ContactoDeOperador operador={operador} />
                  </div>

                  <ul className="divide-y divide-border">
                    {sedes.map(({ sede, avisos }) => (
                      <li key={sede.id} className="grid gap-3 py-4 last:pb-0 xl:grid-cols-[13rem_1fr] xl:gap-6">
                        <Link
                          href={`/super-admin/sedes/${sede.id}` as Route}
                          className="self-start text-body-sm font-semibold text-text-primary underline-offset-4 hover:underline"
                        >
                          {sede.name}
                        </Link>
                        <ul className="flex flex-col gap-3">
                          {avisos.map((a) => {
                            const t = textoDeAviso(a, ahora);
                            return (
                              <li
                                key={claveDeAviso(a)}
                                className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                              >
                                <div className="flex min-w-0 items-start gap-2.5">
                                  <CircleDot className="mt-0.5 size-4 shrink-0 text-warning-foreground" aria-hidden="true" />
                                  <div className="min-w-0">
                                    <p className="text-body-sm text-text-primary">{t.title}</p>
                                    {t.detail ? <p className="text-body-sm text-text-secondary">{t.detail}</p> : null}
                                  </div>
                                </div>
                                <Link
                                  href={t.href as Route}
                                  className="inline-flex shrink-0 items-center gap-1.5 self-start pl-6.5 text-label font-medium text-primary underline-offset-4 hover:underline sm:pl-0"
                                >
                                  {t.action}
                                  <ArrowRight className="size-4" aria-hidden="true" />
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section title="Estado de la red" description="Una fila por sede. Ordena por cualquier columna o filtra por operador.">
        <EstadoDeRed filas={filasTabla} operadorInicial={operador} />
      </Section>
    </>
  );
}

/* -------------------------------------------------------------------------
 * Textos
 * ---------------------------------------------------------------------- */

interface Texto {
  title: string;
  detail: string;
  href: string;
  action: string;
}

function claveDeDecision(d: DecisionDePuntoCash): string {
  if (d.kind === "moneda-sin-rango") return `${d.kind}-${d.code}`;
  if (d.kind === "operador-suspendido" || d.kind === "operador-sin-sedes") return `${d.kind}-${d.operador.id}`;
  return `${d.kind}-${d.sede.id}`;
}

function textoDeDecision(d: DecisionDePuntoCash): Texto {
  switch (d.kind) {
    case "sede-sin-asignar":
      return {
        title: `${d.sede.name} no tiene operador`,
        detail: `Está sin asignar desde el ${fechaCorta(d.desde)}. Sin operador nadie puede crearle cajas ni vincular sus equipos, y sus trabajadores no pueden iniciar sesión.`,
        href: `/super-admin/sedes/${d.sede.id}`,
        action: "Asignar un operador",
      };
    case "moneda-sin-rango":
      return {
        title:
          d.sedes.length === 1
            ? `${d.sedes[0]!.name} tiene el ${d.code} en su lista y no puede cotizarlo`
            : `${d.sedes.length} sedes tienen el ${d.code} en su lista y no pueden cotizarlo`,
        detail: `El ${d.nombre.toLowerCase()} no tiene rango de PuntoCash, y sin rango ninguna sede puede fijarle tasa${d.sedes.length > 1 ? `: ${d.sedes.map((s) => s.name).join(", ")}` : ""}.`,
        href: "/super-admin/monedas-y-tasas",
        action: "Definir el rango",
      };
    case "sede-suspendida":
      return {
        title: `${d.sede.name} está suspendida`,
        detail: `${d.sede.suspension ? `Desde el ${fechaCorta(d.sede.suspension.at)}: ${d.sede.suspension.reason}. ` : ""}Sus trabajadores no pueden iniciar sesión hasta que PuntoCash la reactive.`,
        href: `/super-admin/sedes/${d.sede.id}`,
        action: "Ver la sede",
      };
    case "operador-suspendido":
      return {
        title: `${d.operador.name} está suspendido`,
        detail: `${d.operador.suspension ? `Desde el ${fechaCorta(d.operador.suspension.at)}: ${d.operador.suspension.reason}. ` : ""}Ni sus administradores ni los trabajadores de ${d.sedes === 1 ? "su sede" : `sus ${d.sedes} sedes`} pueden iniciar sesión.`,
        href: `/super-admin/operadores/${d.operador.id}`,
        action: "Ver el operador",
      };
    case "operador-sin-sedes":
      return {
        title: `${d.operador.name} no administra ninguna sede`,
        detail: `Está dado de alta desde el ${fechaCorta(d.operador.createdAt)}. Su usuario puede entrar en su consola, pero no tiene nada a su cargo.`,
        href: `/super-admin/operadores/${d.operador.id}`,
        action: "Ver el operador",
      };
  }
}

function claveDeAviso(a: AvisoDeSede): string {
  if (a.kind === "abierta-de-dia-anterior") return `${a.kind}-${a.jornada.id}`;
  if (a.kind === "tasa-ajustada") return `${a.kind}-${a.sede.id}-${a.code}`;
  return `${a.kind}-${a.sede.id}`;
}

/** Sin el nombre de la sede: va agrupado bajo ella. */
function textoDeAviso(a: AvisoDeSede, ahora: Date): Omit<Texto, "detail"> & { detail?: string } {
  const sede = a.sede;
  const fichaDeSede = `/super-admin/sedes/${sede.id}`;
  switch (a.kind) {
    case "sin-cajas":
      return {
        title: `Lleva ${a.dias} días asignada y no tiene ninguna caja`,
        detail: "No puede abrir hasta que su administrador cree una caja y vincule su equipo.",
        href: fichaDeSede,
        action: "Ver la sede",
      };
    case "cajas-sin-equipo":
      return {
        title: a.cajas === 1 ? "Una caja sin equipo vinculado" : `${a.cajas} cajas sin equipo vinculado`,
        detail: "En una caja sin equipo nadie puede iniciar sesión.",
        href: `/super-admin/equipos?sede=${sede.id}`,
        action: "Ver sus cajas",
      };
    case "sin-abrir-en-horario":
      return {
        title: "Está en horario y no tiene ninguna caja abierta",
        href: fichaDeSede,
        action: "Ver la sede",
      };
    case "abierta-de-dia-anterior":
      return {
        title: `${a.jornada.cajaNombre} sigue abierta de un día anterior`,
        detail: `La abrió ${a.jornada.workerName} el ${fechaYHora(a.jornada.openedAt)}.`,
        href: `/super-admin/jornadas/${a.jornada.id}`,
        action: "Ver la jornada",
      };
    case "solicitudes-atascadas": {
      const primera = a.solicitudes[0]!;
      return {
        title:
          a.solicitudes.length === 1
            ? `Una solicitud de aprobación sin resolver desde hace más de ${HORAS_SOLICITUD_ATASCADA} horas`
            : `${a.solicitudes.length} solicitudes de aprobación sin resolver desde hace más de ${HORAS_SOLICITUD_ATASCADA} horas`,
        detail: `La más antigua es de ${antiguedad(primera.fechaHora, ahora)}, en ${primera.cajaNombre}.`,
        href: `/super-admin/jornadas/${primera.jornadaId}`,
        action: "Ver la jornada",
      };
    }
    case "tasa-ajustada":
      return {
        title: `No ha revisado su tasa del ${a.code}, que PuntoCash ajustó el ${fechaCorta(a.at)}`,
        href: `/super-admin/monedas-y-tasas?sede=${sede.id}`,
        action: "Ver sus tasas",
      };
    case "cambio-sin-tasas":
      return {
        title: "Ofrece Cambio de moneda y no tiene ninguna tasa",
        detail: "Su tablero no cotiza nada.",
        href: `/super-admin/monedas-y-tasas?sede=${sede.id}`,
        action: "Ver sus tasas",
      };
    case "sin-monedas":
      return {
        title: "No tiene ninguna moneda en su lista",
        detail: "Sus cajas no pueden manejar efectivo de ningún tipo.",
        href: `/super-admin/monedas-y-tasas?sede=${sede.id}`,
        action: "Ver sus monedas",
      };
  }
}

/* -------------------------------------------------------------------------
 * Piezas
 * ---------------------------------------------------------------------- */

/** «12 sedes: 10 activas, 1 sin asignar y 1 suspendida. 5 operadores activos.» */
function descripcionDeRed(red: PanoramaDeRed["red"]): string {
  const partes = [
    `${red.porEstado.activa} ${red.porEstado.activa === 1 ? "activa" : "activas"}`,
    red.porEstado["sin-asignar"] > 0 ? `${red.porEstado["sin-asignar"]} sin asignar` : null,
    red.porEstado.suspendida > 0
      ? `${red.porEstado.suspendida} ${red.porEstado.suspendida === 1 ? "suspendida" : "suspendidas"}`
      : null,
    red.porEstado["operador-suspendido"] > 0
      ? `${red.porEstado["operador-suspendido"]} con su operador suspendido`
      : null,
  ].filter((p): p is string => p !== null);
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0];
  return `${red.sedes} sedes: ${lista}. ${red.operadoresActivos} ${red.operadoresActivos === 1 ? "operador activo" : "operadores activos"}.`;
}

function Metric({ label, value }: { label: string; value: number | string }): React.JSX.Element {
  return (
    <Card className="h-full">
      {/* La cifra va abajo para que quede alineada aunque la etiqueta ocupe dos líneas. */}
      <CardContent className="flex h-full flex-col justify-between pt-6">
        <p className="text-caption uppercase tracking-wide text-text-secondary">{label}</p>
        <p className="pc-numeric mt-2 text-screen-title text-text-primary">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function Decision({ title, detail, href, action }: Texto): React.JSX.Element {
  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-start gap-3">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-body font-medium text-text-primary">{title}</p>
              <p className="mt-1 text-body-sm text-text-secondary">{detail}</p>
            </div>
          </div>
          <Link
            href={href as Route}
            className="inline-flex shrink-0 items-center gap-1.5 self-start text-label font-medium text-primary underline-offset-4 hover:underline"
          >
            {action}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    </li>
  );
}
