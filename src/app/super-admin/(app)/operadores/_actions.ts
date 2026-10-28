"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { registrarEvento } from "@/features/network/audit";
import { asignarSede, sedesDeOperador } from "@/features/network/assignments";
import { telefonoValido } from "@/features/network/datos-de-sede";
import { jornadasDeSede } from "@/features/network/jornadas";
import {
  administradorPrincipalDe,
  crearOperador,
  darDeBajaOperador,
  findOperatorById,
  OPERATORS,
  reactivarOperador,
  restablecerAccesoDelPrincipal,
  suspenderOperador,
  type OperatorWriteDenial,
} from "@/features/network/operators";
import { findSedeById, MOTIVO_MIN_LENGTH } from "@/features/network/sedes";
import { getSuperAdminSession } from "@/features/super-admin/session-server";

/**
 * Las escrituras de Operadores en la consola de PuntoCash.
 *
 * El alta crea el operador y **un único** usuario administrador —el principal
 * de su empresa—, y no asigna sedes. Los demás usuarios los crea el propio
 * operador desde su consola.
 *
 * Las acciones de la ficha vuelven a ella con `?hecho=`, como en Sedes; la
 * excepción es restablecer el acceso, que tiene que enseñar una credencial
 * una sola vez y por eso responde en su diálogo.
 */

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function credencialInicial(): string {
  let salida = "";
  for (let i = 0; i < 10; i += 1) salida += ALFABETO.charAt(Math.floor(Math.random() * ALFABETO.length));
  return `${salida.slice(0, 5)}-${salida.slice(5)}`;
}

const esCorreo = (v: string) => v.length > 3 && v.includes("@") && !v.includes(" ");

/** Qué campo señalar cuando el rechazo del dominio pertenece a uno concreto. */
const CAMPO_DE_RECHAZO: Partial<Record<OperatorWriteDenial, CampoAltaOperador>> = {
  "identificador-duplicado": "usuario-identificador",
  "identificador-invalido": "usuario-identificador",
  "correo-duplicado": "usuario-correo",
};

const MENSAJE: Record<OperatorWriteDenial, string> = {
  "alcance-insuficiente": "Esta acción solo la puede hacer PuntoCash.",
  "operador-no-encontrado": "No encontramos ese operador.",
  "operador-duplicado": "Ya existe ese operador.",
  "identificador-duplicado": "Ya hay un usuario con ese identificador de acceso.",
  "identificador-invalido": "El identificador es un nombre de usuario, no un correo: no lleva «@». Usa letras, números, punto, guion o guion bajo.",
  "correo-duplicado": "Ya hay un usuario con ese correo. Con el correo también se entra, así que no puede repetirse.",
  "motivo-requerido": `Escribe el motivo: al menos ${MOTIVO_MIN_LENGTH} caracteres.`,
  "ya-suspendido": "El operador ya estaba suspendido. Recarga para ver su estado.",
  "no-suspendido": "El operador no está suspendido. Recarga para ver su estado.",
  "dado-de-baja": "El operador está dado de baja.",
  "tiene-sedes": "Este operador administra sedes. Revoca esas asignaciones antes de darlo de baja.",
  "usuario-no-encontrado": "Este operador no tiene administrador principal.",
  "es-uno-mismo": "No se puede hacer sobre uno mismo.",
  "no-es-el-inicial": "Este operador no tiene usuario inicial.",
  "correo-invalido": "Escribe un correo electrónico válido.",
  "no-es-el-principal": "Solo el administrador principal puede hacerlo.",
  "es-el-principal": "Al administrador principal no lo desactiva nadie.",
  "destino-no-activo": "El destino no está activo.",
};

/* -------------------------------------------------------------------------
 * Alta
 * ---------------------------------------------------------------------- */

export type CampoAltaOperador =
  | "nombre"
  | "documento"
  | "contacto"
  | "telefono"
  | "correo"
  | "usuario-nombre"
  | "usuario-apellido"
  | "usuario-telefono"
  | "usuario-correo"
  | "usuario-identificador";

export type ResultadoAltaOperador =
  | { ok: true; operadorId: string; nombre: string; usuario: string; identificador: string; correo: string; credencial: string }
  | { ok: false; error: string; campo?: CampoAltaOperador }
  | null;

