import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { CambiarContrasenaSuperAdmin } from "./cambiar-contrasena";

export const metadata: Metadata = {
  title: "Administración de la red · Cambiar contraseña",
  robots: { index: false, follow: false },
};

export default async function SuperAdminCambiarContrasenaPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  return (
    <>
      <PageHeader
        title="Cambiar contraseña"
        actions={
          <Button variant="secondary" asChild>
            <Link href="/super-admin/perfil">
              <ArrowLeft aria-hidden="true" />
              Volver al perfil
            </Link>
          </Button>
        }
      />
      <CambiarContrasenaSuperAdmin />
    </>
  );
}
