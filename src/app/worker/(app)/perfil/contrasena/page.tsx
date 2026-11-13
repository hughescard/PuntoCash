import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getContextoDeTrabajo } from "@/features/worker/sesion-servidor";
import { CambiarContrasenaTrabajadorForm } from "./cambiar-contrasena-form";

export const metadata: Metadata = {
  title: "Cambiar contraseña",
  robots: { index: false, follow: false },
};

export default async function WorkerCambiarContrasenaPage() {
  const ctx = await getContextoDeTrabajo();
  if (!ctx) redirect("/worker/login");
  return (
    <>
      <PageHeader
        title="Cambiar contraseña"
        actions={
          <Button variant="secondary" asChild>
            <Link href="/worker/perfil">
              <ArrowLeft aria-hidden="true" />
              Volver al perfil
            </Link>
          </Button>
        }
      />
      <CambiarContrasenaTrabajadorForm />
    </>
  );
}
