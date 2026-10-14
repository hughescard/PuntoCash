"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/features/admin/session-server";
import { registrarEvento } from "@/features/network/audit";
import {
  cambiarCorreoUsuarioAdmin,
  crearUsuarioAdmin,
  desactivarUsuarioAdmin,
  editarUsuarioAdmin,
  findAdminUserById,
  reactivarUsuarioAdmin,
  transferirAdministradorPrincipal,
  type OperatorWriteDenial,
} from "@/features/network/operators";

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
 * ── Las dos guardas que esta sección tiene de propias ─────────────────────
 * **Nadie se desactiva a sí mismo** (**FR-AD-USR-7**) y **no se desactiva al
 * último activo** (**FR-AD-USR-8**). Las dos viven en el dominio y devuelven
 * motivos distintos a propósito: dar el del último activo a quien solo intentó
 * desactivarse a sí mismo le daría una razón falsa.
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

const GENERICO = "No se pudo completar la acción. Vuelve a intentarlo.";

const MOTIVOS: Partial<Record<OperatorWriteDenial, string>> = {
  "alcance-insuficiente": "Esta acción pertenece al administrador de la empresa.",
  "operador-no-encontrado": "No encontramos lo que buscabas.",
  "usuario-no-encontrado": "No encontramos lo que buscabas.",
  "identificador-duplicado": "Ese identificador ya está en uso.",
  "correo-invalido": "Introduce un correo válido.",
  /* **FR-AD-USR-11** y **FR-AD-USR-12**. */
  "no-es-el-principal": "Esta sección pertenece al administrador principal de tu empresa.",
  "es-el-principal":
    "Al administrador principal no lo desactiva nadie. Traspasa el papel antes, si hace falta.",
  "es-uno-mismo": "No puedes traspasarte el papel a ti mismo.",
  "destino-no-activo":
    "Solo puedes traspasarlo a un administrador activo: uno desactivado dejaría a tu empresa sin nadie que administre usuarios.",
};

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
    return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión.", valores };
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
    return { ok: false, error: "Este campo es obligatorio.", campo: vacio.campo, valores };
  }

  /* **FR-AD-USR-3**: sin correo válido no habría segundo factor, y sin
     segundo factor no hay sesión **[R13]**. */
  if (!valores.correo.includes("@") || valores.correo.includes(" ")) {
    return { ok: false, error: "Introduce un correo válido.", campo: "correo", valores };
  }

  const resultado = crearUsuarioAdmin(session.scope, session.user.id, {
    id: `adm-${Date.now().toString(36)}`,
    identifier: valores.identificador,
    fullName: `${valores.nombre} ${valores.primerApellido} ${valores.segundoApellido}`.trim(),
    email: valores.correo,
    phone: valores.telefono,
  });

  if (!resultado.ok) {
    const campo = resultado.reason === "identificador-duplicado" ? "identificador" : undefined;
    return campo
      ? { ok: false, error: MOTIVOS[resultado.reason] ?? GENERICO, campo, valores }
      : { ok: false, error: MOTIVOS[resultado.reason] ?? GENERICO, valores };
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
    return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión.", valores };
  }

  const obligatorios = [
    { campo: "nombre", valor: valores.nombre },
    { campo: "primer-apellido", valor: valores.primerApellido },
    { campo: "telefono", valor: valores.telefono },
  ] as const;

  const vacio = obligatorios.find((c) => !c.valor);
  if (vacio) {
    return { ok: false, error: "Este campo es obligatorio.", campo: vacio.campo, valores };
  }

  const resultado = editarUsuarioAdmin(session.scope, session.user.id, usuarioId, {
    fullName: `${valores.nombre} ${valores.primerApellido} ${valores.segundoApellido}`.trim(),
    phone: valores.telefono,
  });

  if (!resultado.ok) {
    return { ok: false, error: MOTIVOS[resultado.reason] ?? GENERICO, valores };
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
  if (!session) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." };

  const usuarioId = String(formData.get("usuario") ?? "");
  const correo = String(formData.get("correo") ?? "").trim();

  const resultado = cambiarCorreoUsuarioAdmin(session.scope, session.user.id, usuarioId, correo);
  if (!resultado.ok) return { ok: false, error: MOTIVOS[resultado.reason] ?? GENERICO };

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
  if (!session) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." };

  const usuarioId = String(formData.get("usuario") ?? "");

  /* El dominio recibe **quién** lo está haciendo, no lo deduce: es lo que
     hace cumplible **FR-AD-USR-7** sin que la pantalla sea la única guarda. */
  const resultado = desactivarUsuarioAdmin(session.scope, usuarioId, session.user.id);
  if (!resultado.ok) return { ok: false, error: MOTIVOS[resultado.reason] ?? GENERICO };

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
  if (!session) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." };

  const usuarioId = String(formData.get("usuario") ?? "");

  const resultado = reactivarUsuarioAdmin(session.scope, session.user.id, usuarioId);
  if (!resultado.ok) return { ok: false, error: MOTIVOS[resultado.reason] ?? GENERICO };

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
    mensaje: `${resultado.value.fullName} vuelve a poder entrar en esta consola, con las mismas potestades que tú.`,
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
  if (!session) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." };

  const usuario = findAdminUserById(String(formData.get("usuario") ?? ""));
  if (!usuario || usuario.operatorId !== session.operator.id) {
    return { ok: false, error: "No encontramos lo que buscabas." };
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
  if (!session) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." };

  /* El diálogo vive en la ficha del principal —la propia—, así que el campo
     `usuario` es **quien traspasa** y el destino viene del selector. Leer
     `usuario` como destino hacía que el dominio rechazara con «no puedes
     traspasarte el papel a ti mismo», que es exactamente lo que ocurría. */
  const destinoId = String(formData.get("destino") ?? "");
  if (!destinoId) return { ok: false, error: "Elige a quién le traspasas la administración." };

  const resultado = transferirAdministradorPrincipal(session.scope, session.user.id, destinoId);
  if (!resultado.ok) return { ok: false, error: MOTIVOS[resultado.reason] ?? GENERICO };

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
