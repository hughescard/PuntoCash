import Link from "next/link";
import type { Metadata } from "next";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { findAdminUserById } from "@/features/network/operators";
import { EditarUsuarioForm } from "./editar-usuario-form";

export const metadata: Metadata = {
  title: "Administración de sede · Editar usuario",
  robots: { index: false, follow: false },
};

/**
 * Editar los datos de un usuario administrador — **FR-AD-USR-6**.
 *
 * Pantalla y no diálogo, por lo mismo que en §7: son cuatro campos con
 * teclados distintos y **FR-AD-SHELL-15** no los quiere peleándose con el alto
 * de un modal a 360px. Que editar sea una pantalla en las dos secciones
 * también evita que el producto se sienta inconsistente consigo mismo.
 *
 * **Se puede editar a uno mismo.** Corregir tu nombre o tu teléfono no te deja
 * fuera de nada; la guarda de **FR-AD-USR-7** protege la desactivación, que sí
 * es irreversible desde el lado de quien la sufre.
 */
export default async function AdminEditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  /* **FR-AD-USR-11**: §8 pertenece al administrador principal. Para los demás
     la sección **no existe** —no «no tienes permiso»—, igual que una sede
     ajena (**FR-AD-NAV-3**): quien no la gobierna no necesita saber que está
     ahí. */
  if (!session.user.isPrincipal) notFound();

  const { id } = await params;
  const usuario = findAdminUserById(id);
  if (!usuario || usuario.operatorId !== session.operator.id) notFound();

  /* El nombre completo se guarda en una sola cadena y el formulario lo pide en
     tres campos: hay que repartirlo por posición, y lo que haya a partir del
     tercer término vuelve pegado al segundo apellido en vez de perderse. */
  const partes = usuario.fullName.split(" ").filter(Boolean);

  return (
    <>
      <PageHeader
        title={`Editar a ${usuario.fullName}`}
        description={usuario.id === session.user.id ? "Tu usuario" : usuario.identifier}
        actions={
          <Button variant="secondary" asChild>
            <Link href={`/admin/usuarios/${usuario.id}` as Route}>
              <ArrowLeft aria-hidden="true" />
              Volver a su ficha
            </Link>
          </Button>
        }
      />

      <EditarUsuarioForm
        usuario={{
          id: usuario.id,
          nombre: partes[0] ?? "",
          primerApellido: partes[1] ?? "",
          segundoApellido: partes.slice(2).join(" "),
          telefono: usuario.phone,
        }}
      />
    </>
  );
}
