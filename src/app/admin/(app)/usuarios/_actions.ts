"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/features/admin/session-server";
import { registrarEvento } from "@/features/network/audit";
import { redEnAlcance } from "@/features/network/scoped-reads";
import {
  cambiarCorreoUsuarioAdmin,
  crearUsuarioAdmin,
  desactivarUsuarioAdmin,
  editarUsuarioAdmin,
  esAdministradorPrincipal,
  reactivarUsuarioAdmin,
  transferirAdministradorPrincipal,
  type OperatorWriteDenial,
} from "@/features/network/operators";
import { mensaje } from "../mensajes";

/**
 * Las escrituras de §8 (Usuarios administradores).
 *
 * ── Aquí el alcance no se parece al de §7 ─────────────────────────────────
 * Un trabajador pertenece a una **sede**, así que leerlo y escribirlo exige
 * cruzar el alcance de sedes de la sesión. Un usuario administrador pertenece
 * al **operador**, que *es* el alcance: `requireOperatorScope` ya lo acota, y
 * el dominio comprueba además que el usuario sea de ese operador. Por eso aquí
 * no aparece `redEnAlcance` por ninguna parte, y no es un descuido.
 *
 * ── La guarda propia de esta sección ──────────────────────────────────────
 * Toda la sección es del **administrador principal** (**FR-AD-USR-11**), y
 * **al principal no lo desactiva nadie, ni él mismo** (**FR-AD-USR-13**). Las
 * dos reglas viven en el dominio, no solo en la pantalla.
 */

/** La credencial inicial, idéntica en forma y en garantía a la de §7. */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function credencialInicial(): string {
  let salida = "";
  for (let i = 0; i < 10; i += 1) {
    salida += ALFABETO.charAt(Math.floor(Math.random() * ALFABETO.length));
  }
  return `${salida.slice(0, 5)}-${salida.slice(5)}`;
}



/* -------------------------------------------------------------------------
 * Alta — FR-AD-USR-2 a FR-AD-USR-5
 * ---------------------------------------------------------------------- */

export interface ValoresDelAltaUsuario {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  correo: string;
  identificador: string;
  telefono: string;
}

/** Qué campo señalar cuando el rechazo del dominio pertenece a uno concreto. */
const CAMPO_DE_RECHAZO: Partial<Record<OperatorWriteDenial, "identificador" | "correo">> = {
  "identificador-duplicado": "identificador",
  "identificador-invalido": "identificador",
  "correo-duplicado": "correo",
};

export type ResultadoAltaUsuario =
  | { ok: true; usuarioId: string; nombre: string; identificador: string; credencial: string }
  | {
      ok: false;
      error: string;
      campo?: "identificador" | "correo" | "nombre" | "primer-apellido" | "telefono";
      valores: ValoresDelAltaUsuario;
    }
  | null;

export async function crearUsuarioAction(
  _previo: ResultadoAltaUsuario,
  formData: FormData,
): Promise<ResultadoAltaUsuario> {
  const session = await getAdminSession();
  const leer = (campo: string) => String(formData.get(campo) ?? "").trim();

  const valores: ValoresDelAltaUsuario = {
    nombre: leer("nombre"),
    primerApellido: leer("primer-apellido"),
    segundoApellido: leer("segundo-apellido"),
    correo: leer("correo"),
    identificador: leer("identificador"),
    telefono: leer("telefono"),
  };

  if (!session) {
    return { ok: false, error: mensaje("usuarios", "sesion-terminada"), valores };
  }

  const obligatorios = [
    { campo: "nombre", valor: valores.nombre },
    { campo: "primer-apellido", valor: valores.primerApellido },
    { campo: "correo", valor: valores.correo },
    { campo: "identificador", valor: valores.identificador },
    { campo: "telefono", valor: valores.telefono },
  ] as const;

  const vacio = obligatorios.find((c) => !c.valor);
  if (vacio) {
    return { ok: false, error: mensaje("usuarios", "campo-obligatorio"), campo: vacio.campo, valores };
  }

  /* **FR-AD-USR-3**: sin correo válido no habría segundo factor, y sin
     segundo factor no hay sesión **[R13]**. */
  if (!valores.correo.includes("@") || valores.correo.includes(" ")) {
    return { ok: false, error: mensaje("usuarios", "correo-invalido"), campo: "correo", valores };
  }

  const resultado = crearUsuarioAdmin(session.scope, session.user.id, {
    id: `adm-${Date.now().toString(36)}`,
    identifier: valores.identificador,
    fullName: `${valores.nombre} ${valores.primerApellido} ${valores.segundoApellido}`.trim(),
    email: valores.correo,
    phone: valores.telefono,
  });

  if (!resultado.ok) {
    const campo = CAMPO_DE_RECHAZO[resultado.reason];
    return campo
      ? { ok: false, error: mensaje("usuarios", resultado.reason), campo, valores }
      : { ok: false, error: mensaje("usuarios", resultado.reason), valores };
  }

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "usuario-admin.alta",
    subject: resultado.value.fullName,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");

  /* No redirige: lo siguiente que tiene que pasar es que alguien **lea la
     credencial y la entregue**, y eso no cabe en una fila (**FR-AD-USR-5**). */
  return {
    ok: true,
    usuarioId: resultado.value.id,
    nombre: resultado.value.fullName,
    identificador: resultado.value.identifier,
    credencial: credencialInicial(),
  };
}

