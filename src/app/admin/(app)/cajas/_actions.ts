"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/features/admin/session-server";
import { REGISTER_GUARDS } from "@/features/admin/register-guards";
import { SCOPE_CONTEXT } from "@/features/network/assignments";
import { registrarEvento } from "@/features/network/audit";
import {
  crearCaja,
  reactivarCaja,
  retirarCaja,
} from "@/features/network/registers";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { MOTIVO_MIN_LENGTH } from "@/features/network/sedes";
import { mensaje } from "../mensajes";

/**
 * Las escrituras de §4 (Cajas). Las tres ocurren en el servidor, con el
 * alcance de la sesión, y **el dominio vuelve a comprobarlo** aunque la
 * pantalla ya haya filtrado: que un desplegable solo ofrezca sedes propias es
 * comodidad, no control (**FR-AD-CAJA-5**, **A1**).
 *
 * Cada una deja su evento de auditoría (**FR-AD-CAJA-14**, **RP-21**).
 *
 * El nombre de la sede que va en ese evento se lee por `redEnAlcance`, igual
 * que en las pantallas: el dominio ya comprobó el alcance al escribir, así que
 * aquí no cambia el resultado — pero deja una sola forma de leer la red desde
 * `/admin`, y es la que `eslint.config.mjs` obliga a usar.
 */

export type ResultadoAccion = { ok: true; mensaje: string } | { ok: false; error: string } | null;

/**
 * Los rechazos del dominio, dichos en el idioma del negocio. Nunca sale de
 * aquí un nombre de campo ni un código interno (**FR-AD-STATE-4**, **R10**).
 *
 * Los dos que importan de verdad —jornada abierta y equipo vinculado— dicen
 * además **qué hacer**, porque las dos acciones que lo resuelven son del
 * propio administrador: el camino está entero en su mano (**A4**).
 */

export async function crearCajaAction(
  _previo: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("cajas", "sesion-terminada") };

  const branchId = String(formData.get("sede") ?? "");
  const name = String(formData.get("nombre") ?? "").trim();

  if (!branchId) return { ok: false, error: mensaje("cajas", "sede-requerida") };
  if (!name) return { ok: false, error: mensaje("cajas", "nombre-requerido") };

  const resultado = crearCaja(session.scope, SCOPE_CONTEXT, { branchId, name, createdBy: session.user.fullName });
  if (!resultado.ok) return { ok: false, error: mensaje("cajas", resultado.reason, { min: MOTIVO_MIN_LENGTH }) };

  const red = redEnAlcance(session.scope);
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "caja.alta",
    subject: `${resultado.value.name} · ${red.sede(branchId)?.name ?? ""}`.trim(),
    branchId,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");
  /* El paso siguiente es vincularle un equipo (**FR-AD-CAJA-7**): el listado
     lo dice al recibir este identificador. */
  redirect(`/admin/cajas?creada=${encodeURIComponent(resultado.value.id)}`);
}

export async function retirarCajaAction(
  _previo: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("cajas", "sesion-terminada") };

  const registerId = String(formData.get("caja") ?? "");
  const motivo = String(formData.get("motivo") ?? "");

  const resultado = retirarCaja(session.scope, SCOPE_CONTEXT, registerId, motivo, REGISTER_GUARDS);
  if (!resultado.ok) return { ok: false, error: mensaje("cajas", resultado.reason, { min: MOTIVO_MIN_LENGTH }) };

  const red = redEnAlcance(session.scope);
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "caja.retirada",
    subject: `${resultado.value.name} · ${red.sede(resultado.value.branchId)?.name ?? ""}`.trim(),
    branchId: resultado.value.branchId,
    operatorId: session.operator.id,
    reason: motivo.trim(),
  });

  revalidatePath("/admin", "layout");
  /* El nombre sale del resultado de la escritura: la caja que se retiró es
     exactamente esta, sin volver a buscarla. */
  return { ok: true, mensaje: `${resultado.value.name} queda retirada. Su histórico sigue accesible.` };
}

export async function reactivarCajaAction(
  _previo: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("cajas", "sesion-terminada") };

  const registerId = String(formData.get("caja") ?? "");

  const resultado = reactivarCaja(session.scope, SCOPE_CONTEXT, registerId);
  if (!resultado.ok) return { ok: false, error: mensaje("cajas", resultado.reason, { min: MOTIVO_MIN_LENGTH }) };

  const red = redEnAlcance(session.scope);
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "caja.reactivada",
    subject: `${resultado.value.name} · ${red.sede(resultado.value.branchId)?.name ?? ""}`.trim(),
    branchId: resultado.value.branchId,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");
  /* Reactivar no restaura ningún vínculo (**FR-AD-CAJA-12**), y decirlo aquí
     evita que alguien dé por hecho que la caja vuelve lista para operar. */
  return {
    ok: true,
    mensaje: `${resultado.value.name} vuelve a estar activa. Necesita que le vincules un equipo antes de operar.`,
  };
}
