import { redirect } from "next/navigation";

/**
 * `/admin` no es una pantalla: es el nombre del producto. Quien la escribe a
 * mano quiere entrar, así que se le lleva a Inicio — y si no tiene sesión, el
 * layout de `(app)` lo devuelve al inicio de sesión, que es donde debe estar.
 */
export default function AdminIndexPage() {
  redirect("/admin/inicio");
}
