import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { DetalleDeSede } from "../detalle-de-sede";

export const metadata: Metadata = {
  title: "Administración de sede · Tasas de una sede",
  robots: { index: false, follow: false },
};

/**
 * Las tasas de una sede, a las que se llega desde la tabla de Tasas
 * (**FR-AD-TASA-9**). Es una ruta y no un cambio de alcance: entrar aquí no
 * toca el filtro de la cabecera, y volver a Tasas devuelve la tabla tal como
 * estaba.
 *
 * La sede se valida contra la sesión **antes** de pintar nada: una ajena o
 * inexistente responde igual (**FR-AD-NAV-2**, **FR-AD-NAV-3**). Si el selector
 * de la cabecera ya está en **otra** sede, se vuelve a `/admin/tasas`, que
 * muestra la del selector: esta pantalla no puede decir una sede mientras la
 * cabecera dice otra.
 */
export default async function AdminTasasDeSedePage({
  params,
}: {
  params: Promise<{ sedeId: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { sedeId } = await params;
  const sede = session.sedes.find((s) => s.id === sedeId);
  if (!sede) notFound();
  if (session.selected && session.selected.id !== sede.id) redirect("/admin/tasas");

  return (
    <>
      <PageHeader
        title="Tasas"
        description="Esta es la tasa con la que cotiza cada sede y la que muestra su tablero de tasas en el kiosco y en la pantalla informativa."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/tasas">
              <ArrowLeft aria-hidden="true" />
              Volver a Tasas
            </Link>
          </Button>
        }
      />
      <DetalleDeSede red={redEnAlcance(session.scope)} sede={sede} />
    </>
  );
}
