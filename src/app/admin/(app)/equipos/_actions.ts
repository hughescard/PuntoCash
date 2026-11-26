"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/features/admin/session-server";
import { SCOPE_CONTEXT } from "@/features/network/assignments";
import { registrarEvento } from "@/features/network/audit";
import {
  desvincularEquipo,
  identificarReto,
  renombrarEquipo,
  vincularEquipo,
  type RetoIdentificado,
  type RetoPresentado,
  type TerminalKind,
} from "@/features/network/devices";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { mensaje } from "../mensajes";

/**
 * Las escrituras de §3 (Equipos): **vincular** y **desvincular**.
 *
 * Vincular va en dos actos, y por eso son dos acciones: identificar el equipo
 * que presentó el reto, y atarlo a su objeto. La pantalla no puede pedir el
 * objeto antes de saber qué está vinculando (**FR-AD-EQ-18**), y el reto se
 * revalida al canjear, no al leerlo (**FR-AD-EQ-22**).
 *
 * El alcance lo comprueba el dominio aunque la pantalla ya haya filtrado
 * (**A1**, **FR-AD-EQ-3**), y cada desvinculación deja su evento de auditoría
 * con quién, cuándo y sobre qué (**FR-AD-EQ-4**, **RP-21**).
 */

export type ResultadoAccion = { ok: true; mensaje: string } | { ok: false; error: string } | null;

/**
 * Los rechazos, dichos en el idioma del negocio (**FR-AD-STATE-4**, **R10**).
 *
 * Los tres que significan «eso no es tuyo o no existe» comparten mensaje a
 * propósito: distinguirlos convertiría la pantalla en un directorio de los
 * equipos de otras empresas (**FR-AD-NAV-2**).
 */


export async function desvincularEquipoAction(
  _previo: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("equipos", "sesion-terminada") };

  const terminalId = String(formData.get("equipo") ?? "");

  /* Se lee **antes** de desvincular y por la vista con alcance: después ya no
     está en el registro, y para el evento de auditoría hacen falta su sede y
     su caja. */
  const red = redEnAlcance(session.scope);
  const equipo = red.equipo(terminalId);

  const resultado = desvincularEquipo(session.scope, SCOPE_CONTEXT, terminalId);
  if (!resultado.ok) return { ok: false, error: mensaje("equipos", resultado.reason) };

  const sede = red.sede(resultado.value.branchId);
  const caja = equipo?.registerId ? red.cajasConHistorico(resultado.value.branchId).find((c) => c.id === equipo.registerId) : undefined;

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: resultado.value.kind === "caja" ? "equipo-caja.desvinculado" : "kiosco.desvinculado",
    subject: `${resultado.value.id} · ${caja ? `${caja.name} · ` : ""}${sede?.name ?? ""}`.trim(),
    branchId: resultado.value.branchId,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");

  return {
    ok: true,
    mensaje:
      resultado.value.kind === "caja"
        ? `${caja?.name ?? "La caja"} se queda sin equipo. El terminal ya muestra su pantalla de vinculación.`
        : "El kiosco queda desvinculado y ya muestra su pantalla de vinculación.",
  };
}

/**
 * Cambiar el rótulo de un equipo ya vinculado (**FR-AD-EQ-30**).
 *
 * No toca el vínculo ni el identificador del equipo: es el nombre con el que
 * la consola lo muestra. Por eso no pide motivo —no hay nada que deshacer— y
 * deja su evento de auditoría como el resto de las escrituras de la sección.
 */
export async function renombrarEquipoAction(
  _previo: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("equipos", "sesion-terminada") };

  const terminalId = String(formData.get("equipo") ?? "");
  const etiqueta = String(formData.get("etiqueta") ?? "");

  const resultado = renombrarEquipo(session.scope, SCOPE_CONTEXT, terminalId, etiqueta);
  if (!resultado.ok) return { ok: false, error: mensaje("equipos", resultado.reason) };

  const red = redEnAlcance(session.scope);
  const sede = red.sede(resultado.value.branchId);

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: resultado.value.kind === "caja" ? "equipo-caja.renombrado" : "kiosco.renombrado",
    subject: `${resultado.value.id} · ${resultado.value.label} · ${sede?.name ?? ""}`.trim(),
    branchId: resultado.value.branchId,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");

  return { ok: true, mensaje: `El equipo ahora se llama «${resultado.value.label}».` };
}

