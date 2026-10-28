import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { OPERATORS } from "@/features/network/operators";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { resumenDeOperador } from "@/features/super-admin/operadores";
import { fechaCorta } from "@/app/admin/(app)/jornadas/formato";
import { OperadoresList, type OperadorRow } from "./operadores-list";

export const metadata: Metadata = {
  title: "Super administración · Operadores",
  robots: { index: false, follow: false },
};

/**
 * Operadores — las empresas a las que PuntoCash entrega sedes.
 *
 * Las columnas del requisito, sin volumen (decisión del 28/10): en su lugar,
 * cuántas operaciones han hecho este mes, atribuidas a quien operaba cada sede
 * en la fecha de cada operación.
 */
export default async function SuperAdminOperadoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  const inicial = await searchParams;
  const ahora = new Date();

  const filas: OperadorRow[] = OPERATORS.map((o) => {
    const r = resumenDeOperador(o, ahora);
    return {
      id: o.id,
      nombre: o.name,
      contacto: o.contactName,
      telefono: o.phone,
      estado: o.status,
      alta: fechaCorta(o.createdAt),
      sedes: r.sedes.length,
      usuariosActivos: r.usuariosActivos,
      trabajadores: r.trabajadoresActivos,
      equipos: r.equipos,
      operacionesDelMes: r.operacionesDelMes,
    };
  });

  return (
    <>
      <PageHeader
        title="Operadores"
        description="Las empresas a las que PuntoCash entrega sedes, y lo que han operado este mes."
        actions={
          <Button asChild>
            <Link href="/super-admin/operadores/nuevo">
              <Plus aria-hidden="true" />
              Nuevo operador
            </Link>
          </Button>
        }
      />
      <OperadoresList rows={filas} inicial={inicial} />
    </>
  );
}
