import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { reglasVigentes } from "@/features/network/alertas";
import { denominacionesDe } from "@/features/network/denominaciones";
import { AlertasForm } from "./alertas-form";

export const metadata: Metadata = {
  title: "Administración de sede · Alertas de caja",
  robots: { index: false, follow: false },
};

/**
 * Las alertas de caja de una sede (bloque 6). Pantalla y no diálogo: son varias
 * monedas con varios campos cada una. La misma guarda que la ficha: una sede
 * fuera del alcance responde como inexistente (**FR-AD-NAV-3**).
 */
export default async function AdminAlertasDeSedePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const sede = session.sedes.find((s) => s.id === id);
  if (!sede) notFound();
  if (sede.status === "cerrada") redirect(`/admin/sedes/${sede.id}`);

  const red = redEnAlcance(session.scope);
  const reglas = reglasVigentes(sede.id);
  const monedas = red.monedas(sede.id).map((m) => ({
    code: m.code,
    regla: reglas.find((r) => r.currency === m.code) ?? null,
    denominaciones: denominacionesDe(m.code).map((d) => ({ valor: d.valor, tipo: d.tipo })),
  }));

  return (
    <>
      <PageHeader
        title="Alertas de caja"
        description={`${sede.name} · Valen para todas sus cajas con la jornada abierta.`}
        actions={
          <Button variant="secondary" asChild>
            <Link href={`/admin/sedes/${sede.id}`}>
              <ArrowLeft aria-hidden="true" />
              Volver a la sede
            </Link>
          </Button>
        }
      />
      <AlertasForm sede={{ id: sede.id, name: sede.name }} monedas={monedas} />
    </>
  );
}
