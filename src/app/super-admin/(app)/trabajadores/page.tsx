import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/app-shell";
import { maskEmail } from "@/features/auth/two-factor";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { trabajadoresDeRed } from "@/features/super-admin/trabajadores";
import { fechaCorta } from "@/app/admin/(app)/jornadas/formato";
import { TrabajadoresDeRedList, type TrabajadorRow } from "./trabajadores-list";

export const metadata: Metadata = {
  title: "Super administración · Trabajadores",
  robots: { index: false, follow: false },
};

/**
 * Trabajadores de la red — **de solo lectura, entero**.
 *
 * No hay alta, ni edición, ni desactivación, ni asistencia de acceso, ni
 * siquiera deshabilitadas: a las personas las gestiona el administrador de su
 * sede, que es quien las conoce. Lo único que PuntoCash decide sobre un
 * trabajador es indirecto —suspender su sede o a su operador— y vive en §13.
 *
 * El correo sale enmascarado por el mismo `maskEmail` de la verificación en
 * dos pasos, igual que en Admin: que las dos consolas lo enmascaren igual es
 * parte de que se lea como el mismo dato.
 *
 * No hay columna de caja: un trabajador está adscrito a una sede y opera
 * cualquiera de sus cajas; la caja la determina el equipo en el que entra.
 */
export default async function SuperAdminTrabajadoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  const inicial = await searchParams;

  const filas: TrabajadorRow[] = trabajadoresDeRed().map(({ trabajador, sede, operador, bloqueo, ultimaJornada }) => ({
    id: trabajador.id,
    nombre: trabajador.fullName,
    identificador: trabajador.identifier,
    sedeId: sede.id,
    sede: sede.name,
    operadorId: operador?.id ?? null,
    operador: operador?.name ?? null,
    correo: maskEmail(trabajador.email),
    estado: trabajador.status,
    bloqueo,
    alta: fechaCorta(trabajador.createdAt),
    ultimaJornada: ultimaJornada
      ? {
          id: ultimaJornada.id,
          texto:
            ultimaJornada.estado === "abierta"
              ? `Abierta ahora · ${ultimaJornada.cajaNombre}`
              : `${fechaCorta(ultimaJornada.openedAt)} · ${ultimaJornada.cajaNombre}`,
          abierta: ultimaJornada.estado === "abierta",
        }
      : null,
  }));

  return (
    <>
      <PageHeader
        title="Trabajadores"
        description="Las personas que operan las cajas de la red. Las gestiona el administrador de cada sede; aquí solo se consultan."
      />
      <TrabajadoresDeRedList rows={filas} inicial={inicial} />
    </>
  );
}