export async function crearOperadorAction(_p: ResultadoAltaOperador, formData: FormData): Promise<ResultadoAltaOperador> {
  const leer = (c: string) => String(formData.get(c) ?? "").trim();
  const falla = (error: string, campo?: CampoAltaOperador): ResultadoAltaOperador =>
    campo ? { ok: false, error, campo } : { ok: false, error };

  const session = await getSuperAdminSession();
  if (!session) return falla("Tu sesión ha terminado. Vuelve a entrar.");

  const nombre = leer("nombre");
  const tipoDoc = leer("tipo-documento");
  const numDoc = leer("documento").replace(/\s+/g, "");
  const contacto = leer("contacto");
  const telefono = leer("telefono");
  const correo = leer("correo");
  const uNombre = leer("usuario-nombre");
  const uApellido = leer("usuario-apellido");
  const uSegundo = leer("usuario-segundo-apellido");
  const uTelefono = leer("usuario-telefono");
  const uCorreo = leer("usuario-correo");
  const uIdent = leer("usuario-identificador");

  if (!nombre) return falla("Escribe el nombre o la razón social.", "nombre");
  if (OPERATORS.some((o) => o.name.trim().toLowerCase() === nombre.toLowerCase())) {
    return falla("Ya existe un operador con ese nombre.", "nombre");
  }
  /* NIT para empresas, CI para una persona natural, pasaporte para un
     extranjero (decisión de Claudia del 28/10). */
  if (!["NIT", "CI", "PASAPORTE"].includes(tipoDoc) || !/^[A-Za-z0-9-]{4,20}$/.test(numDoc)) {
    return falla("Escribe el número del documento, sin espacios.", "documento");
  }
  if (!contacto) return falla("Escribe la persona de contacto.", "contacto");
  if (!telefonoValido(telefono)) return falla("Escribe un teléfono válido, con su prefijo.", "telefono");
  if (!esCorreo(correo)) return falla("Escribe un correo electrónico válido.", "correo");

  if (!uNombre) return falla("Escribe el nombre.", "usuario-nombre");
  if (!uApellido) return falla("Escribe el primer apellido.", "usuario-apellido");
  if (!telefonoValido(uTelefono)) return falla("Escribe un teléfono válido, con su prefijo.", "usuario-telefono");
  /* Es el canal del código de verificación de cada inicio de sesión. */
  if (!esCorreo(uCorreo)) return falla("Escribe un correo válido: es donde recibirá su código de verificación.", "usuario-correo");
  if (!uIdent) return falla("Escribe el identificador de acceso.", "usuario-identificador");

  const sello = Date.now().toString(36);
  const r = crearOperador(session.scope, {
    id: `op-${sello}`,
    name: nombre,
    legalId: `${tipoDoc}-${numDoc}`,
    contactName: contacto,
    phone: telefono,
    email: correo,
    initialUser: {
      id: `adm-${sello}`,
      identifier: uIdent,
      fullName: `${uNombre} ${uApellido} ${uSegundo}`.trim(),
      email: uCorreo,
      phone: uTelefono,
    },
  });
  if (!r.ok) {
    const campo = CAMPO_DE_RECHAZO[r.reason];
    return campo ? falla(MENSAJE[r.reason], campo) : falla(MENSAJE[r.reason]);
  }

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "operador.alta",
    subject: `${r.value.operator.name} · usuario ${r.value.user.fullName}`,
    operatorId: r.value.operator.id,
  });
  revalidatePath("/super-admin", "layout");

  return {
    ok: true,
    operadorId: r.value.operator.id,
    nombre: r.value.operator.name,
    usuario: r.value.user.fullName,
    identificador: r.value.user.identifier,
    correo: r.value.user.email,
    credencial: credencialInicial(),
  };
}

/* -------------------------------------------------------------------------
 * Ficha
 * ---------------------------------------------------------------------- */

export type ResultadoAccionOperador = { ok: false; error: string } | null;

async function contexto(formData: FormData) {
  const session = await getSuperAdminSession();
  const operador = findOperatorById(String(formData.get("operador") ?? ""));
  const motivo = String(formData.get("motivo") ?? "").trim();
  return { session, operador, motivo };
}

export async function suspenderOperadorAction(_p: ResultadoAccionOperador, formData: FormData): Promise<ResultadoAccionOperador> {
  const { session, operador, motivo } = await contexto(formData);
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  if (!operador) return { ok: false, error: MENSAJE["operador-no-encontrado"] };

  const r = suspenderOperador(session.scope, operador.id, motivo, session.user.fullName);
  if (!r.ok) return { ok: false, error: MENSAJE[r.reason] };

  const sedes = sedesDeOperador(operador.id);
  const abiertas = sedes.reduce((n, s) => n + jornadasDeSede(s).filter((j) => j.closedAt === null).length, 0);
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "operador.suspendido",
    subject: operador.name,
    operatorId: operador.id,
    reason: motivo,
    after: `${sedes.length} sedes afectadas · ${abiertas} jornadas abiertas al suspender`,
  });
  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/operadores/${operador.id}?hecho=suspendido`);
}

export async function reactivarOperadorAction(_p: ResultadoAccionOperador, formData: FormData): Promise<ResultadoAccionOperador> {
  const { session, operador, motivo } = await contexto(formData);
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  if (!operador) return { ok: false, error: MENSAJE["operador-no-encontrado"] };

  const r = reactivarOperador(session.scope, operador.id, motivo);
  if (!r.ok) return { ok: false, error: MENSAJE[r.reason] };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "operador.reactivado",
    subject: operador.name,
    operatorId: operador.id,
    reason: motivo,
  });
  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/operadores/${operador.id}?hecho=reactivado`);
}

