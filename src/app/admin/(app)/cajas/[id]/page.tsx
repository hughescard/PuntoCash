import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getAdminSession } from "@/features/admin/session-server";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { diaEnCuba } from "@/features/network/jornadas";
import { jornadaDeCaja } from "../../jornadas/formato";
import { AccionesDeCaja, type CajaRow } from "../cajas-de-sede";
import { efectivoDeCaja } from "../efectivo";
import { CuerpoDeCaja } from "./cuerpo-de-caja";

export const metadata: Metadata = {
  title: "Administración de sede · Caja",
  robots: { index: false, follow: false },
};

/**
 * La ficha de una caja: su estado en este momento, su efectivo, lo pendiente y
 * su historial. Una caja de otra empresa responde como inexistente.
 */
export default async function AdminCajaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  /* El identificador de una caja lleva «:» (`sede-vedado:caja-01`) y llega codificado. */
  const id = decodeURIComponent((await params).id);
  const red = redEnAlcance(session.scope);
  const sede = session.sedes.find((s) => red.cajasConHistorico(s.id).some((c) => c.id === id));
  const caja = sede ? red.cajasConHistorico(sede.id).find((c) => c.id === id) : undefined;
  if (!sede || !caja) notFound();

  const equipo = red.equipoDeCaja(caja.id);
  const abierta = red.jornadaAbiertaDeCaja(caja.id);
  const cerrada = abierta ? null : red.ultimaJornadaCerradaDeCaja(caja.id);
  const historial = [...red.jornadas(sede.id)]
    .filter((j) => j.registerId === caja.id)
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  const pendientes = red.solicitudes(sede.id).filter((s) => s.registerId === caja.id && s.estado === "pendiente");

  const activas = red.cajasActivas(sede.id).length;
  const fila: CajaRow = {
    id: caja.id,
    name: caja.name,
    status: caja.status,
    equipo: equipo ? { id: equipo.id, label: equipo.label } : null,
    alta: formatDate(new Date(caja.createdAt)),
    ...(caja.retiredReason ? { motivoRetirada: caja.retiredReason } : {}),
    jornada: jornadaDeCaja(abierta, diaEnCuba(new Date())),
    ultimaActiva: caja.status === "activa" && activas <= 1 && sede.status === "activa",
    sedeId: sede.id,
    efectivo: efectivoDeCaja(red, caja.id),
  };

  return (
    <>
      <PageHeader
        title={caja.name}
        description={`Caja de ${sede.name}.${caja.retiredReason ? ` Retirada: ${caja.retiredReason}` : ""}`}
        actions={
          <div className="pc-botonera">
            <AccionesDeCaja caja={fila} />
            <Button variant="secondary" asChild>
              <Link href="/admin/cajas">
                <ArrowLeft aria-hidden="true" />
                Volver a Cajas
              </Link>
            </Button>
          </div>
        }
      />
      <CuerpoDeCaja
        caja={caja}
        equipo={equipo}
        abierta={abierta}
        cerrada={cerrada}
        historial={historial}
        pendientes={pendientes}
        base="/admin"
      />
    </>
  );
}
