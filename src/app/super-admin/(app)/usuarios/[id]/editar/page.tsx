import Link from "next/link";
import type { Metadata } from "next";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { findPuntoCashUserById } from "@/features/super-admin/usuarios";
import { EditarUsuarioSuperAdminForm } from "./editar-usuario-form";

export const metadata: Metadata = {
  title: "Super administración · Editar usuario",
  robots: { index: false, follow: false },
};

/** Editar los datos personales de un usuario de la consola. Solo el principal. */
export default async function SuperAdminEditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  if (!session.user.isPrincipal) notFound();

  const { id } = await params;
  const usuario = findPuntoCashUserById(id);
  if (!usuario) notFound();

  /* El nombre se guarda en una sola cadena y el formulario lo pide en tres
     campos: se reparte por posición, y lo que sobra vuelve al segundo apellido. */
  const partes = usuario.fullName.split(" ").filter(Boolean);

  return (
    <>
      <PageHeader
        title={`Editar a ${usuario.fullName}`}
        description={usuario.id === session.user.id ? "Tu usuario" : usuario.identifier}
        actions={
          <Button variant="secondary" asChild>
            <Link href={`/super-admin/usuarios/${usuario.id}` as Route}>
              <ArrowLeft aria-hidden="true" />
              Volver a su ficha
            </Link>
          </Button>
        }
      />

      <EditarUsuarioSuperAdminForm
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
