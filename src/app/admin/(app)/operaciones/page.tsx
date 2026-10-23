import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/app-shell";
import { formatMoney } from "@/lib/format";
import { getAdminSession } from "@/features/admin/session-server";
import { sedesVisibles } from "@/features/admin/session";
import { redEnAlcance } from "@/features/network/scoped-reads";
import type { OperacionDeRed } from "@/features/network/operaciones";
import { diaEnCuba, fechaCorta, hora } from "../jornadas/formato";
import { OperacionesList, type OperacionRow } from "./operaciones-list";

export const metadata: Metadata = {
  title: "Administración de sede · Operaciones",
  robots: { index: false, follow: false },
};

/**
 * Operaciones — **FR-AD-OPS-1** y **FR-AD-OPS-2**.
 *
 * Todas las operaciones de las cajas de las sedes que deja ver la cabecera,
 * completadas o no: una remesa rechazada o un giro fallido también es algo que
 * el mercante quiere ver. De la más reciente a la más antigua. Las filas se
 * componen aquí, ya formateadas, y se filtran en el cliente, como Jornadas.
 */
export default async function AdminOperacionesPage({
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
  /* El trabajador enlaza a su ficha si está en el alcance, aunque su sede no sea la elegida en la cabecera. */
  const trabajadoresVisibles = new Set(session.sedes.flatMap((sede) => red.trabajadores(sede.id).map((w) => w.id)));

  const rows: OperacionRow[] = sedes
    .flatMap((sede) => red.operaciones(sede.id).map((o) => ({ o, sede })))
    .sort((a, b) => b.o.fechaHora.localeCompare(a.o.fechaHora))
    .map(({ o, sede }) => ({
      codigo: o.codigo,
      dia: diaEnCuba(o.fechaHora),
      fecha: `${fechaCorta(o.fechaHora)} · ${hora(o.fechaHora)}`,
      sede: sede.name,
      cajaId: o.registerId,
      caja: o.caja,
      workerId: o.workerId,
      trabajador: o.worker,
      trabajadorVisible: trabajadoresVisibles.has(o.workerId),
      servicio: o.servicio,
      accion: accionDeGiro(o),
      cliente: o.cliente.nombre,
      documento: o.cliente.documentNumber,
      importe: importe(o),
      estado: o.estado,
      desdeKiosco: Boolean(o.origenKiosco),
    }));

  return (
    <>
      <PageHeader
        title="Operaciones"
        description="Lo que tus cajas han hecho con cada cliente, completado o no. Solo lectura."
      />
      <OperacionesList rows={rows} inicial={inicial} desdePorDefecto={hace7} hoy={hoy} varias={sedes.length > 1} />
    </>
  );
}

/** «250,00 USD → 79.000,00 CUP» en un cambio; el importe, en lo demás. */
function importe(o: OperacionDeRed): string {
  return o.amount.kind === "exchange"
    ? `${formatMoney(o.amount.source)} → ${formatMoney(o.amount.destination)}`
    : formatMoney(o.amount.money);
}

/** Un giro se envía o se paga, y son dos operaciones distintas. */
function accionDeGiro(o: OperacionDeRed): string | null {
  if (!o.transfer) return null;
  return o.transfer.transferAction === "send" ? "Enviado" : "Pagado";
}
