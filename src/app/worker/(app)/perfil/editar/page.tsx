import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getContextoDeTrabajo } from "@/features/worker/sesion-servidor";
import { EditarDatosPropiosForm } from "./editar-datos-propios-form";

export const metadata: Metadata = {
  title: "Cambiar usuario o teléfono",
  robots: { index: false, follow: false },
};

export default async function WorkerEditarPerfilPage() {
  const ctx = await getContextoDeTrabajo();
  if (!ctx) redirect("/worker/login");
  return (
    <>
      <PageHeader
        title="Cambiar usuario o teléfono"
        actions={
          <Button variant="secondary" asChild>
            <Link href="/worker/perfil">
              <ArrowLeft aria-hidden="true" />
              Volver al perfil
            </Link>
          </Button>
        }
      />
      <EditarDatosPropiosForm inicial={{ usuario: ctx.worker.identifier, telefono: ctx.worker.phone }} />
    </>
  );
}
