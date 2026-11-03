import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader, Section } from "@/components/shell/app-shell";
import { Alert } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { esHuerfana, operadorDeLaSolicitud, solicitudesDePuntoCash, TIPO_DE_SOLICITUD, type Solicitud } from "@/features/network/aprobaciones";
import { operadorVigente } from "@/features/network/assignments";
import { findOperatorById } from "@/features/network/operators";
import { findSedeById } from "@/features/network/sedes";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { DiferenciaDeApertura, fechaYHora } from "@/app/admin/(app)/jornadas/formato";
import { antiguedad, EstadoSolicitudBadge } from "@/app/admin/(app)/aprobaciones/formato";

export const metadata: Metadata = {
  title: "Super administración · Aprobaciones",
  robots: { index: false, follow: false },
};

interface Fila {
  s: Solicitud;
  sede: string;
  operadorDeEntonces: string;
  operadorDeHoy: string;
}

/**
 * Aprobaciones — **FR-SA-APR-1** y **FR-SA-APR-2**.
 *
 * Solo las diferencias de efectivo que nadie de la sede puede resolver: la
 * empresa que tenía la sede ese día ya no la tiene, y la que la tiene ahora no
 * ve lo anterior (decisión del 3/11/2026). El resto las resuelve cada mercante
 * y aquí no aparecen. Debajo, las que ya resolvió PuntoCash.
 */
export default async function SuperAdminAprobacionesPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const ahora = new Date();
  const filas: Fila[] = solicitudesDePuntoCash().map((s) => {
    const entonces = operadorDeLaSolicitud(s);
    const hoy = operadorVigente(s.sedeId);
    return {
      s,
      sede: findSedeById(s.sedeId)?.name ?? s.sedeId,
      operadorDeEntonces: entonces ? (findOperatorById(entonces)?.name ?? entonces) : "Sin operador",
      operadorDeHoy: hoy ? (findOperatorById(hoy)?.name ?? hoy) : "Sin operador",
    };
  });
  const pendientes = filas.filter((f) => esHuerfana(f.s));
  const resueltas = filas.filter((f) => !esHuerfana(f.s)).reverse();

  const columnas = (conAntiguedad: boolean): readonly ResponsiveColumn<Fila>[] => [
    {
      key: "diferencia",
      header: "Diferencia",
      cell: (f) => (
        <span className="flex flex-col">
          <span className="font-medium text-text-primary">{TIPO_DE_SOLICITUD[f.s.tipo]}</span>
          <DiferenciaDeApertura currency={f.s.currency} diferencia={f.s.diferencia} motivo={f.s.motivo} />
        </span>
      ),
    },
    {
      key: "donde",
      header: "Sede y caja",
      cell: (f) => (
        <span className="flex flex-col">
          <span className="text-text-primary">{f.sede}</span>
          <span className="text-caption text-text-secondary">
            {f.s.cajaNombre} · {f.s.workerName}
          </span>
        </span>
      ),
    },
    {
      key: "operador",
      header: "Operador de entonces",
      cell: (f) => (
        <span className="flex flex-col">
          <span className="text-text-primary">{f.operadorDeEntonces}</span>
          <span className="text-caption text-text-secondary">Hoy: {f.operadorDeHoy}</span>
        </span>
      ),
    },
    {
      key: "cuando",
      header: conAntiguedad ? "Registrada" : "Resuelta",
      cell: (f) =>
        conAntiguedad ? (
          <span className="flex flex-col">
            <span className="pc-numeric whitespace-nowrap">{fechaYHora(f.s.fechaHora)}</span>
            <span className="text-caption text-text-secondary">{antiguedad(f.s.fechaHora, ahora)}</span>
          </span>
        ) : (
          <span className="flex flex-col">
            <span className="pc-numeric whitespace-nowrap">{fechaYHora(f.s.resolucion!.at)}</span>
            <span className="text-caption text-text-secondary">{f.s.resolucion!.por}</span>
          </span>
        ),
    },
  ];

  const enlace = (f: Fila) => ({
    href: `/super-admin/aprobaciones/${encodeURIComponent(f.s.id)}`,
    label: `Ver la diferencia de ${f.s.workerName} en ${f.s.cajaNombre}`,
  });

  return (
    <>
      <PageHeader
        title="Aprobaciones"
        description="Las diferencias de efectivo que nadie de la sede puede resolver: la sede cambió de manos con ellas pendientes. Las demás las resuelve cada mercante."
      />

      <Section
        title="Pendientes"
        description={
          pendientes.length > 0
            ? `${pendientes.length === 1 ? "Una diferencia espera" : `${pendientes.length} diferencias esperan`} tu decisión. Las más antiguas, primero.`
            : undefined
        }
      >
        {pendientes.length === 0 ? (
          <Alert variant="info" title="No hay ninguna diferencia sin quien la resuelva">
            Cada mercante resuelve las de su etapa en sus sedes. Aquí solo llegan las que quedan pendientes cuando una
            sede cambia de manos.
          </Alert>
        ) : (
          <ResponsiveTable
            rows={pendientes}
            columns={columnas(true)}
            rowKey={(f) => f.s.id}
            cardTitle={(f) => TIPO_DE_SOLICITUD[f.s.tipo]}
            cardSubtitle={(f) => `${f.sede} · ${f.s.cajaNombre}`}
            cardBadge={(f) => <EstadoSolicitudBadge estado={f.s.estado} />}
            rowLink={enlace}
            empty={null}
            tablaDesde="xl"
            tarjetasEnDosColumnas
          />
        )}
      </Section>

      {resueltas.length > 0 ? (
        <Section title="Resueltas por PuntoCash">
          <ResponsiveTable
            rows={resueltas}
            columns={columnas(false)}
            rowKey={(f) => f.s.id}
            cardTitle={(f) => TIPO_DE_SOLICITUD[f.s.tipo]}
            cardSubtitle={(f) => `${f.sede} · ${f.s.cajaNombre}`}
            cardBadge={(f) => <EstadoSolicitudBadge estado={f.s.estado} />}
            rowLink={enlace}
            empty={null}
            tablaDesde="xl"
            tarjetasEnDosColumnas
          />
        </Section>
      ) : null}
    </>
  );
}
