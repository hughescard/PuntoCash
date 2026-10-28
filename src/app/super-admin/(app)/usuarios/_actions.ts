"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { registrarEvento } from "@/features/network/audit";
import { getSuperAdminSession } from "@/features/super-admin/session-server";
import {
  cambiarCorreoUsuarioPuntoCash,
  crearUsuarioPuntoCash,
  desactivarUsuarioPuntoCash,
  editarUsuarioPuntoCash,
  findPuntoCashUserById,
  reactivarUsuarioPuntoCash,
  transferirPrincipalPuntoCash,
  type PuntoCashUserDenial,
} from "@/features/super-admin/usuarios";

/**
 * Las escrituras de la sección Usuarios de la consola de PuntoCash.
 *
 * Toda la sección es del **principal** (FR-SA-USR). La pantalla ya la oculta a
 * los demás, pero el dominio vuelve a comprobarlo con quién actúa: la pantalla
 * es comodidad, el dominio es la guarda.
 *
 * La credencial inicial sigue el mismo formato y la misma garantía que en
 * Admin de sede: se muestra una sola vez y no se guarda en ninguna parte.
 */

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function credencialInicial(): string {
  let salida = "";
  for (let i = 0; i < 10; i += 1) {
    salida += ALFABETO.charAt(Math.floor(Math.random() * ALFABETO.length));
  }
  return `${salida.slice(0, 5)}-${salida.slice(5)}`;
}

const MENSAJES: Record<PuntoCashUserDenial, string> = {
  "no-es-el-principal": "Solo el principal puede administrar las cuentas de la consola.",
  "usuario-no-encontrado": "No encontramos esa cuenta. Puede que ya no exista.",
  "identificador-duplicado": "Ya hay una cuenta con ese identificador.",
  "identificador-invalido":
    "El identificador es un nombre de usuario, no un correo: no lleva «@». Usa letras, números, punto, guion o guion bajo.",
  "correo-duplicado": "Ya hay una cuenta con ese correo. Con el correo también se entra, así que no puede repetirse.",
  "es-el-principal": "El principal no se desactiva: sin él no habría quien diera de alta a otro.",
  "es-uno-mismo": "No puedes traspasarte el papel a ti mismo.",
  "destino-no-activo": "Solo se puede traspasar a una cuenta activa.",
  "motivo-requerido": "Escribe el motivo: tiene que tener al menos 10 caracteres.",
  "correo-invalido": "Escribe un correo electrónico válido.",
  "ya-activo": "Esta cuenta ya está activa.",
};

const SESION_TERMINADA = "Tu sesión ha terminado. Vuelve a entrar.";

/* -------------------------------------------------------------------------
 * Alta
 * ---------------------------------------------------------------------- */

export interface ValoresAltaSuperAdmin {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  correo: string;
  identificador: string;
  telefono: string;
  area: string;
}

/** Qué campo señalar cuando el rechazo del dominio pertenece a uno concreto. */
const CAMPO_DE_RECHAZO: Partial<Record<PuntoCashUserDenial, "identificador" | "correo">> = {
  "identificador-duplicado": "identificador",
  "identificador-invalido": "identificador",
  "correo-duplicado": "correo",
};

export type ResultadoAltaSuperAdmin =
  | { ok: true; usuarioId: string; nombre: string; identificador: string; credencial: string }
  | {
      ok: false;
      error: string;
      campo?: "identificador" | "correo" | "nombre" | "primer-apellido" | "telefono" | "area";
      valores: ValoresAltaSuperAdmin;
    }
  | null;