/* -------------------------------------------------------------------------
 * Edición — FR-AD-USR-6
 * ---------------------------------------------------------------------- */

export interface ValoresDeEdicionUsuario {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  telefono: string;
}

export type ResultadoEdicionUsuario =
  | {
      ok: false;
      error: string;
      campo?: "nombre" | "primer-apellido" | "telefono";
      valores: ValoresDeEdicionUsuario;
    }
  | null;

export async function editarUsuarioAction(
  _previo: ResultadoEdicionUsuario,
  formData: FormData,
): Promise<ResultadoEdicionUsuario> {
  const session = await getAdminSession();
  const leer = (campo: string) => String(formData.get(campo) ?? "").trim();

  const usuarioId = leer("usuario");
  const valores: ValoresDeEdicionUsuario = {
    nombre: leer("nombre"),
    primerApellido: leer("primer-apellido"),
    segundoApellido: leer("segundo-apellido"),
    telefono: leer("telefono"),
  };

  if (!session) {
    return { ok: false, error: mensaje("usuarios", "sesion-terminada"), valores };
  }

  const obligatorios = [
    { campo: "nombre", valor: valores.nombre },
    { campo: "primer-apellido", valor: valores.primerApellido },
    { campo: "telefono", valor: valores.telefono },
  ] as const;

  const vacio = obligatorios.find((c) => !c.valor);
  if (vacio) {
    return { ok: false, error: mensaje("usuarios", "campo-obligatorio"), campo: vacio.campo, valores };
  }

  const resultado = editarUsuarioAdmin(session.scope, session.user.id, usuarioId, {
    fullName: `${valores.nombre} ${valores.primerApellido} ${valores.segundoApellido}`.trim(),
    phone: valores.telefono,
  });

  if (!resultado.ok) {
    return { ok: false, error: mensaje("usuarios", resultado.reason), valores };
  }

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "usuario-admin.editado",
    subject: `${resultado.value.fullName} · datos personales`,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");
  redirect(`/admin/usuarios/${usuarioId}`);
}

/* -------------------------------------------------------------------------
 * Las acciones de la ficha — FR-AD-USR-6 a FR-AD-USR-9
 * ---------------------------------------------------------------------- */

export type ResultadoAccionUsuario =
  | { ok: true; mensaje: string }
  | { ok: false; error: string }
  | null;

export async function cambiarCorreoUsuarioAction(
  _previo: ResultadoAccionUsuario,
  formData: FormData,
): Promise<ResultadoAccionUsuario> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("usuarios", "sesion-terminada") };

  const usuarioId = String(formData.get("usuario") ?? "");
  const correo = String(formData.get("correo") ?? "").trim();

  const resultado = cambiarCorreoUsuarioAdmin(session.scope, session.user.id, usuarioId, correo);
  if (!resultado.ok) return { ok: false, error: mensaje("usuarios", resultado.reason) };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "usuario-admin.editado",
    subject: `${resultado.value.user.fullName} · correo ${resultado.value.anterior} → ${resultado.value.user.email}`,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");

  const propio = resultado.value.user.id === session.user.id;
  return {
    ok: true,
    mensaje: propio
      ? `Tu próximo código de verificación irá a ${resultado.value.user.email}.`
      : `Los próximos códigos de ${resultado.value.user.fullName} irán a ${resultado.value.user.email}.`,
  };
}

export async function desactivarUsuarioAction(
  _previo: ResultadoAccionUsuario,
  formData: FormData,
): Promise<ResultadoAccionUsuario> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("usuarios", "sesion-terminada") };

  const usuarioId = String(formData.get("usuario") ?? "");

  /* El dominio recibe **quién** lo está haciendo, no lo deduce: es lo que
     hace cumplible **FR-AD-USR-13** sin que la pantalla sea la única guarda. */
  const resultado = desactivarUsuarioAdmin(session.scope, usuarioId, session.user.id);
  if (!resultado.ok) return { ok: false, error: mensaje("usuarios", resultado.reason) };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "usuario-admin.desactivado",
    subject: resultado.value.fullName,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");

  return {
    ok: true,
    mensaje: `${resultado.value.fullName} ya no puede entrar en esta consola. Lo que hizo queda registrado igual.`,
  };
}

