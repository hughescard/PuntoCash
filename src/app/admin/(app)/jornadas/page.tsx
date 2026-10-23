import * as React from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/app-shell";
import { Alert } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { sedesVisibles } from "@/features/admin/session";
import { conciliacionDe, diferenciasDeApertura, operacionesDe } from "@/features/network/jornadas";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { diaEnCuba, fechaCorta, hora } from "./formato";
import { JornadasList, type JornadaRow } from "./jornadas-list";

export const metadata: Metadata = {
  title: "Administración de sede · Jornadas",
  robots: { index: false, follow: false },
};

/**
 * Jornadas — **FR-AD-JOR-1** a **FR-AD-JOR-3** y **FR-AD-JOR-20**.
 *
 * Las abiertas primero, después las cerradas de la más reciente a la más
 * antigua. Arriba, las que siguen abiertas de un día anterior: es la caja que
 * nadie cerró, y la razón de que exista forzar el cierre.
 */
export default async function AdminJornadasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const sedes = sedesVisibles(session);
  const red = redEnAlcance(session.scope);
  const ahora = new Date();
  const hoy = diaEnCuba(ahora);
  /* Los últimos siete días, hoy incluido. */
  const hace7 = diaEnCuba(new Date(ahora.getTime() - 6 * 24 * 3600 * 1000));
  const inicial = await searchParams;

  const jornadas = sedes.flatMap((sede) => red.jornadas(sede.id).map((j) => ({ j, sede })));
  /* El trabajador enlaza a su ficha si está en el alcance, aunque su sede no sea la elegida en la cabecera. */
  const trabajadoresVisibles = new Set(session.sedes.flatMap((sede) => red.trabajadores(sede.id).map((w) => w.id)));

  const rows: JornadaRow[] = jornadas
    .sort((a, b) => {
      const abiertaA = a.j.estado === "abierta" ? 0 : 1;
      const abiertaB = b.j.estado === "abierta" ? 0 : 1;
      return abiertaA - abiertaB || b.j.openedAt.localeCompare(a.j.openedAt);
    })
    .map(({ j, sede }) => ({
      id: j.id,
      sede: sede.name,
      cajaId: j.registerId,
      caja: j.cajaNombre,
      workerId: j.workerId,
      trabajador: j.workerName,
      trabajadorVisible: trabajadoresVisibles.has(j.workerId),
      dia: diaEnCuba(j.openedAt),
      fecha: fechaCorta(j.openedAt),
      apertura: hora(j.openedAt),
      cierre: j.closedAt
        ? diaEnCuba(j.closedAt) === diaEnCuba(j.openedAt)
          ? hora(j.closedAt)
          : `${fechaCorta(j.closedAt)} ${hora(j.closedAt)}`
        : null,
      estado: j.estado,
      operaciones: operacionesDe(j),
      diferencias: j.arqueo
        ? j.arqueo.monedas.filter((m) => m.diferencia !== 0).map((m) => ({ currency: m.currency, diferencia: m.diferencia }))
        : null,
      alAbrir: j.apertura.cierreAnterior
        ? diferenciasDeApertura(j).map((m) => ({ currency: m.currency, diferencia: m.diferencia, motivo: m.motivo }))
        : null,
      conciliacion: conciliacionDe(j)?.estado ?? null,
    }));

  /* Una abierta de un día anterior es una caja que nadie cerró. */
  const olvidadas = jornadas.filter(({ j }) => j.estado === "abierta" && diaEnCuba(j.openedAt) < hoy);
  /* FR-AD-JOR-20: un cierre forzado que nadie ha vuelto a contar. */
  const sinContar = jornadas.filter(({ j }) => conciliacionDe(j)?.estado === "pendiente");

  return (
    <>
      <PageHeader
        title="Jornadas"
        description="El día de trabajo de cada caja: quién la abrió, qué movió y cómo cerró."
      />

      {olvidadas.length > 0 ? (
        <Alert
          variant="warning"
          title={olvidadas.length === 1 ? "Una caja sigue abierta de un día anterior" : `${olvidadas.length} cajas siguen abiertas de un día anterior`}
          className="mb-8"
        >
          {olvidadas.map(({ j, sede }, i) => (
            <React.Fragment key={j.id}>
              {i > 0 ? ", " : null}
              <Link href={`/admin/jornadas/${j.id}` as Route} className="font-semibold underline underline-offset-4">
                {j.cajaNombre} de {sede.name}
              </Link>{" "}
              (abierta por {j.workerName} el {fechaCorta(j.openedAt)})
            </React.Fragment>
          ))}
          . Si nadie va a hacer su cierre, puedes forzar el cierre desde la jornada.
        </Alert>
      ) : null}

      {sinContar.length > 0 ? (
        <Alert
          variant="warning"
          title={sinContar.length === 1 ? "Una caja con cierre forzado no se ha vuelto a contar" : `${sinContar.length} cajas con cierre forzado no se han vuelto a contar`}
          className="mb-8"
        >
          {sinContar.map(({ j, sede }, i) => (
            <React.Fragment key={j.id}>
              {i > 0 ? ", " : null}
              <Link href={`/admin/jornadas/${j.id}` as Route} className="font-semibold underline underline-offset-4">
                {j.cajaNombre} de {sede.name}
              </Link>
            </React.Fragment>
          ))}
          . Su efectivo no se ha comprobado desde el cierre: el primer conteo será el de quien abra la próxima jornada.
        </Alert>
      ) : null}

      <JornadasList rows={rows} inicial={inicial} desdePorDefecto={hace7} hoy={hoy} varias={sedes.length > 1} />
    </>
  );
}