export async function crearUsuarioSuperAdminAction(
  _previo: ResultadoAltaSuperAdmin,
  formData: FormData,
): Promise<ResultadoAltaSuperAdmin> {
  const session = await getSuperAdminSession();
  const leer = (campo: string) => String(formData.get(campo) ?? "").trim();

  const valores: ValoresAltaSuperAdmin = {
    nombre: leer("nombre"),
    primerApellido: leer("primer-apellido"),
    segundoApellido: leer("segundo-apellido"),
    correo: leer("correo"),
    identificador: leer("identificador"),
    telefono: leer("telefono"),
    area: leer("area"),
  };

  if (!session) return { ok: false, error: SESION_TERMINADA, valores };

  const obligatorios = [
    { campo: "nombre", valor: valores.nombre },
    { campo: "primer-apellido", valor: valores.primerApellido },
    { campo: "correo", valor: valores.correo },
    { campo: "identificador", valor: valores.identificador },
    { campo: "telefono", valor: valores.telefono },
    { campo: "area", valor: valores.area },
  ] as const;

  const vacio = obligatorios.find((c) => !c.valor);
  if (vacio) {
    return { ok: false, error: "Completa este campo para continuar.", campo: vacio.campo, valores };
  }

  if (!valores.correo.includes("@") || valores.correo.includes(" ")) {
    return { ok: false, error: MENSAJES["correo-invalido"], campo: "correo", valores };
  }

  const resultado = crearUsuarioPuntoCash(session.user.id, {
    id: `sa-${Date.now().toString(36)}`,
    identifier: valores.identificador,
    fullName: `${valores.nombre} ${valores.primerApellido} ${valores.segundoApellido}`.trim(),
    email: valores.correo,
    phone: valores.telefono,
    area: valores.area,
  });

  if (!resultado.ok) {
    const campo = CAMPO_DE_RECHAZO[resultado.reason];
    return campo
      ? { ok: false, error: MENSAJES[resultado.reason], campo, valores }
      : { ok: false, error: MENSAJES[resultado.reason], valores };
  }

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "usuario-puntocash.alta",
    subject: resultado.value.fullName,
  });

  revalidatePath("/super-admin", "layout");

  return {
    ok: true,
    usuarioId: resultado.value.id,
    nombre: resultado.value.fullName,
    identificador: resultado.value.identifier,
    credencial: credencialInicial(),
  };
}

/* -------------------------------------------------------------------------
 * Edición de datos y correo
 * ---------------------------------------------------------------------- */

export interface ValoresEdicionSuperAdmin {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  telefono: string;
}

export type ResultadoEdicionSuperAdmin =
  | {
      ok: false;
      error: string;
      campo?: "nombre" | "primer-apellido" | "telefono";
      valores: ValoresEdicionSuperAdmin;
    }
  | null;

