import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { OPERATORS } from "@/features/network/operators";
import { WORKER_SERVICES } from "@/features/operations/services";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { NuevaSedeForm } from "./nueva-sede-form";

export const metadata: Metadata = {
  title: "Super administración · Nueva sede",
  robots: { index: false, follow: false },
};

/**
 * Alta de una sede: datos, servicios y asignación inicial en un solo
 * formulario por secciones, sin pasos. No hay sección de cajas: una sede nace
 * vacía y las cajas las crea su operador.
 */
export default async function SuperAdminNuevaSedePage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");

  /* Solo los servicios que existen hoy en la red. Los que están en
     construcción no se pueden ofrecer en ningún mostrador todavía. */
  const servicios = WORKER_SERVICES.filter((s) => s.status === "available").map((s) => ({
    id: s.id,
    nombre: s.name,
    descripcion: s.description,
  }));
  const operadores = OPERATORS.filter((o) => o.status === "activo")
    .map((o) => ({ id: o.id, nombre: o.name }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <>
      <PageHeader
        title="Nueva sede"
        description="Una sucursal nueva de la red. Nace sin cajas: las crea su operador."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/super-admin/sedes">
              <ArrowLeft aria-hidden="true" />
              Volver a Sedes
            </Link>
          </Button>
        }
      />
      <NuevaSedeForm servicios={servicios} operadores={operadores} />
    </>
  );
}
