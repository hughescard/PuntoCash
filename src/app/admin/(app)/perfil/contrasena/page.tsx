import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { CambiarContrasenaForm } from "./cambiar-contrasena-form";

export const metadata: Metadata = {
  title: "Administración de sede · Cambiar contraseña",
  robots: { index: false, follow: false },
};

/** Cambiar la propia contraseña — **FR-AD-PERF-5** a **FR-AD-PERF-8**. */
export default async function AdminCambiarContrasenaPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <>
      <PageHeader
        title="Cambiar contraseña"
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/perfil">
              <ArrowLeft aria-hidden="true" />
              Volver al perfil
            </Link>
          </Button>
        }
      />

      <CambiarContrasenaForm />
    </>
  );
}
