import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/app-shell";
import { GLOBAL_SCOPE } from "@/features/network/scope";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { SEDES } from "@/features/network/sedes";
import { OPERATORS } from "@/features/network/operators";
import { asignacionVigente } from "@/features/network/assignments";
import { conciliacionDe, operacionesDe } from "@/features/network/jornadas";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { diaEnCuba, fechaCorta, hora } from "@/app/admin/(app)/jornadas/formato";
import { JornadasDeRedList, type JornadaDeRedRow } from "./jornadas-list";

export const metadata: Metadata = {
  title: "Super administración · Jornadas",
  robots: { index: false, follow: false },
};

/**
 * Jornadas de la red.
 *
 * **El requisito no tenía esta sección** —no existe ningún `FR-SA-JOR`— y se
 * añade a propósito. Una jornada es la unidad que ata en un solo hecho el
 * día, la caja, el trabajador, las operaciones que hizo y el efectivo que
 * resultó. Es exactamente lo que PuntoCash necesita para conciliar con un
 * operador y para responder en una auditoría, y es donde se ve un operador
 * que fuerza cierres a menudo, que es una señal que no aparece en ninguna
 * otra pantalla.
 *
 * **Sin una sola acción**: PuntoCash no fuerza cierres ni resuelve
 * solicitudes. Eso lo hace el administrador de la sede.
 *
 * Por defecto, los últimos siete días: la red entera acumula demasiadas
 * jornadas para abrir sin ventana, y un listado que tarda en pintar no se
 * consulta.
 */
export default async function SuperAdminJornadasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  const inicial = await searchParams;

  const red = redEnAlcance(GLOBAL_SCOPE);
  const ahora = new Date();
  const hoy = diaEnCuba(ahora);
  const hace7 = diaEnCuba(new Date(ahora.getTime() - 6 * 24 * 3600 * 1000));

  const filas: JornadaDeRedRow[] = SEDES.flatMap((sede) => {
    const tramo = asignacionVigente(sede.id);
    const operador = tramo ? OPERATORS.find((o) => o.id === tramo.operatorId) ?? null : null;
    return red.jornadas(sede.id).map((j) => ({
      id: j.id,
      sedeId: sede.id,
      sede: sede.name,
      operadorId: operador?.id ?? null,
      operador: operador?.name ?? null,
      cajaId: j.registerId,
      caja: j.cajaNombre,
      workerId: j.workerId,
      trabajador: j.workerName,
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
        ? j.arqueo.monedas
            .filter((m) => m.diferencia !== 0)
            .map((m) => ({ currency: m.currency, diferencia: m.diferencia }))
        : null,
      sinConciliar: conciliacionDe(j)?.estado === "pendiente",
    }));
  });

  filas.sort((a, b) => {
    const abiertaA = a.estado === "abierta" ? 0 : 1;
    const abiertaB = b.estado === "abierta" ? 0 : 1;
    return abiertaA - abiertaB || b.dia.localeCompare(a.dia) || a.sede.localeCompare(b.sede, "es");
  });

  return (
    <>
      <PageHeader
        title="Jornadas"
        description="El día de trabajo de cada caja de la red: quién la abrió, cuánto movió y cómo cerró. Solo se consulta: forzar un cierre es del administrador de la sede."
      />
      <JornadasDeRedList rows={filas} inicial={inicial} desdePorDefecto={hace7} hoy={hoy} />
    </>
  );
}
