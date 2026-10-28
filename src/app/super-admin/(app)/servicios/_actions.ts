"use server";

import { revalidatePath } from "next/cache";

import { registrarEvento } from "@/features/network/audit";
import { asignacionVigente } from "@/features/network/assignments";
import { fijarServicios, findSedeById, isMotivoValido, MOTIVO_MIN_LENGTH } from "@/features/network/sedes";
import { WORKER_SERVICES } from "@/features/operations/services";
import { getSuperAdminSession } from "@/features/super-admin/session-server";

/**
 * Habilitar o deshabilitar **un** servicio en **una** sede, desde la matriz.
 *
 * Deshabilitar lleva motivo: le quita algo a un operador. Habilitar, no.
 * El último servicio de una sede activa no se quita: dejaría una sucursal
 * abierta sin nada que ofrecer.
 */
export type ResultadoServicio = { ok: true; mensaje: string } | { ok: false; error: string } | null;

export async function cambiarServicioAction(_p: ResultadoServicio, formData: FormData): Promise<ResultadoServicio> {
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };

  const sede = findSedeById(String(formData.get("sede") ?? ""));
  if (!sede) return { ok: false, error: "No encontramos esa sede." };
  const servicioId = String(formData.get("servicio") ?? "");
  const servicio = WORKER_SERVICES.find((s) => s.id === servicioId && s.status === "available");
  if (!servicio) return { ok: false, error: "Ese servicio no está disponible en el producto." };
  const habilitar = formData.get("habilitar") === "1";
  const motivo = String(formData.get("motivo") ?? "").trim();

  const ya = sede.services.includes(servicio.id);
  if (ya === habilitar) {
    return { ok: false, error: `Otra persona acaba de ${habilitar ? "habilitarlo" : "deshabilitarlo"}. Recarga para ver el estado.` };
  }
  if (!habilitar && !isMotivoValido(motivo)) {
    return { ok: false, error: `Escribe el motivo: al menos ${MOTIVO_MIN_LENGTH} caracteres.` };
  }

  const nuevos = habilitar ? [...sede.services, servicio.id] : sede.services.filter((s) => s !== servicio.id);
  const r = fijarServicios(session.scope, sede.id, nuevos);
  if (!r.ok) {
    if (r.reason === "ultimo-servicio") {
      return { ok: false, error: "Es el único servicio de la sede. Una sede activa necesita al menos uno." };
    }
    if (r.reason === "sede-cerrada") return { ok: false, error: "La sede está cerrada." };
    return { ok: false, error: "No se pudo cambiar el servicio." };
  }

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: habilitar ? "servicio.habilitado" : "servicio.deshabilitado",
    subject: `${sede.name} · ${servicio.name}`,
    branchId: sede.id,
    operatorId: asignacionVigente(sede.id)?.operatorId,
    ...(habilitar ? {} : { reason: motivo }),
  });
  revalidatePath("/super-admin", "layout");

  return {
    ok: true,
    mensaje: habilitar
      ? `${servicio.name} habilitado en ${sede.name}.`
      : `${servicio.name} deshabilitado en ${sede.name}.`,
  };
}