export async function darDeBajaOperadorAction(_p: ResultadoAccionOperador, formData: FormData): Promise<ResultadoAccionOperador> {
  const { session, operador, motivo } = await contexto(formData);
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  if (!operador) return { ok: false, error: MENSAJE["operador-no-encontrado"] };

  const sedes = sedesDeOperador(operador.id).length;
  const r = darDeBajaOperador(session.scope, operador.id, motivo, { sedesAsignadas: sedes });
  if (!r.ok) {
    return r.reason === "tiene-sedes"
      ? { ok: false, error: `Este operador administra ${sedes} ${sedes === 1 ? "sede" : "sedes"}. Revoca esas asignaciones antes de darlo de baja.` }
      : { ok: false, error: MENSAJE[r.reason] };
  }

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "operador.baja",
    subject: operador.name,
    operatorId: operador.id,
    reason: motivo,
  });
  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/operadores/${operador.id}?hecho=baja`);
}

export async function asignarSedeAOperadorAction(_p: ResultadoAccionOperador, formData: FormData): Promise<ResultadoAccionOperador> {
  const { session, operador, motivo } = await contexto(formData);
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  if (!operador) return { ok: false, error: MENSAJE["operador-no-encontrado"] };
  const sede = findSedeById(String(formData.get("sede") ?? ""));
  if (!sede) return { ok: false, error: "Elige una sede." };

  const r = asignarSede(session.scope, {
    branchId: sede.id,
    operatorId: operador.id,
    reason: motivo,
    id: `asg-${Date.now().toString(36)}`,
  });
  if (!r.ok) {
    const textos: Record<string, string> = {
      "motivo-requerido": MENSAJE["motivo-requerido"],
      "ya-asignada": "Esa sede ya tiene operador. Otra persona la acaba de asignar: recarga para ver su estado.",
      "operador-inactivo": "El operador no está activo.",
      "sede-cerrada": "Esa sede está cerrada.",
    };
    return { ok: false, error: textos[r.reason] ?? "No se pudo asignar la sede." };
  }

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "sede.asignada",
    subject: sede.name,
    branchId: sede.id,
    operatorId: operador.id,
    reason: motivo,
    before: "Sin operador asignado",
    after: operador.name,
  });
  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/operadores/${operador.id}?hecho=sede-asignada`);
}

/* -------------------------------------------------------------------------
 * Restablecer el acceso del principal
 * ---------------------------------------------------------------------- */

export type ResultadoRestablecer =
  | { ok: true; nombre: string; identificador: string; correo: string; credencial: string }
  | { ok: false; error: string }
  | null;

export async function restablecerAccesoAction(_p: ResultadoRestablecer, formData: FormData): Promise<ResultadoRestablecer> {
  const { session, operador, motivo } = await contexto(formData);
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  if (!operador) return { ok: false, error: MENSAJE["operador-no-encontrado"] };

  const actual = administradorPrincipalDe(operador.id);
  const correo = String(formData.get("correo") ?? "").trim() || actual?.email || "";
  const r = restablecerAccesoDelPrincipal(session.scope, operador.id, { email: correo, reason: motivo });
  if (!r.ok) return { ok: false, error: MENSAJE[r.reason] };

  const cambio = r.value.correoAnterior !== r.value.user.email;
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "operador.acceso-principal-restablecido",
    subject: `${operador.name} · ${r.value.user.fullName}`,
    operatorId: operador.id,
    reason: motivo,
    ...(cambio ? { before: r.value.correoAnterior, after: r.value.user.email } : {}),
  });
  /* Sin revalidar: el diálogo tiene que poder enseñar la credencial. La ficha
     se refresca al cerrarlo. */

  return {
    ok: true,
    nombre: r.value.user.fullName,
    identificador: r.value.user.identifier,
    correo: r.value.user.email,
    credencial: credencialInicial(),
  };
}
