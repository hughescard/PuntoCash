"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/features/admin/session-server";
import { registrarEvento } from "@/features/network/audit";
import { MOTIVO_RESOLUCION_MIN, resolverSolicitud, TIPO_DE_SOLICITUD } from "@/features/network/aprobaciones";
import { formatSignedAmount } from "@/lib/format";
import { mensaje } from "../mensajes";

/** Aprobar o rechazar una solicitud — **FR-AD-APR-7** a **FR-AD-APR-12**. */

export type ResultadoResolver = { ok: false; error: string; motivo: string } | null;

export async function resolverSolicitudAction(_previo: ResultadoResolver, formData: FormData): Promise<ResultadoResolver> {
  const id = String(formData.get("id") ?? "");
  const decision = formData.get("decision") === "rechazada" ? "rechazada" : "aprobada";
  const motivo = String(formData.get("motivo") ?? "");
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("aprobaciones", "sesion-terminada"), motivo };

  const r = resolverSolicitud(session.scope, id, decision, motivo, session.user.fullName);
  if (!r.ok) {
    if (r.reason === "ya-resuelta") {
      /* FR-AD-APR-11: otro administrador la resolvió entretanto. El aviso va
         en la página, no en el diálogo, que al actualizarse ya no se representa. */
      revalidatePath(`/admin/aprobaciones/${id}`);
      redirect(`/admin/aprobaciones/${id}?yaResuelta=1`);
    }
    if (r.reason === "motivo-corto") {
      return { ok: false, error: mensaje("aprobaciones", "motivo-corto", { min: MOTIVO_RESOLUCION_MIN }), motivo };
    }
    return { ok: false, error: mensaje("aprobaciones", r.reason), motivo };
  }

  const s = r.value;
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: decision === "aprobada" ? "solicitud.aprobada" : "solicitud.rechazada",
    subject: `${TIPO_DE_SOLICITUD[s.tipo]} de ${formatSignedAmount(s.diferencia)} ${s.currency} · ${s.cajaNombre} · ${s.workerName}`,
    branchId: s.sedeId,
    operatorId: session.operator.id,
    reason: s.resolucion!.motivo,
  });

  revalidatePath("/admin", "layout");
  redirect(`/admin/aprobaciones/${id}?resuelta=1`);
}
