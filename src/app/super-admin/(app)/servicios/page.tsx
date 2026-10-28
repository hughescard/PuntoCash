import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/app-shell";
import { SEDES } from "@/features/network/sedes";
import { OPERATORS } from "@/features/network/operators";
import { asignacionVigente } from "@/features/network/assignments";
import { WORKER_SERVICES } from "@/features/operations/services";
import { municipioDeLocalidad, provinciaDeLocalidad } from "@/features/geography/provincias-de-cuba";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { MatrizDeServicios, type FilaDeServicios } from "./matriz-de-servicios";

export const metadata: Metadata = {
  title: "Super administración · Servicios",
  robots: { index: false, follow: false },
};

/**
 * Servicios — qué puede ofrecer cada sede.
 *
 * Una matriz de sedes por servicios con los **tres servicios disponibles**
 * (decisión del 28/10). Los del catálogo que todavía no tienen flujo no
 * ocupan columnas: se nombran debajo, porque no se pueden habilitar en
 * ninguna sede. Las sedes cerradas no están: no ofrecen nada.
 */
export default async function SuperAdminServiciosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  const inicial = await searchParams;

  const disponibles = WORKER_SERVICES.filter((s) => s.status === "available").map((s) => ({ id: s.id, nombre: s.name }));
  const proximos = WORKER_SERVICES.filter((s) => s.status !== "available").map((s) => s.name);

  const filas: FilaDeServicios[] = SEDES.filter((s) => s.status !== "cerrada").map((s) => {
    const opId = asignacionVigente(s.id)?.operatorId ?? null;
    return {
      id: s.id,
      nombre: s.name,
      codigo: s.code,
      municipio: municipioDeLocalidad(s.locality),
      provincia: provinciaDeLocalidad(s.locality),
      operadorId: opId,
      operador: opId ? OPERATORS.find((o) => o.id === opId)?.name ?? null : null,
      /* El mismo criterio que el dominio: solo a una sede con status «activa» le hace falta al menos un servicio. */
      activa: s.status === "activa",
      servicios: [...s.services],
    };
  });

  return (
    <>
      <PageHeader
        title="Servicios"
        description="Qué puede ofrecer cada sede. Lo que no está habilitado no aparece ni en sus cajas ni en su kiosco."
      />
      <MatrizDeServicios filas={filas} servicios={disponibles} proximos={proximos} inicial={inicial} />
    </>
  );
}
