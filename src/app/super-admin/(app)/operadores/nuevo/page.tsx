import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { NuevoOperadorForm } from "./nuevo-operador-form";

export const metadata: Metadata = {
  title: "Super administración · Nuevo operador",
  robots: { index: false, follow: false },
};

/**
 * Alta de un operador y de su primer usuario administrador, que será el
 * principal de su empresa. No asigna sedes: eso es un acto propio, desde la
 * ficha del operador o de la sede.
 */
export default async function SuperAdminNuevoOperadorPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  return (
    <>
      <PageHeader
        title="Nuevo operador"
        description="Una empresa a la que PuntoCash entregará sedes, y la persona con la que entra por primera vez."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/super-admin/operadores">
              <ArrowLeft aria-hidden="true" />
              Volver a Operadores
            </Link>
          </Button>
        }
      />
      <NuevoOperadorForm />
    </>
  );
}