/* -------------------------------------------------------------------------
 * Vincular — §3.4, las dos vías
 * ---------------------------------------------------------------------- */

/**
 * Paso 1: qué equipo es. No vincula nada (ver `identificarReto`).
 *
 * Cuando el código **no coincide con nada** no se sabe si quien lo teclea
 * tiene delante una caja o un kiosco, así que el texto es neutro —«ningún
 * equipo pendiente»— (**FR-AD-EQ-20**).
 */
export type ResultadoIdentificacion =
  | { ok: true; reto: RetoIdentificado }
  | { ok: false; error: string };



export async function identificarRetoAction(
  reto: RetoPresentado,
): Promise<ResultadoIdentificacion> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("equipos", "sesion-terminada") };

  const resultado = identificarReto(reto);
  if (resultado.ok) return { ok: true, reto: resultado.value };

  if (resultado.reason === "equipo-ya-vinculado") {
    return { ok: false, error: mensaje("equipos", "equipo-ya-vinculado") };
  }
  return { ok: false, error: mensaje("equipos", "codigo-no-coincide") };
}

/**
 * Paso 2: a qué objeto. El dominio **revalida el equipo aquí**, no en el paso
 * 1 (**FR-AD-EQ-22**): mientras el administrador elegía la sede pueden
 * haberlo vinculado por otra vía, y entonces esto se rechaza en vez de
 * aplicarse. Al vincular, el servidor le da al equipo su identificador.
 *
 * El alcance lo comprueba el dominio aunque la pantalla solo haya ofrecido
 * sedes propias (**A1**, **FR-AD-EQ-7**), y cada vinculación deja su evento
 * de auditoría (**FR-AD-EQ-4**, **RP-21**).
 */
export type ResultadoVinculacion =
  | { ok: true; equipo: string; objeto: string; sede: string; kind: TerminalKind }
  | { ok: false; error: string };


export async function vincularEquipoAction(entrada: {
  reto: RetoPresentado;
  branchId: string;
  registerId?: string;
  /** El rótulo con el que la consola nombrará al equipo (**FR-AD-EQ-30**). */
  etiqueta?: string;
}): Promise<ResultadoVinculacion> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("equipos", "sesion-terminada") };

  const resultado = vincularEquipo(session.scope, SCOPE_CONTEXT, {
    reto: entrada.reto,
    branchId: entrada.branchId,
    ...(entrada.registerId ? { registerId: entrada.registerId } : {}),
    ...(entrada.etiqueta?.trim() ? { label: entrada.etiqueta.trim() } : {}),
    by: session.user.fullName,
  });

  /* Cada rechazo se dice con su código del catálogo (`mensajes.ts`). Uno se
     precisa con lo que en este paso ya se sabe: qué caja tiene ya equipo
     (**FR-AD-EQ-8**). */
  if (!resultado.ok) {
    if (resultado.reason === "caja-ya-vinculada" && entrada.registerId) {
      const caja = redEnAlcance(session.scope)
        .cajasConHistorico(entrada.branchId)
        .find((c) => c.id === entrada.registerId);
      if (caja) {
        return { ok: false, error: mensaje("equipos", "caja-ya-vinculada", { caja: `La ${caja.name}` }) };
      }
    }
    return {
      ok: false,
      error: mensaje(
        "equipos",
        resultado.reason,
        { equipo: "equipo", caja: "Esa caja" },
      ),
    };
  }

  const red = redEnAlcance(session.scope);
  const sede = red.sede(resultado.value.branchId);
  const caja = resultado.value.registerId
    ? red.cajasConHistorico(resultado.value.branchId).find((c) => c.id === resultado.value.registerId)
    : undefined;

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: resultado.value.kind === "caja" ? "equipo-caja.vinculado" : "kiosco.vinculado",
    subject: `${resultado.value.id} · ${caja ? `${caja.name} · ` : ""}${sede?.name ?? ""}`.trim(),
    branchId: resultado.value.branchId,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");

  return {
    ok: true,
    kind: resultado.value.kind,
    equipo: resultado.value.id,
    objeto: caja?.name ?? "Kiosco de autoservicio",
    sede: sede?.name ?? "",
  };
}
