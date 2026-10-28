import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui";
import { GLOBAL_SCOPE } from "@/features/network/scope";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { SEDES } from "@/features/network/sedes";
import { OPERATORS } from "@/features/network/operators";
import { asignacionVigente, estadoDeSede } from "@/features/network/assignments";
import { municipioDeLocalidad, provinciaDeLocalidad } from "@/features/geography/provincias-de-cuba";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { fechaCorta } from "@/app/admin/(app)/jornadas/formato";
import { SedesList, type SedeRow } from "./sedes-list";

export const metadata: Metadata = {
  title: "Super administración · Sedes",
  robots: { index: false, follow: false },
};

/**
 * Sedes — todas las de la red, también las cerradas, que nunca se eliminan.
 *
 * Las columnas del requisito (código, nombre, municipio y provincia, estado,
 * operador, fecha de la asignación vigente, cajas activas, cajas con equipo y
 * trabajadores activos) van agrupadas en cinco, para que la tabla quepa a
 * 1440 sin desplazarse: la sede con su código y municipio, el operador con su
 * fecha, y las cajas activas con cuántas tienen equipo.
 */
export default async function SuperAdminSedesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSuperAdminSession();
  if (!session) redirect("/super-admin/login");
  const inicial = await searchParams;
  const red = redEnAlcance(GLOBAL_SCOPE);

  const filas: SedeRow[] = SEDES.map((sede) => {
    const tramo = asignacionVigente(sede.id);
    const operador = tramo ? OPERATORS.find((o) => o.id === tramo.operatorId) ?? null : null;
    const cajas = red.cajasActivas(sede.id);
    return {
      id: sede.id,
      codigo: sede.code,
      nombre: sede.name,
      municipio: municipioDeLocalidad(sede.locality),
      provincia: provinciaDeLocalidad(sede.locality),
      estado: estadoDeSede(sede),
      operadorId: operador?.id ?? null,
      operador: operador?.name ?? null,
      desde: tramo ? fechaCorta(tramo.startedAt) : null,
      desdeIso: tramo?.startedAt ?? null,
      cajas: cajas.length,
      conEquipo: cajas.filter((c) => red.cajaTieneEquipo(c.id)).length,
      trabajadores: red.trabajadores(sede.id).filter((w) => w.status === "activo").length,
    };
  });

  return (
    <>
      <PageHeader
        title="Sedes"
        description="Todas las sedes de la red, a quién están entregadas y cómo están montadas."
        actions={
          <Button asChild>
            <Link href="/super-admin/sedes/nueva">
              <Plus aria-hidden="true" />
              Nueva sede
            </Link>
          </Button>
        }
      />
      <SedesList rows={filas} inicial={inicial} />
    </>
  );
}