export async function reactivarUsuarioAction(
  _previo: ResultadoAccionUsuario,
  formData: FormData,
): Promise<ResultadoAccionUsuario> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("usuarios", "sesion-terminada") };

  const usuarioId = String(formData.get("usuario") ?? "");

  const resultado = reactivarUsuarioAdmin(session.scope, session.user.id, usuarioId);
  if (!resultado.ok) return { ok: false, error: mensaje("usuarios", resultado.reason) };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "usuario-admin.reactivado",
    subject: resultado.value.fullName,
    operatorId: session.operator.id,
  });

  revalidatePath("/admin", "layout");

  return {
    ok: true,
    mensaje: `${resultado.value.fullName} vuelve a poder entrar en esta consola y operar todas las sedes de la empresa.`,
  };
}

/**
 * Regenerar la credencial — **FR-AD-USR-5**, con el tratamiento de §7.
 *
 * No escribe en el dominio: la credencial no se guarda en ninguna parte, así
 * que «no se puede volver a consultar» sigue siendo cierto por construcción.
 */
export type ResultadoCredencialUsuario =
  | { ok: true; nombre: string; identificador: string; credencial: string }
  | { ok: false; error: string }
  | null;

export async function regenerarCredencialUsuarioAction(
  _previo: ResultadoCredencialUsuario,
  formData: FormData,
): Promise<ResultadoCredencialUsuario> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("usuarios", "sesion-terminada") };

  /* FR-AD-USR-11: §8 entera es del principal, también esta acción. */
  if (!esAdministradorPrincipal(session.user.id)) {
    return { ok: false, error: mensaje("usuarios", "no-es-el-principal") };
  }
  const usuario = redEnAlcance(session.scope).usuario(String(formData.get("usuario") ?? ""));
  if (!usuario) {
    return { ok: false, error: mensaje("usuarios", "no-encontrada") };
  }

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "usuario-admin.editado",
    subject: `${usuario.fullName} · credencial regenerada`,
    operatorId: session.operator.id,
  });

  return {
    ok: true,
    nombre: usuario.fullName,
    identificador: usuario.identifier,
    credencial: credencialInicial(),
  };
}

/* -------------------------------------------------------------------------
 * Traspasar el papel de principal — FR-AD-USR-12
 * ---------------------------------------------------------------------- */

/**
 * **Quien lo traspasa pierde §8 en ese mismo instante.**
 *
 * El mensaje de éxito lo dice con todas sus letras, porque es la consecuencia
 * que nadie espera de una acción que suena a delegar: al cerrar el diálogo, la
 * sección desaparece de su menú y la ruta responde como inexistente.
 */
export async function transferirPrincipalAction(
  _previo: ResultadoAccionUsuario,
  formData: FormData,
): Promise<ResultadoAccionUsuario> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("usuarios", "sesion-terminada") };

  /* El diálogo vive en la ficha del principal —la propia—, así que el campo
     `usuario` es **quien traspasa** y el destino viene del selector. Leer
     `usuario` como destino hacía que el dominio rechazara con «no puedes
     traspasarte el papel a ti mismo», que es exactamente lo que ocurría. */
  const destinoId = String(formData.get("destino") ?? "");
  if (!destinoId) return { ok: false, error: mensaje("usuarios", "destino-requerido") };

  const resultado = transferirAdministradorPrincipal(session.scope, session.user.id, destinoId);
  if (!resultado.ok) return { ok: false, error: mensaje("usuarios", resultado.reason) };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "usuario-admin.editado",
    subject: `Administrador principal: ${resultado.value.anterior.fullName} → ${resultado.value.nuevo.fullName}`,
    operatorId: session.operator.id,
  });

  /* **Aquí no se revalida**, y es lo único de §8 que no lo hace.
     `revalidatePath("/admin", "layout")` rehace la página de debajo, y la
     página de debajo es §8 —que quien acaba de traspasar **ya no puede ver**—:
     la confirmación se sustituía por un «no encontramos lo que buscabas» antes
     de que le diera tiempo a leerla. Se deja que lea, y el botón «Ir a
     Inicio» navega: esa navegación vuelve a representar el shell en el
     servidor, así que el menú llega ya sin Usuarios. */

  return {
    ok: true,
    mensaje: `${resultado.value.nuevo.fullName} es ahora el administrador principal. Tú dejas de serlo: desde este momento no puedes administrar usuarios, y la sección desaparece de tu menú.`,
  };
}
