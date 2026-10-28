import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { NuevoUsuarioSuperAdminForm } from "./nuevo-usuario-form";

export const metadata: Metadata = {
  title: "Administración de la red · Dar de alta un usuario",
  robots: { index: false, follow: false },
};

/** Alta de un super administrador (FR-SA-USR). Solo el principal; para los demás, no existe. */
export default async function SuperAdminNuevoUsuarioPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  if (!session.user.isPrincipal) notFound();

  return (
    <>
      <PageHeader
        title="Dar de alta un usuario"
        description="Otra persona de PuntoCash con acceso a esta consola."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/super-admin/usuarios">
              <ArrowLeft aria-hidden="true" />
              Volver a Usuarios
            </Link>
          </Button>
        }
      />

      <NuevoUsuarioSuperAdminForm />
    </>
  );
}
