import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { NuevoUsuarioForm } from "./nuevo-usuario-form";

export const metadata: Metadata = {
  title: "Administración de sede · Dar de alta un usuario",
  robots: { index: false, follow: false },
};

/**
 * Alta de un usuario administrador — **FR-AD-USR-2**.
 *
 * No hay nada que elegir aquí sobre alcance: el usuario nace en **tu** empresa
 * y con potestad sobre **todas** tus sedes (**FR-AD-USR-4**). Esa ausencia de
 * elección es la que el formulario tiene que explicar, porque es lo contrario
 * de lo que espera quien viene del alta de trabajadores, donde sí se elige
 * sede.
 */
export default async function AdminNuevoUsuarioPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  /* **FR-AD-USR-11**: §8 pertenece al administrador principal. Para los demás
     la sección **no existe** —no «no tienes permiso»—, igual que una sede
     ajena (**FR-AD-NAV-3**): quien no la gobierna no necesita saber que está
     ahí. */
  if (!session.user.isPrincipal) notFound();

  return (
    <>
      <PageHeader
        title="Dar de alta un usuario"
        description={`Otra persona de ${session.operator.name} con acceso a esta consola.`}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/usuarios">
              <ArrowLeft aria-hidden="true" />
              Volver a Usuarios
            </Link>
          </Button>
        }
      />

      <NuevoUsuarioForm />
    </>
  );
}
