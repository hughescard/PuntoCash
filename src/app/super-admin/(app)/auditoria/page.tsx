import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/app-shell";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { AuditoriaList } from "./auditoria-list";
import { filasDeAuditoria } from "./datos";

export const metadata: Metadata = {
  title: "Super administración · Auditoría",
  robots: { index: false, follow: false },
};

/**
 * Auditoría — el registro que hace verificable todo lo demás: quién hizo qué,
 * cuándo, sobre qué y por qué. De solo lectura **[RP-21]**.
 */
export default async function SuperAdminAuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  const inicial = await searchParams;

  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Cada acto de gobierno de la red, el de PuntoCash y el de los mercantes, con quién lo hizo y por qué. Es un registro: no se puede modificar ni borrar."
      />
      <AuditoriaList rows={filasDeAuditoria(session.user.isPrincipal)} inicial={inicial} />
    </>
  );
}
