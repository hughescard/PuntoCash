import Link from "next/link";
import type { Metadata } from "next";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { redEnAlcance } from "@/features/network/scoped-reads";
import type { NetworkWorker } from "@/features/network/workers";
import { EditarTrabajadorForm } from "./editar-trabajador-form";

export const metadata: Metadata = {
  title: "Administración de sede · Editar trabajador",
  robots: { index: false, follow: false },
};

/**
 * Editar los datos de un trabajador — **FR-AD-TRAB-9**.
 *
 * **Es una pantalla, no un diálogo**, y la diferencia no es estética: son seis
 * campos con teclados distintos, y **FR-AD-SHELL-15** pide que a 360px un
 * formulario tenga sitio para desplegar el teclado sin pelearse con el alto de
 * un modal. Las acciones que sí son diálogos —desactivar, reactivar,
 * reasignar— caben en una frase y una confirmación.
 *
 * La guarda es la de siempre (**FR-AD-NAV-2**, **FR-AD-NAV-3**): se busca
 * dentro del alcance y un trabajador ajeno responde igual que uno inexistente.
 */
export default async function AdminEditarTrabajadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const red = redEnAlcance(session.scope);

  let trabajador: NetworkWorker | null = null;
  let sedeName = "";
  for (const sede of session.sedes) {
    const encontrado = red.trabajadores(sede.id).find((w) => w.id === id);
    if (encontrado) {
      trabajador = encontrado;
      sedeName = sede.name;
      break;
    }
  }

  if (!trabajador) notFound();

  /* El nombre completo se guarda en una sola cadena y el formulario lo pide en
     tres campos, así que hay que repartirlo. Es la inversa exacta de lo que
     hace el alta al unirlos, y **la única forma honesta de repartirlo es por
     posición**: lo que haya a partir del tercer término se devuelve pegado al
     segundo apellido, en vez de perderse al guardar. */
  const partes = trabajador.fullName.split(" ").filter(Boolean);
  const nombre = trabajador.firstName || partes[0] || "";
  const resto = partes.slice(nombre.split(" ").length);

  return (
    <>
      <PageHeader
        title={`Editar a ${trabajador.fullName}`}
        description={`${trabajador.identifier} · ${sedeName}`}
        actions={
          <Button variant="secondary" asChild>
            <Link href={`/admin/trabajadores/${trabajador.id}` as Route}>
              <ArrowLeft aria-hidden="true" />
              Volver a su ficha
            </Link>
          </Button>
        }
      />

      <EditarTrabajadorForm
        trabajador={{
          id: trabajador.id,
          nombre,
          primerApellido: resto[0] ?? "",
          segundoApellido: resto.slice(1).join(" "),
          tipoDocumento: trabajador.documentType,
          documento: trabajador.documentId,
          telefono: trabajador.phone,
        }}
      />
    </>
  );
}
