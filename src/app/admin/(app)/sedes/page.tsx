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
 * No hay alta, edición ni baja: las sedes las crea, edita y cierra PuntoCash
 * (**A3**, **FR-AD-SEDE-2**). Aquí solo se consultan.
 *
 * ── Lo que falta de FR-AD-SEDE-1, y por qué ──────────────────────────────
 * El requisito pide **código**, que ya existe en el dominio y encabeza el
 * listado, y **estado de la jornada de hoy**, que todavía no se conoce para
 * toda la red: los datos de caja son los de una sola caja simulada. No se
 * inventa. Una columna con un dato falso se copia igual que una con un dato
 * cierto, y este demo es la referencia que van a seguir quienes implementen.
 */
export default async function AdminSedesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

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
    };
  });

  return (
    <>
      <PageHeader
        title="Sedes"
        description="Las sucursales que administras. Los datos de cada una los gestiona PuntoCash."
      />

      {rows.length === 0 ? (
        <Alert variant="info" title="Todavía no tienes sedes asignadas">
          Cuando PuntoCash te asigne una, aparecerá aquí con sus cajas, sus equipos y su personal.
        </Alert>
      ) : (
        <SedesList rows={rows} />
      )}
    </>
  );
}
