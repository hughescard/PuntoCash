import { redirect } from "next/navigation";

/** `/super-admin` no es una pantalla: lleva a Inicio, y sin sesión el layout devuelve al acceso. */
export default function SuperAdminIndexPage() {
  redirect("/super-admin/inicio");
}
