"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/features/admin/session-server";
import { registrarEvento } from "@/features/network/audit";
import { forzarCierre, MOTIVO_MIN } from "@/features/network/jornadas";
import { nombreDeJornada } from "./formato";
import { mensaje } from "../mensajes";

/** Forzar el cierre de una jornada — **FR-AD-JOR-7** a **FR-AD-JOR-15**. */

export type ResultadoForzar = { ok: false; error: string; motivo: string } | null;

export async function forzarCierreAction(_previo: ResultadoForzar, formData: FormData): Promise<ResultadoForzar> {
  const id = String(formData.get("id") ?? "");
  const motivo = String(formData.get("motivo") ?? "");
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("jornadas", "sesion-terminada"), motivo };

  const r = forzarCierre(session.scope, id, motivo, session.user.fullName);
  if (!r.ok) {
    if (r.reason === "ya-cerrada") {
      /* FR-AD-JOR-11: se rechaza y la pantalla se actualiza. El aviso va en la
         página y no en el diálogo, que al actualizarse ya no se representa
         porque la jornada no está abierta. */
      revalidatePath(`/admin/jornadas/${id}`);
      redirect(`/admin/jornadas/${id}?yaCerrada=1`);
    }
    if (r.reason === "motivo-corto") {
      return { ok: false, error: mensaje("jornadas", "motivo-corto", { min: MOTIVO_MIN }), motivo };
    }
    return { ok: false, error: mensaje("jornadas", r.reason), motivo };
  }

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "jornada.cierre-forzado",
    subject: `Jornada ${nombreDeJornada(r.value)}`,
    branchId: r.value.sedeId,
    operatorId: session.operator.id,
    reason: r.value.cierreForzado!.motivo,
  });

  revalidatePath("/admin", "layout");
  redirect(`/admin/jornadas/${id}?forzada=1`);
}
