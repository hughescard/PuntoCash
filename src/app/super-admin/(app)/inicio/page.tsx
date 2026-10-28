import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, TriangleAlert } from "lucide-react";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Card, CardContent } from "@/components/ui";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { diaEnCuba } from "@/features/network/jornadas";
import { panoramaDeRed, type PanoramaDeRed, type PendienteDePuntoCash } from "@/features/super-admin/panorama";
import { fechaCorta, fechaYHora, hora } from "@/app/admin/(app)/jornadas/formato";
import { EstadoDeRed, type FilaEstadoDeRed } from "./estado-de-red";

export const metadata: Metadata = {
  title: "Super administración · Inicio",
  robots: { index: false, follow: false },
};

/**
 * Inicio — el registro de la red.
 *
 * PuntoCash entrega la red y registra lo que pasa en ella. La gestión diaria
 * de cada sede es del operador y no está aquí. Tres piezas:
 *
 *   1. **Hoy en la red**: qué sedes han operado, cuántas operaciones y cuántas
 *      personas las han hecho.
 *   2. **Pendiente de PuntoCash**: solo si hay algo, y solo lo que nadie más
 *      puede resolver (entregar sedes y operadores, fijar rangos).
 *   3. **Actividad por sede**: una fila por sede con su operador, su estado,
 *      sus operaciones de hoy y la última operación (cuándo y quién).
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
  const hoy = diaEnCuba(ahora);
  const { metricas, red, pendientes, filas } = panoramaDeRed(ahora);

  const filasTabla: FilaEstadoDeRed[] = filas.map((f) => ({
    id: f.sede.id,
    nombre: f.sede.name,
    codigo: f.sede.code,
    localidad: f.sede.locality,
    estado: f.estado,
    operadorId: f.operador?.id ?? null,
    operador: f.operador?.name ?? null,
    operacionesHoy: f.operacionesHoy,
    trabajadoresHoy: f.trabajadoresHoy,
    ultimaEn: f.ultimaOperacion?.fechaHora ?? null,
    ultimaCuando: f.ultimaOperacion
      ? diaEnCuba(f.ultimaOperacion.fechaHora) === hoy
        ? `Hoy, ${hora(f.ultimaOperacion.fechaHora)}`
        : fechaYHora(f.ultimaOperacion.fechaHora)
      : null,
    ultimaQuien: f.ultimaOperacion ? `${f.ultimaOperacion.trabajador} · ${f.ultimaOperacion.servicio}` : null,
  }));

  return (
    <>
      <PageHeader title={`Hola, ${session.firstName}`} description={descripcionDeRed(red)} />

      <Section title="Hoy en la red">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
          <Metric label="Sedes con operaciones" value={`${metricas.sedesConActividad} de ${metricas.sedesActivas}`} />
          <Metric label="Operaciones del día" value={metricas.operacionesHoy} />
          <Metric label="Trabajadores que han operado" value={metricas.trabajadoresHoy} />
        </div>
      </Section>

      {pendientes.length > 0 ? (
        <Section title="Pendiente de PuntoCash" description="Lo que solo PuntoCash puede resolver.">
          <ul className="flex flex-col gap-3">
            {pendientes.map((p) => (
              <Pendiente key={claveDePendiente(p)} {...textoDePendiente(p)} />
            ))}
          </ul>
        </Section>
      ) : null}

      <Section
        title="Actividad por sede"
        description="Una fila por sede: quién la opera, cuánto ha operado hoy y la última operación registrada."
      >
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

function claveDePendiente(p: PendienteDePuntoCash): string {
  if (p.kind === "moneda-sin-rango") return `${p.kind}-${p.code}`;
  if (p.kind === "operador-sin-sedes") return `${p.kind}-${p.operador.id}`;
  return `${p.kind}-${p.sede.id}`;
}

function textoDePendiente(p: PendienteDePuntoCash): Texto {
  switch (p.kind) {
    case "sede-sin-asignar":
      return {
        title: `${p.sede.name} no tiene operador`,
        detail: `Está sin asignar desde el ${fechaCorta(p.desde)}. Hasta que se entregue a un operador no puede operar.`,
        href: `/super-admin/sedes/${p.sede.id}`,
        action: "Asignar un operador",
      };
    case "operador-sin-sedes":
      return {
        title: `${p.operador.name} no tiene ninguna sede`,
        detail: `Está dado de alta desde el ${fechaCorta(p.operador.createdAt)} y todavía no se le ha entregado ninguna.`,
        href: `/super-admin/operadores/${p.operador.id}`,
        action: "Ver el operador",
      };
    case "moneda-sin-rango":
      return {
        title:
          p.sedes.length === 1
            ? `${p.sedes[0]!.name} tiene el ${p.code} en su lista y no puede cotizarlo`
            : `${p.sedes.length} sedes tienen el ${p.code} en su lista y no pueden cotizarlo`,
        detail: `El ${p.nombre.toLowerCase()} no tiene rango de PuntoCash, y sin rango ninguna sede puede fijarle tasa${p.sedes.length > 1 ? `: ${p.sedes.map((s) => s.name).join(", ")}` : ""}.`,
        href: "/super-admin/monedas-y-tasas",
        action: "Definir el rango",
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
  return `${red.sedes} sedes dadas de alta: ${lista}. ${red.operadoresActivos} ${red.operadoresActivos === 1 ? "operador activo" : "operadores activos"}.`;
}

function Metric({ label, value }: { label: string; value: number | string }): React.JSX.Element {
  return (
    /* En el teléfono, una fila compacta: tres tarjetas apiladas ocupaban media
       pantalla antes de llegar a nada útil. Desde `sm`, tarjeta con la cifra abajo. */
    <Card className="h-full">
      <CardContent className="flex h-full items-center justify-between gap-4 py-4 sm:flex-col sm:items-start sm:justify-between sm:gap-0 sm:pt-6 sm:pb-6">
        <p className="text-caption uppercase tracking-wide text-text-secondary">{label}</p>
        <p className="pc-numeric text-section-title text-text-primary sm:mt-2 sm:text-screen-title">{value}</p>
      </CardContent>
    </Card>
  );
}

function Pendiente({ title, detail, href, action }: Texto): React.JSX.Element {
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
