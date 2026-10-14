import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Alert, Button } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { NuevaCajaForm } from "./nueva-caja-form";

export const metadata: Metadata = {
  title: "Administración de sede · Crear caja",
  robots: { index: false, follow: false },
};

/**
 * Alta de una caja — **FR-AD-CAJA-4 a 7**.
 *
 * Dos campos y nada más: sede e identificador. Una caja nace **activa, sin
 * equipo y sin jornada**; todo lo demás llega después, y pedirlo aquí sería
 * inventar decisiones que el negocio no toma en este momento.
 *
 * El desplegable ofrece **solo sedes del alcance**, y el dominio lo vuelve a
 * comprobar al guardar (**FR-AD-CAJA-5**): que la pantalla no ofrezca una sede
 * ajena es comodidad, no control.
 */
export default async function AdminNuevaCajaPage({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { sede } = await searchParams;

  /* Solo sedes donde tenga sentido crear: una cerrada no admite cajas nuevas.
     Una suspendida sí — la suspensión es temporal y montar la sucursal
     mientras tanto es precisamente lo que hay que poder hacer. */
  const sedes = session.sedes
    .filter((s) => s.status !== "cerrada")
    .map((s) => ({ id: s.id, name: s.name, suspendida: s.status === "suspendida" }));

  const preseleccionada = sedes.some((s) => s.id === sede) ? sede : undefined;

  return (
    <>
      <PageHeader
        title="Crear caja"
        description="Un mostrador más en una de tus sedes."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/cajas">
              <ArrowLeft aria-hidden="true" />
              Volver a Cajas
            </Link>
          </Button>
        }
      />

      {sedes.length === 0 ? (
        <Alert variant="info" title="No hay ninguna sede donde crear una caja">
          Tus sedes están cerradas, o todavía no tienes ninguna asignada.
        </Alert>
      ) : (
        <div className="max-w-form-max">
          <NuevaCajaForm sedes={sedes} preseleccionada={preseleccionada} />
        </div>
      )}
    </>
  );
}
