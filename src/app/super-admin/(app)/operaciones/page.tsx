import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/app-shell";
import { formatMoney } from "@/lib/format";
import { GLOBAL_SCOPE } from "@/features/network/scope";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { SEDES } from "@/features/network/sedes";
import { OPERATORS } from "@/features/network/operators";
import { operadorVigenteEn } from "@/features/network/assignments";
import type { OperacionDeRed } from "@/features/network/operaciones";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { diaEnCuba, fechaCorta, hora } from "@/app/admin/(app)/jornadas/formato";
import { OperacionesDeRedList, type OperacionDeRedRow } from "./operaciones-list";

export const metadata: Metadata = {
  title: "Super administración · Operaciones",
  robots: { index: false, follow: false },
};

/**
 * Operaciones de la red — el registro que PuntoCash enseña en una auditoría:
 * qué se hizo, dónde, cuándo y quién lo hizo.
 *
 * Igual que su equivalente en la consola del mercante, con dos diferencias:
 * el alcance es la red entera y hay filtro por operador.
 *
 * El operador de cada fila es **el de la fecha de la operación**, no el de
 * hoy: una operación de marzo pertenece a quien administraba la sede en
 * marzo, aunque hoy la administre otro. Es lo que da sentido al historial de
 * asignaciones, y lo que hace que una conciliación cuadre.
 */
export default async function SuperAdminOperacionesPage({
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

  const filas: OperacionDeRedRow[] = SEDES.flatMap((sede) =>
    red.operaciones(sede.id).map((o) => {
      const operadorId = operadorVigenteEn(sede.id, new Date(o.fechaHora));
      const operador = operadorId ? OPERATORS.find((x) => x.id === operadorId) ?? null : null;
      return {
        codigo: o.codigo,
        dia: diaEnCuba(o.fechaHora),
        fecha: `${fechaCorta(o.fechaHora)} · ${hora(o.fechaHora)}`,
        fechaHora: o.fechaHora,
        sedeId: sede.id,
        sede: sede.name,
        operadorId: operador?.id ?? null,
        operador: operador?.name ?? null,
        caja: o.caja,
        workerId: o.workerId,
        trabajador: o.worker,
        servicio: o.servicio,
        accion: accionDeGiro(o),
        cliente: o.cliente.nombre,
        documento: o.cliente.documentNumber,
        importe: importe(o),
        estado: o.estado,
        desdeKiosco: Boolean(o.origenKiosco),
      };
    }),
  ).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));

  return (
    <>
      <PageHeader
        title="Operaciones"
        description="Todo lo que la red ha hecho con cada cliente, completado o no. El operador de cada fila es el que administraba la sede ese día."
      />
      <OperacionesDeRedList rows={filas} inicial={inicial} desdePorDefecto={hace7} hoy={hoy} />
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
