import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { UserPlus } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Alert, Button } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { maskEmail } from "@/features/auth/two-factor";
import { getAdminSession } from "@/features/admin/session-server";
import { adminUsersOf } from "@/features/network/operators";
import { UsuariosList, type UsuarioRow } from "./usuarios-list";

export const metadata: Metadata = {
  title: "Administración de sede · Usuarios",
  robots: { index: false, follow: false },
};

/**
 * Usuarios administradores — **§8 del FRD**.
 *
 * ── El alcance aquí es el operador, no las sedes ──────────────────────────
 * §7 lee sede a sede porque un trabajador pertenece a una sede. Un usuario
 * administrador pertenece al **operador**, que *es* el alcance de la sesión:
 * `adminUsersOf(session.operator.id)` no puede devolver a nadie de otra
 * empresa porque no hay otra dimensión por la que equivocarse. Por eso no pasa
 * por `redEnAlcance`, y no es un atajo.
 *
 * Las filas se componen **en el servidor**, fechas y correo enmascarado
 * incluidos: formatear en el cliente lo que el servidor ya pintó desajusta la
 * hidratación en cuanto las zonas horarias no coinciden, y es un fallo que no
 * se ve en la máquina de quien lo escribe.
 */
export default async function AdminUsuariosPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  /* **FR-AD-USR-11**: §8 pertenece al administrador principal. Para los demás
     la sección **no existe** —no «no tienes permiso»—, igual que una sede
     ajena (**FR-AD-NAV-3**): quien no la gobierna no necesita saber que está
     ahí. */
  if (!session.user.isPrincipal) notFound();

  const filas: UsuarioRow[] = adminUsersOf(session.operator.id).map((usuario) => ({
    id: usuario.id,
    fullName: usuario.fullName,
    identifier: usuario.identifier,
    correo: maskEmail(usuario.email),
    status: usuario.status,
    isPrincipal: usuario.isPrincipal,
    isInitial: usuario.isInitial,
    alta: formatDate(new Date(usuario.createdAt)),
    ultimoAcceso: usuario.lastAccessAt ? formatDateTime(new Date(usuario.lastAccessAt)) : null,
    esYo: usuario.id === session.user.id,
  }));

  /* Orden estable: activos primero y, dentro, alfabético. Una lista que cambia
     de orden entre recargas es difícil de leer y de probar, y el dominio no
     promete ninguno. */
  /* El principal primero, luego los activos y dentro alfabético: quien abre
     esta pantalla busca casi siempre a alguien concreto, pero el principal es
     el único dato estructural de la lista y conviene que no haya que buscarlo. */
  filas.sort(
    (a, b) =>
      Number(b.isPrincipal) - Number(a.isPrincipal) ||
      Number(b.status === "activo") - Number(a.status === "activo") ||
      a.fullName.localeCompare(b.fullName),
  );

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Quién más de tu empresa puede entrar en esta consola."
        actions={
          <Button asChild>
            <Link href="/admin/usuarios/nuevo">
              <UserPlus aria-hidden="true" />
              Dar de alta
            </Link>
          </Button>
        }
      />

      {/* **FR-AD-USR-4** y **FR-AD-USR-11** juntos, porque por separado
          engañan: «todos pueden lo mismo» sin la excepción hace creer que
          cualquiera puede dar de alta usuarios, y la excepción sola hace creer
          que hay perfiles que ajustar. */}
      <Alert variant="info" title="Esta pantalla es solo tuya" className="mb-12">
        Eres el administrador principal: nadie más de tu empresa ve esta sección ni puede dar de
        alta, editar o desactivar usuarios administradores.
      </Alert>

      <UsuariosList rows={filas} />
    </>
  );
}
