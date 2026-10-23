import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { CircleCheck, Clock } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { cn } from "@/lib/utils";
import { getAdminSession } from "@/features/admin/session-server";
import { sedesVisibles } from "@/features/admin/session";
import { TIPO_DE_SOLICITUD } from "@/features/network/aprobaciones";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { diaEnCuba, fechaCorta, hora } from "../jornadas/formato";
import { antiguedad } from "./formato";
import { AprobacionesList, type SolicitudRow } from "./aprobaciones-list";

export const metadata: Metadata = {
  title: "Administración de sede · Aprobaciones",
  robots: { index: false, follow: false },
};

/**
 * Aprobaciones — **FR-AD-APR-1** a **FR-AD-APR-4**.
 *
 * Toda diferencia de efectivo que registra un trabajador —un ajuste, un cierre
 * o una apertura que no cuadra— espera aquí el visto bueno. Dos pestañas:
 * **Pendientes**, de la más antigua a la más reciente, porque la antigüedad es
 * lo que las vuelve urgentes; y **Resueltas**, de la resolución más reciente a
 * la más antigua.
 */
export default async function AdminAprobacionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const inicial = await searchParams;
  const { pestana } = inicial;
  const resueltas = pestana === "resueltas";
  const sedes = sedesVisibles(session);
  const red = redEnAlcance(session.scope);
  const ahora = new Date();

  const todas = sedes.flatMap((sede) => red.solicitudes(sede.id).map((s) => ({ s, sede })));
  const pendientes = todas.filter(({ s }) => s.estado === "pendiente");
  const hechas = todas.filter(({ s }) => s.estado !== "pendiente");

  const lista = resueltas
    ? [...hechas].sort((a, b) => b.s.resolucion!.at.localeCompare(a.s.resolucion!.at))
    : [...pendientes].sort((a, b) => a.s.fechaHora.localeCompare(b.s.fechaHora));

  const rows: SolicitudRow[] = lista.map(({ s, sede }) => ({
    id: s.id,
    tipo: s.tipo,
    tipoLabel: TIPO_DE_SOLICITUD[s.tipo],
    dia: diaEnCuba(s.fechaHora),
    fecha: `${fechaCorta(s.fechaHora)} · ${hora(s.fechaHora)}`,
    sede: sede.name,
    cajaId: s.registerId,
    caja: s.cajaNombre,
    workerId: s.workerId,
    trabajador: s.workerName,
    currency: s.currency,
    diferencia: s.diferencia,
    motivo: s.motivo,
    antiguedad: antiguedad(s.fechaHora, ahora),
    estado: s.estado,
    resolucion: s.resolucion
      ? { por: s.resolucion.por, fecha: `${fechaCorta(s.resolucion.at)} · ${hora(s.resolucion.at)}` }
      : null,
  }));

  return (
    <>
      <PageHeader
        title="Aprobaciones"
        description="Las diferencias de efectivo que registran tus trabajadores y esperan tu visto bueno."
      />

      <nav aria-label="Estado de las solicitudes" className="mb-8">
        <ul className="flex flex-wrap gap-2">
          <Pestana href="/admin/aprobaciones" icon={Clock} label="Pendientes" cuenta={pendientes.length} activa={!resueltas} />
          <Pestana href="/admin/aprobaciones?pestana=resueltas" icon={CircleCheck} label="Resueltas" cuenta={hechas.length} activa={resueltas} />
        </ul>
      </nav>

      <AprobacionesList
        key={resueltas ? "resueltas" : "pendientes"}
        rows={rows}
        resueltas={resueltas}
        hayAlguna={todas.length > 0}
        varias={sedes.length > 1}
        inicial={inicial}
      />
    </>
  );
}

/** Enlaces y no un `tablist`: funcionan antes de hidratar y la pestaña viaja en la URL, como en Equipos. */
function Pestana({
  href,
  icon: Icon,
  label,
  cuenta,
  activa,
}: {
  href: string;
  icon: typeof Clock;
  label: string;
  cuenta: number;
  activa: boolean;
}): React.JSX.Element {
  return (
    <li>
      <Link
        href={href as Route}
        aria-current={activa ? "page" : undefined}
        className={cn(
          "inline-flex h-control items-center gap-2 rounded-control border px-4 text-label font-semibold",
          "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
          "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
          activa
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
        )}
      >
        <Icon className="size-[18px] shrink-0" aria-hidden="true" />
        {label}
        <span className={cn("pc-numeric", activa ? "text-text-on-primary-muted" : "text-text-secondary")}>{cuenta}</span>
      </Link>
    </li>
  );
}
