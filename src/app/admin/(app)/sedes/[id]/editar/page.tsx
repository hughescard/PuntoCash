import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { EditarDatosForm } from "./editar-datos-form";

export const metadata: Metadata = {
  title: "Administración de sede · Editar datos de la sede",
  robots: { index: false, follow: false },
};

/**
 * Dirección, teléfono y horario de una sede — **FR-AD-SEDE-14**. Pantalla y no
 * diálogo, como toda edición de §6 a §8: el horario son siete filas.
 *
 * La misma guarda que la ficha: una sede fuera del alcance responde como
 * inexistente (**FR-AD-NAV-3**). Una sede cerrada no tiene nada que exhibir,
 * así que vuelve a su ficha.
 */
export default async function AdminEditarSedePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const sede = session.sedes.find((s) => s.id === id);
  if (!sede) notFound();
  if (sede.status === "cerrada") redirect(`/admin/sedes/${sede.id}`);

  return (
    <>
      <PageHeader
        title="Editar datos de la sede"
        description={`${sede.name} · El código y el nombre los gestiona PuntoCash.`}
        actions={
          <Button variant="secondary" asChild>
            <Link href={`/admin/sedes/${sede.id}`}>
              <ArrowLeft aria-hidden="true" />
              Volver a la sede
            </Link>
          </Button>
        }
      />

      <EditarDatosForm
        sede={{ id: sede.id, name: sede.name }}
        datos={{
          direccion: sede.address,
          municipio: sede.locality,
          telefono: sede.phone,
          horario: sede.horario,
        }}
      />
    </>
  );
}
