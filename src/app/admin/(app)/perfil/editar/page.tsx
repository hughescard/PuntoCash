import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { EditarPerfilForm } from "./editar-perfil-form";

export const metadata: Metadata = {
  title: "Administración de sede · Editar mis datos",
  robots: { index: false, follow: false },
};

/**
 * Los datos propios — **FR-AD-PERF-3**. Pantalla y no diálogo, igual que
 * editar un usuario o un trabajador (**FR-AD-USR-6**, **FR-AD-TRAB-9**), y con
 * los mismos tres campos: lo que una persona puede corregir de sí misma es lo
 * mismo que el principal puede corregirle.
 */
export default async function AdminEditarPerfilPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  /* El nombre completo se guarda en una sola cadena y el formulario lo pide en
     tres campos: se reparte por posición, como en §8, y lo que sobre a partir
     del tercer término vuelve pegado al segundo apellido. */
  const partes = session.user.fullName.split(" ").filter(Boolean);

  return (
    <>
      <PageHeader
        title="Editar mis datos"
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/perfil">
              <ArrowLeft aria-hidden="true" />
              Volver al perfil
            </Link>
          </Button>
        }
      />

      <EditarPerfilForm
        datos={{
          nombre: partes[0] ?? "",
          primerApellido: partes[1] ?? "",
          segundoApellido: partes.slice(2).join(" "),
          telefono: session.user.phone,
        }}
      />
    </>
  );
}
