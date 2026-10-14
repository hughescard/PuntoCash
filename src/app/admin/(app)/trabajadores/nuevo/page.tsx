import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Alert, Button } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { NuevoTrabajadorForm } from "./nuevo-trabajador-form";

export const metadata: Metadata = {
  title: "Administración de sede · Dar de alta un trabajador",
  robots: { index: false, follow: false },
};

/**
 * Alta de un trabajador — **FR-AD-TRAB-3**.
 *
 * El selector ofrece **únicamente sedes del alcance** (**FR-AD-TRAB-5**), y el
 * dominio lo vuelve a comprobar al guardar: que la pantalla no ofrezca una
 * sede ajena es comodidad, no control.
 *
 * Una sede **cerrada** no admite trabajadores —el dominio la rechaza— así que
 * tampoco se ofrece. Una **suspendida** sí: la suspensión es temporal, y
 * preparar la plantilla mientras tanto es justo lo que hay que poder hacer;
 * se marca para que nadie dé por hecho que esa persona podrá entrar hoy.
 */
export default async function AdminNuevoTrabajadorPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const sedes = session.sedes
    .filter((sede) => sede.status !== "cerrada")
    .map((sede) => ({
      id: sede.id,
      name: sede.name,
      suspendida: sede.status === "suspendida",
    }));

  return (
    <>
      <PageHeader
        title="Dar de alta un trabajador"
        description="Una persona que operará las cajas de una de tus sedes."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/trabajadores">
              <ArrowLeft aria-hidden="true" />
              Volver a Trabajadores
            </Link>
          </Button>
        }
      />

      {sedes.length === 0 ? (
        <Alert variant="info" title="No hay ninguna sede donde dar de alta a nadie">
          Tus sedes están cerradas, o todavía no tienes ninguna asignada.
        </Alert>
      ) : (
        <NuevoTrabajadorForm sedes={sedes} />
      )}
    </>
  );
}