export async function editarUsuarioSuperAdminAction(
  _previo: ResultadoEdicionSuperAdmin,
  formData: FormData,
): Promise<ResultadoEdicionSuperAdmin> {
  const session = await getSuperAdminSession();
  const leer = (campo: string) => String(formData.get(campo) ?? "").trim();

  const usuarioId = leer("usuario");
  const valores: ValoresEdicionSuperAdmin = {
    nombre: leer("nombre"),
    primerApellido: leer("primer-apellido"),
    segundoApellido: leer("segundo-apellido"),
    telefono: leer("telefono"),
  };

  if (!session) return { ok: false, error: SESION_TERMINADA, valores };

  const obligatorios = [
    { campo: "nombre", valor: valores.nombre },
    { campo: "primer-apellido", valor: valores.primerApellido },
    { campo: "telefono", valor: valores.telefono },
  ] as const;
  const vacio = obligatorios.find((c) => !c.valor);
  if (vacio) {
    return { ok: false, error: "Completa este campo para continuar.", campo: vacio.campo, valores };
  }

  const resultado = editarUsuarioPuntoCash(session.user.id, usuarioId, {
    fullName: `${valores.nombre} ${valores.primerApellido} ${valores.segundoApellido}`.trim(),
    phone: valores.telefono,
  });
  if (!resultado.ok) return { ok: false, error: MENSAJES[resultado.reason], valores };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "usuario-puntocash.editado",
    subject: `${resultado.value.fullName} · datos personales`,
  });

  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/usuarios/${usuarioId}`);
}

export interface ResultadoAccionSuperAdmin {
  ok: boolean;
  error?: string;
  mensaje?: string;
}

export async function cambiarCorreoUsuarioSuperAdminAction(
  _previo: ResultadoAccionSuperAdmin | null,
  formData: FormData,
): Promise<ResultadoAccionSuperAdmin | null> {
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: SESION_TERMINADA };

  const usuarioId = String(formData.get("usuario") ?? "");
  const correo = String(formData.get("correo") ?? "").trim();

  const resultado = cambiarCorreoUsuarioPuntoCash(session.user.id, usuarioId, correo);
  if (!resultado.ok) return { ok: false, error: MENSAJES[resultado.reason] };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "usuario-puntocash.editado",
    subject: `${resultado.value.user.fullName} · correo ${resultado.value.anterior} → ${resultado.value.user.email}`,
  });

  revalidatePath("/super-admin", "layout");

  const propio = resultado.value.user.id === session.user.id;
  return {
    ok: true,
    mensaje: propio
      ? `Tu próximo código de verificación irá a ${resultado.value.user.email}.`
      : `Los próximos códigos de ${resultado.value.user.fullName} irán a ${resultado.value.user.email}.`,
  };
}

/* -------------------------------------------------------------------------
 * Estado: desactivar y reactivar, siempre con motivo
 * ---------------------------------------------------------------------- */

export async function desactivarUsuarioSuperAdminAction(
  _previo: ResultadoAccionSuperAdmin | null,
  formData: FormData,
): Promise<ResultadoAccionSuperAdmin | null> {
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: SESION_TERMINADA };

  const usuarioId = String(formData.get("usuario") ?? "");
  const motivo = String(formData.get("motivo") ?? "");

  const resultado = desactivarUsuarioPuntoCash(session.user.id, usuarioId, motivo);
  if (!resultado.ok) return { ok: false, error: MENSAJES[resultado.reason] };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "usuario-puntocash.desactivado",
    subject: resultado.value.fullName,
    reason: motivo.trim(),
  });

  revalidatePath("/super-admin", "layout");

  return {
    ok: true,
    mensaje: `${resultado.value.fullName} ya no puede entrar en la consola. Lo que hizo queda registrado igual.`,
  };
}

export async function reactivarUsuarioSuperAdminAction(
  _previo: ResultadoAccionSuperAdmin | null,
  formData: FormData,
): Promise<ResultadoAccionSuperAdmin | null> {
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: SESION_TERMINADA };

  const usuarioId = String(formData.get("usuario") ?? "");
  const motivo = String(formData.get("motivo") ?? "");

  const resultado = reactivarUsuarioPuntoCash(session.user.id, usuarioId, motivo);
  if (!resultado.ok) return { ok: false, error: MENSAJES[resultado.reason] };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "usuario-puntocash.reactivado",
    subject: resultado.value.fullName,
    reason: motivo.trim(),
  });

  revalidatePath("/super-admin", "layout");

  return {
    ok: true,
    mensaje: `${resultado.value.fullName} vuelve a poder entrar en la consola.`,
  };
}

/* -------------------------------------------------------------------------
 * Credencial y traspaso del principal
 * ---------------------------------------------------------------------- */

export type ResultadoCredencialSuperAdmin =
  | { ok: true; nombre: string; identificador: string; credencial: string }
  | { ok: false; error: string }
  | null;

export async function regenerarCredencialUsuarioSuperAdminAction(
  _previo: ResultadoCredencialSuperAdmin,
  formData: FormData,
): Promise<ResultadoCredencialSuperAdmin> {
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: SESION_TERMINADA };

  if (!session.user.isPrincipal) return { ok: false, error: MENSAJES["no-es-el-principal"] };

  const usuario = findPuntoCashUserById(String(formData.get("usuario") ?? ""));
  if (!usuario) return { ok: false, error: MENSAJES["usuario-no-encontrado"] };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "usuario-puntocash.editado",
    subject: `${usuario.fullName} · credencial regenerada`,
  });

  return {
    ok: true,
    nombre: usuario.fullName,
    identificador: usuario.identifier,
    credencial: credencialInicial(),
  };
}

/**
 * Quien lo traspasa pierde la sección en ese mismo instante. Por eso no se
 * revalida la página de debajo: la confirmación tiene que poder leerse, y el
 * botón «Ir a Inicio» navega y vuelve a representar el menú sin Usuarios.
 */
export async function transferirPrincipalSuperAdminAction(
  _previo: ResultadoAccionSuperAdmin | null,
  formData: FormData,
): Promise<ResultadoAccionSuperAdmin | null> {
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: SESION_TERMINADA };

  const destinoId = String(formData.get("destino") ?? "");
  if (!destinoId) return { ok: false, error: "Elige quién pasa a administrar las cuentas." };

  const resultado = transferirPrincipalPuntoCash(session.user.id, destinoId);
  if (!resultado.ok) return { ok: false, error: MENSAJES[resultado.reason] };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "usuario-puntocash.principal-traspasado",
    subject: `Principal: ${resultado.value.anterior.fullName} → ${resultado.value.nuevo.fullName}`,
  });

  return {
    ok: true,
    mensaje: `${resultado.value.nuevo.fullName} es ahora el principal. Tú dejas de serlo: desde este momento no puedes administrar las cuentas, y la sección desaparece de tu menú.`,
  };
}
