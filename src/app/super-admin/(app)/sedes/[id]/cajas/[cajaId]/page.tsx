import Link from "next/link";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { GLOBAL_SCOPE } from "@/features/network/scope";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { findSedeById } from "@/features/network/sedes";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { CuerpoDeCaja } from "@/app/admin/(app)/cajas/[id]/cuerpo-de-caja";

export const metadata: Metadata = {
  title: "PuntoCash · Caja",
  robots: { index: false, follow: false },
};

/**
 * La ficha de una caja para PuntoCash: la misma que ve su Admin, de consulta.
 * Retirar o reactivar una caja es cosa del mercante.
 */
export default async function SuperAdminCajaPage({ params }: { params: Promise<{ id: string; cajaId: string }> }) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  const { id, cajaId: crudo } = await params;
  /* El identificador de una caja lleva «:» (`sede-vedado:caja-01`) y llega codificado. */
  const cajaId = decodeURIComponent(crudo);
  const sede = findSedeById(id);
  const red = redEnAlcance(GLOBAL_SCOPE);
  const caja = sede ? red.cajasConHistorico(sede.id).find((c) => c.id === cajaId) : undefined;
  if (!sede || !caja) notFound();

  const abierta = red.jornadaAbiertaDeCaja(caja.id);
  const historial = [...red.jornadas(sede.id)]
    .filter((j) => j.registerId === caja.id)
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));

  return (
    <>
      <PageHeader
        title={caja.name}
        description={`Caja de ${sede.name}.${caja.retiredReason ? ` Retirada: ${caja.retiredReason}` : ""}`}
        actions={
          <Button variant="secondary" asChild>
            <Link href={`/super-admin/sedes/${sede.id}` as Route}>
              <ArrowLeft aria-hidden="true" />
              Volver a la sede
            </Link>
          </Button>
        }
      />
      <CuerpoDeCaja
        caja={caja}
        equipo={red.equipoDeCaja(caja.id)}
        abierta={abierta}
        cerrada={abierta ? null : red.ultimaJornadaCerradaDeCaja(caja.id)}
        historial={historial}
        pendientes={red.solicitudes(sede.id).filter((s) => s.registerId === caja.id && s.estado === "pendiente")}
        base="/super-admin"
      />
    </>
  );
}
