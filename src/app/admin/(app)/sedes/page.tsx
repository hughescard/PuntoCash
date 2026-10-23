import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/app-shell";
import { Alert } from "@/components/ui";
import { getAdminSession } from "@/features/admin/session-server";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { SedesList, type SedeRow } from "./sedes-list";

export const metadata: Metadata = {
  title: "Administración de sede · Sedes",
  robots: { index: false, follow: false },
};

/**
 * Sedes — **§6 del FRD**.
 *
 * Es la única sección de la consola que **siempre muestra el alcance completo**
 * (**FR-AD-SCOPE-4**): el selector de la cabecera no la filtra. Tiene sentido —
 * esta pantalla responde «qué sedes administro», y filtrarla por una sede la
 * convertiría en una lista de un elemento que no contesta esa pregunta.
 *
 * No hay alta ni baja: las sedes las crea y las cierra PuntoCash (**A3**,
 * **FR-AD-SEDE-2**). Desde aquí solo se editan sus datos de contacto —dirección,
 * teléfono y horario— en su ficha (**FR-AD-SEDE-14**).
 *
 * ── La jornada ────────────────────────────────────────────────────────────
 * **FR-AD-SEDE-1** pide el estado de la jornada de hoy. Una sede tiene varias
 * cajas y cada una su jornada, así que se cuentan: «2 de 3 abiertas».
 */
export default async function AdminSedesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const inicial = await searchParams;

  /* Todo lo que esta pantalla cuenta sale de la vista con alcance, no del
     dominio por identificador (`features/network/scoped-reads.ts`). */
  const red = redEnAlcance(session.scope);

  const rows: SedeRow[] = session.sedes.map((sede) => {
    const cajas = red.cajasActivas(sede.id);

    return {
      id: sede.id,
      code: sede.code,
      name: sede.name,
      locality: sede.locality,
      status: sede.status,
      cajasActivas: cajas.length,
      cajasSinEquipo: cajas.filter((caja) => !red.cajaTieneEquipo(caja.id)).length,
      kioscos: red.kioscos(sede.id).length,
      trabajadores: red.trabajadores(sede.id).filter((w) => w.status === "activo").length,
      cajasAbiertas: red.diaDeSede(sede.id)?.abiertas ?? 0,
    };
  });

  return (
    <>
      <PageHeader
        title="Sedes"
        description="Las sucursales que administras. Su código, su nombre y sus servicios los decide PuntoCash; la dirección, el municipio, el teléfono y el horario los mantienes tú."
      />

      {rows.length === 0 ? (
        <Alert variant="info" title="Todavía no tienes sedes asignadas">
          Cuando PuntoCash te asigne una, aparecerá aquí con sus cajas, sus equipos y su personal.
        </Alert>
      ) : (
        <SedesList rows={rows} inicial={inicial} />
      )}
    </>
  );
}
