import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { UserPlus } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { maskEmail } from "@/features/auth/two-factor";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { PUNTOCASH_USERS } from "@/features/super-admin/usuarios";
import { UsuariosSuperAdminList, type UsuarioSuperAdminRow } from "./usuarios-list";

export const metadata: Metadata = {
  title: "Administración de la red · Usuarios",
  robots: { index: false, follow: false },
};

/**
 * Usuarios de la consola de PuntoCash (FR-SA-USR).
 *
 * Solo el principal la ve. Para los demás la sección **no existe** —ruta
 * inexistente, sin entrada en el menú—, igual que en Admin de sede: quien no la
 * gobierna no necesita saber que está ahí.
 */
export default async function SuperAdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  if (!session.user.isPrincipal) notFound();

  const inicial = await searchParams;

  const filas: UsuarioSuperAdminRow[] = PUNTOCASH_USERS.map((usuario) => ({
    id: usuario.id,
    fullName: usuario.fullName,
    identifier: usuario.identifier,
    area: usuario.area,
    correo: maskEmail(usuario.email),
    status: usuario.status,
    isPrincipal: usuario.isPrincipal,
    alta: formatDate(new Date(usuario.createdAt)),
    ultimoAcceso: usuario.lastAccessAt ? formatDateTime(new Date(usuario.lastAccessAt)) : null,
    esYo: usuario.id === session.user.id,
  }));

  /* El principal primero, luego los activos, y dentro alfabético: el principal
     es el único dato estructural de la lista y conviene no tener que buscarlo. */
  filas.sort(
    (a, b) =>
      Number(b.isPrincipal) - Number(a.isPrincipal) ||
      Number(b.status === "activo") - Number(a.status === "activo") ||
      a.fullName.localeCompare(b.fullName, "es"),
  );

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Quién más puede entrar en la consola de PuntoCash."
        actions={
          <Button asChild>
            <Link href="/super-admin/usuarios/nuevo">
              <UserPlus aria-hidden="true" />
              Dar de alta
            </Link>
          </Button>
        }
      />

      <UsuariosSuperAdminList rows={filas} inicial={inicial} />
    </>
  );
}
