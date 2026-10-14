"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/features/admin/session-server";
import { SCOPE_CONTEXT } from "@/features/network/assignments";
import { registrarEvento } from "@/features/network/audit";
import {
  desvincularEquipo,
  identificarReto,
  vincularEquipo,
  type RetoIdentificado,
  type RetoPresentado,
  type TerminalKind,
  type TerminalWriteDenial,
} from "@/features/network/devices";
import { redEnAlcance } from "@/features/network/scoped-reads";

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
const MOTIVOS: Partial<Record<TerminalWriteDenial, string>> = {
  "alcance-global-prohibido": "Esta acción pertenece al administrador de la sede.",
  "fuera-de-alcance": "No encontramos lo que buscabas.",
  "equipo-no-encontrado": "No encontramos lo que buscabas.",
};

const GENERICO = "No se pudo desvincular. Vuelve a intentarlo.";

export async function desvincularEquipoAction(
  _previo: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." };

  const terminalId = String(formData.get("equipo") ?? "");

  /* Se lee **antes** de desvincular y por la vista con alcance: después ya no
     está en el registro, y para el evento de auditoría hacen falta su sede y
     su caja. */
  const red = redEnAlcance(session.scope);
  const equipo = red.equipo(terminalId);

  const resultado = desvincularEquipo(session.scope, SCOPE_CONTEXT, terminalId);
  if (!resultado.ok) return { ok: false, error: MOTIVOS[resultado.reason] ?? GENERICO };

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

/* -------------------------------------------------------------------------
 * Vincular — §3.4, las dos vías
 * ---------------------------------------------------------------------- */

/**
 * Paso 1: qué equipo es. No canjea el reto (ver `identificarReto`), así que
 * un administrador que se equivoca de código no gasta nada.
 *
 * Los textos de los rechazos son los que el kiosco y Worker ya especifican
 * (**FR-AD-EQ-20**). Con una diferencia que el documento no podía anticipar:
 * cuando el código **no coincide con nada** no se sabe si quien lo teclea
 * tiene delante una caja o un kiosco, porque no hay reto del que leer la
 * clase. Así que ese caso usa la redacción neutra —«ningún equipo
 * pendiente»—, y la variante del kiosco se reserva para cuando el reto sí se
 * encontró y lo que falló fue su vigencia.
 */
export type ResultadoIdentificacion =
  | { ok: true; reto: RetoIdentificado }
  | { ok: false; error: string };

const SIN_COINCIDENCIA =
  "El código no coincide con ningún equipo pendiente. Revisa el código que muestra el equipo.";

const CADUCADO: Record<TerminalKind, string> = {
  caja: "Ese código caducó. El equipo ya muestra uno nuevo.",
  kiosco: "Ese código caducó. El kiosco ya muestra uno nuevo.",
};

export async function identificarRetoAction(
  reto: RetoPresentado,
): Promise<ResultadoIdentificacion> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." };

  const resultado = identificarReto(reto);
  if (resultado.ok) return { ok: true, reto: resultado.value };

  if (resultado.reason === "codigo-caducado") {
    /* Aquí sí se conoce la clase: el reto se encontró, solo estaba vencido.
       Pero `identificarReto` no la devuelve en el rechazo, y añadirla sería
       decirle a quien prueba códigos qué clase de equipo acertó. Redacción
       neutra. */
    return { ok: false, error: CADUCADO.caja };
  }
  if (resultado.reason === "equipo-ya-vinculado") {
    return {
      ok: false,
      error: "Ese equipo ya está vinculado. Desvincúlalo antes de volver a vincularlo.",
    };
  }
  return { ok: false, error: SIN_COINCIDENCIA };
}

/**
 * Paso 2: a qué objeto. El dominio **revalida el reto aquí**, no en el paso 1
 * (**FR-AD-EQ-22**): los diez minutos pueden haberse agotado mientras el
 * administrador elegía la sede, y entonces esto se rechaza en vez de
 * aplicarse. Al acertar, el reto se consume (**FR-AD-EQ-23**).
 *
 * El alcance lo comprueba el dominio aunque la pantalla solo haya ofrecido
 * sedes propias (**A1**, **FR-AD-EQ-7**), y cada vinculación deja su evento
 * de auditoría (**FR-AD-EQ-4**, **RP-21**).
 */
export type ResultadoVinculacion =
  | { ok: true; equipo: string; objeto: string; sede: string; kind: TerminalKind }
  | { ok: false; error: string };

const MOTIVOS_VINCULAR: Record<TerminalWriteDenial, string> = {
  "alcance-global-prohibido": "Esta acción pertenece al administrador de la sede.",
  "fuera-de-alcance": "No encontramos lo que buscabas.",
  "sede-no-encontrada": "No encontramos lo que buscabas.",
  "caja-no-encontrada": "No encontramos lo que buscabas.",
  "equipo-no-encontrado": "No encontramos lo que buscabas.",
  "codigo-no-coincide": SIN_COINCIDENCIA,
  "codigo-caducado": "Ese código caducó mientras elegías. El equipo ya muestra uno nuevo.",
  "sede-cerrada": "Esa sede está cerrada y no admite equipos nuevos.",
  "caja-requerida": "Elige la caja a la que pertenece este equipo.",
  "caja-retirada": "Esa caja está retirada y no admite un equipo.",
  "caja-ya-vinculada":
    "Esa caja ya tiene un equipo vinculado. Desvincúlalo antes de vincular otro.",
  "equipo-ya-vinculado": "Ese equipo ya está vinculado. Desvincúlalo antes de volver a vincularlo.",
};

export async function vincularEquipoAction(entrada: {
  reto: RetoPresentado;
  branchId: string;
  registerId?: string;
}): Promise<ResultadoVinculacion> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." };

  const resultado = vincularEquipo(session.scope, SCOPE_CONTEXT, {
    reto: entrada.reto,
    branchId: entrada.branchId,
    ...(entrada.registerId ? { registerId: entrada.registerId } : {}),
    by: session.user.fullName,
  });

  /* `MOTIVOS_VINCULAR` cubre la unión completa de rechazos, así que no hay
     caso por defecto: un rechazo nuevo en el dominio deja de compilar aquí,
     que es exactamente lo que hay que notar. */
  if (!resultado.ok) return { ok: false, error: MOTIVOS_VINCULAR[resultado.reason] };

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
