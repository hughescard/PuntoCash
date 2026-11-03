"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { registrarEvento } from "@/features/network/audit";
import {
  MOTIVO_RESOLUCION_MIN,
  operadorDeLaSolicitud,
  resolverSolicitud,
  TIPO_DE_SOLICITUD,
} from "@/features/network/aprobaciones";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import { formatSignedAmount } from "@/lib/format";
import type { ResultadoResolver } from "@/app/admin/(app)/aprobaciones/_actions";

/**
 * PuntoCash resuelve una diferencia que nadie de la sede puede resolver
 * (**FR-SA-APR-3**). Mismo acto que en Admin: deja constancia, no toca la caja.
 */
export async function resolverHuerfanaAction(_previo: ResultadoResolver, formData: FormData): Promise<ResultadoResolver> {
  const id = String(formData.get("id") ?? "");
  const decision = formData.get("decision") === "rechazada" ? "rechazada" : "aprobada";
  const motivo = String(formData.get("motivo") ?? "");
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar.", motivo };

  const r = resolverSolicitud(session.scope, id, decision, motivo, session.user.fullName);
  if (!r.ok) {
    if (r.reason === "ya-resuelta" || r.reason === "no-es-huerfana") {
      revalidatePath(`/super-admin/aprobaciones/${id}`);
      redirect(`/super-admin/aprobaciones/${id}?${r.reason === "ya-resuelta" ? "yaResuelta" : "yaTieneQuien"}=1`);
    }
    if (r.reason === "motivo-corto") {
      return { ok: false, error: `Escribe el motivo, con al menos ${MOTIVO_RESOLUCION_MIN} caracteres.`, motivo };
    }
    return { ok: false, error: "No encontramos lo que buscabas.", motivo };
  }

  const s = r.value;
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: decision === "aprobada" ? "solicitud.aprobada" : "solicitud.rechazada",
    subject: `${TIPO_DE_SOLICITUD[s.tipo]} de ${formatSignedAmount(s.diferencia)} ${s.currency} · ${s.cajaNombre} · ${s.workerName}`,
    branchId: s.sedeId,
    operatorId: operadorDeLaSolicitud(s) ?? undefined,
    reason: s.resolucion!.motivo,
  });

  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/aprobaciones/${id}?resuelta=1`);
}
