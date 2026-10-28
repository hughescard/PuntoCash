"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { registrarEvento } from "@/features/network/audit";
import {
  asignacionVigente,
  asignarSede,
  estadoDeSede,
  revocarAsignacion,
  type AssignmentWriteDenial,
} from "@/features/network/assignments";
import { jornadasDeSede } from "@/features/network/jornadas";
import { WORKER_SERVICES } from "@/features/operations/services";
import { telefonoValido } from "@/features/network/datos-de-sede";
import { NOMBRE_DEL_DIA, horarioDesdeFormulario, validarHorario, type Dia } from "@/features/network/horario";
import { findOperatorById } from "@/features/network/operators";
import {
  cerrarSede,
  crearSede,
  editarSede,
  findSedeByCode,
  findSedeById,
  fijarServicios,
  isMotivoValido,
  MOTIVO_MIN_LENGTH,
  reactivarSede,
  suspenderSede,
  type SedeWriteDenial,
} from "@/features/network/sedes";
import { PROVINCIAS_DE_CUBA } from "@/features/geography/provincias-de-cuba";
import { getSuperAdminSession } from "@/features/super-admin/session-server";

/**
 * Las escrituras de Sedes en la consola de PuntoCash.
 *
 * Alta: datos de la sede, servicios y, si se elige operador, la asignación
 * inicial con su motivo (decisión de Claudia del 28/10: todo en el mismo
 * formulario). Todo se comprueba **antes** de crear nada: una sede creada y
 * una asignación rechazada dejarían a medias lo que quien rellena el
 * formulario pidió como un solo acto.
 */

export type CampoDeAlta =
  | "codigo"
  | "nombre"
  | "direccion"
  | "provincia"
  | "municipio"
  | "telefono"
  | "horario"
  | "servicios"
  | "operador"
  | "motivo";

export interface ValoresDeAlta {
  codigo: string;
  nombre: string;
  direccion: string;
  provincia: string;
  municipio: string;
  telefono: string;
  servicios: string[];
  operador: string;
  motivo: string;
}

export type ResultadoAltaSede =
  | { ok: true; sedeId: string; nombre: string; codigo: string; operador: string | null }
  | { ok: false; error: string; campo?: CampoDeAlta; dia?: Dia; valores: ValoresDeAlta }
  | null;

/** Código de sede: letras y números, sin espacios. Lo que lo identifica en una conversación. */
const CODIGO = /^[A-Za-z0-9]{2,8}$/;

export async function crearSedeAction(_previo: ResultadoAltaSede, formData: FormData): Promise<ResultadoAltaSede> {
  const leer = (campo: string) => String(formData.get(campo) ?? "").trim();
  const valores: ValoresDeAlta = {
    codigo: leer("codigo").toUpperCase(),
    nombre: leer("nombre"),
    direccion: leer("direccion"),
    provincia: leer("provincia"),
    municipio: leer("municipio"),
    telefono: leer("telefono"),
    servicios: formData.getAll("servicio").map(String),
    operador: leer("operador"),
    motivo: leer("motivo"),
  };
  const falla = (error: string, campo?: CampoDeAlta, dia?: Dia): ResultadoAltaSede =>
    campo ? (dia ? { ok: false, error, campo, dia, valores } : { ok: false, error, campo, valores }) : { ok: false, error, valores };

  const session = await getSuperAdminSession();
  if (!session) return falla("Tu sesión ha terminado. Vuelve a entrar.");

  if (!valores.codigo) return falla("Escribe el código de la sede.", "codigo");
  if (!CODIGO.test(valores.codigo)) return falla("Usa de 2 a 8 letras o números, sin espacios.", "codigo");
  if (findSedeByCode(valores.codigo)) return falla("Ya existe una sede con ese código.", "codigo");
  if (!valores.nombre) return falla("Escribe el nombre de la sede.", "nombre");
  if (!valores.direccion) return falla("Escribe la dirección.", "direccion");
  if (!PROVINCIAS_DE_CUBA.includes(valores.provincia)) return falla("Elige la provincia.", "provincia");
  if (!valores.municipio) return falla("Escribe el municipio.", "municipio");
  if (!telefonoValido(valores.telefono)) return falla("Escribe un teléfono válido, con su prefijo.", "telefono");

  const horario = horarioDesdeFormulario(formData);
  const mal = validarHorario(horario);
  if (mal) {
    if (mal.motivo === "sin-dias") return falla("Marca al menos un día en que abra.", "horario");
    const dia = NOMBRE_DEL_DIA[mal.dia].toLowerCase();
    return mal.motivo === "cierra-antes"
      ? falla(`El ${dia} cierra antes de abrir.`, "horario", mal.dia)
      : falla(`Completa las horas del ${dia}.`, "horario", mal.dia);
  }

  if (valores.servicios.length === 0) return falla("Habilita al menos un servicio.", "servicios");

  const operador = valores.operador ? findOperatorById(valores.operador) : null;
  if (valores.operador) {
    if (!operador || operador.status !== "activo") return falla("Elige un operador activo.", "operador");
    if (!isMotivoValido(valores.motivo)) {
      return falla(`Escribe el motivo de la asignación: al menos ${MOTIVO_MIN_LENGTH} caracteres.`, "motivo");
    }
  }

  const creada = crearSede(session.scope, {
    id: `sede-${valores.codigo.toLowerCase()}`,
    code: valores.codigo,
    name: valores.nombre,
    address: valores.direccion,
    locality: `${valores.municipio}, ${valores.provincia}`,
    horario,
    phone: valores.telefono,
    services: valores.servicios,
  });
  if (!creada.ok) {
    return creada.reason === "codigo-duplicado"
      ? falla("Ya existe una sede con ese código.", "codigo")
      : falla("No se pudo crear la sede. Inténtalo de nuevo.");
  }
  const sede = creada.value;

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "sede.creada",
    subject: `${sede.name} (${sede.code})`,
    branchId: sede.id,
    after: `${sede.address}, ${sede.locality} · ${sede.phone} · ${sede.hours}`,
  });

  if (operador) {
    const asignada = asignarSede(session.scope, {
      branchId: sede.id,
      operatorId: operador.id,
      reason: valores.motivo,
      id: `asg-${Date.now().toString(36)}`,
    });
    /* Ya se comprobó todo lo que puede fallar; si aun así falla (otro super
       administrador suspendió al operador en este instante), la sede queda
       creada sin asignar y se dice. */
    if (!asignada.ok) {
      revalidatePath("/super-admin", "layout");
      return { ok: true, sedeId: sede.id, nombre: sede.name, codigo: sede.code, operador: null };
    }
    registrarEvento({
      actorId: session.user.id,
      actorName: session.user.fullName,
      actorRole: "super-admin",
      type: "sede.asignada",
      subject: sede.name,
      branchId: sede.id,
      operatorId: operador.id,
      reason: valores.motivo,
      before: "Sin operador asignado",
      after: operador.name,
    });
  }

  revalidatePath("/super-admin", "layout");
  return { ok: true, sedeId: sede.id, nombre: sede.name, codigo: sede.code, operador: operador?.name ?? null };
}

/* -------------------------------------------------------------------------
 * Ficha: editar los datos
 * ---------------------------------------------------------------------- */

/**
 * Código y nombre, siempre. Dirección, municipio y provincia, teléfono y
 * horario, **solo mientras la sede no tiene operador**: con operador, son del
 * mercante (decisión del 27/10). La comprobación se repite aquí aunque la
 * pantalla no muestre esos campos: una sesión vieja no debe poder saltársela.
 */
export type ResultadoEdicionSede = { ok: false; error: string; campo?: CampoDeAlta; dia?: Dia; valores: ValoresDeAlta } | null;

export async function editarSedeAction(_previo: ResultadoEdicionSede, formData: FormData): Promise<ResultadoEdicionSede> {
  const leer = (campo: string) => String(formData.get(campo) ?? "").trim();
  const sedeId = leer("sede");
  const valores: ValoresDeAlta = {
    codigo: leer("codigo").toUpperCase(),
    nombre: leer("nombre"),
    direccion: leer("direccion"),
    provincia: leer("provincia"),
    municipio: leer("municipio"),
    telefono: leer("telefono"),
    servicios: [],
    operador: "",
    motivo: "",
  };
  const falla = (error: string, campo?: CampoDeAlta, dia?: Dia): ResultadoEdicionSede =>
    campo ? (dia ? { ok: false, error, campo, dia, valores } : { ok: false, error, campo, valores }) : { ok: false, error, valores };

  const session = await getSuperAdminSession();
  if (!session) return falla("Tu sesión ha terminado. Vuelve a entrar.");
  const sede = findSedeById(sedeId);
  if (!sede) return falla("No encontramos esa sede.");
  if (sede.status === "cerrada") return falla("Una sede cerrada no se edita.");

  if (!valores.codigo) return falla("Escribe el código de la sede.", "codigo");
  if (!CODIGO.test(valores.codigo)) return falla("Usa de 2 a 8 letras o números, sin espacios.", "codigo");
  const otra = findSedeByCode(valores.codigo);
  if (otra && otra.id !== sede.id) return falla("Ya existe una sede con ese código.", "codigo");
  if (!valores.nombre) return falla("Escribe el nombre de la sede.", "nombre");

  const contacto = estadoDeSede(sede) === "sin-asignar";
  let cambios: Parameters<typeof editarSede>[2] = { code: valores.codigo, name: valores.nombre };
  if (contacto) {
    if (!valores.direccion) return falla("Escribe la dirección.", "direccion");
    if (!PROVINCIAS_DE_CUBA.includes(valores.provincia)) return falla("Elige la provincia.", "provincia");
    if (!valores.municipio) return falla("Escribe el municipio.", "municipio");
    if (!telefonoValido(valores.telefono)) return falla("Escribe un teléfono válido, con su prefijo.", "telefono");
    const horario = horarioDesdeFormulario(formData);
    const mal = validarHorario(horario);
    if (mal) {
      if (mal.motivo === "sin-dias") return falla("Marca al menos un día en que abra.", "horario");
      const dia = NOMBRE_DEL_DIA[mal.dia].toLowerCase();
      return mal.motivo === "cierra-antes"
        ? falla(`El ${dia} cierra antes de abrir.`, "horario", mal.dia)
        : falla(`Completa las horas del ${dia}.`, "horario", mal.dia);
    }
    cambios = {
      ...cambios,
      address: valores.direccion,
      locality: `${valores.municipio}, ${valores.provincia}`,
      phone: valores.telefono,
      horario,
    };
  }

  const antes = resumenDeSede(sede);
  const resultado = editarSede(session.scope, sede.id, cambios);
  if (!resultado.ok) {
    return resultado.reason === "codigo-duplicado" ? falla("Ya existe una sede con ese código.", "codigo") : falla(MENSAJE_SEDE[resultado.reason]);
  }
  const despues = resumenDeSede(resultado.value);
  if (antes !== despues) {
    registrarEvento({
      actorId: session.user.id,
      actorName: session.user.fullName,
      actorRole: "super-admin",
      type: "sede.editada",
      subject: resultado.value.name,
      branchId: sede.id,
      before: antes,
      after: despues,
    });
  }
  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/sedes/${sede.id}?guardado=${antes !== despues ? "1" : "0"}`);
}

function resumenDeSede(s: { code: string; name: string; address: string; locality: string; phone: string; hours: string }): string {
  return `${s.code} · ${s.name} · ${s.address}, ${s.locality} · ${s.phone} · ${s.hours}`;
}

/* -------------------------------------------------------------------------
 * Ficha: acciones con diálogo
 * ---------------------------------------------------------------------- */

/** Las acciones de la ficha devuelven solo el rechazo: al terminar, vuelven a la ficha con `?hecho=`. */
export type ResultadoAccionSede = { ok: false; error: string } | null;

const MENSAJE_SEDE: Record<SedeWriteDenial, string> = {
  "alcance-insuficiente": "Esta acción solo la puede hacer PuntoCash.",
  "codigo-duplicado": "Ya existe una sede con ese código.",
  "sede-no-encontrada": "No encontramos esa sede.",
  "sede-cerrada": "La sede está cerrada.",
  "jornadas-abiertas": "Esta sede tiene jornadas abiertas. Deben cerrarse antes.",
  "ya-suspendida": "La sede ya estaba suspendida. Recarga para ver su estado.",
  "no-suspendida": "La sede no está suspendida. Recarga para ver su estado.",
  "motivo-requerido": `Escribe el motivo: al menos ${MOTIVO_MIN_LENGTH} caracteres.`,
  "sin-servicios": "Habilita al menos un servicio.",
  "ultimo-servicio": "Una sede activa necesita al menos un servicio.",
};

const MENSAJE_ASIGNACION: Record<AssignmentWriteDenial, string> = {
  "alcance-insuficiente": "Esta acción solo la puede hacer PuntoCash.",
  "sede-no-encontrada": "No encontramos esa sede.",
  "sede-cerrada": "La sede está cerrada.",
  "operador-no-encontrado": "No encontramos ese operador.",
  "operador-inactivo": "Ese operador no está activo.",
  "ya-asignada": "Esta sede ya tiene operador. Otra persona la acaba de asignar: recarga para ver su estado.",
  "sin-asignacion-vigente": "Esta sede ya no tiene operador. Otra persona acaba de revocarla: recarga para ver su estado.",
  "jornadas-abiertas": "Esta sede tiene jornadas abiertas. Deben cerrarse antes.",
  "motivo-requerido": `Escribe el motivo: al menos ${MOTIVO_MIN_LENGTH} caracteres.`,
};

async function contexto(formData: FormData) {
  const session = await getSuperAdminSession();
  const sede = findSedeById(String(formData.get("sede") ?? ""));
  const motivo = String(formData.get("motivo") ?? "").trim();
  return { session, sede, motivo };
}

function hayJornadasAbiertas(sedeId: string): boolean {
  return jornadasDeSede(sedeId).some((j) => j.closedAt === null);
}

export async function fijarServiciosAction(_p: ResultadoAccionSede, formData: FormData): Promise<ResultadoAccionSede> {
  const { session, sede, motivo } = await contexto(formData);
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  if (!sede) return { ok: false, error: MENSAJE_SEDE["sede-no-encontrada"] };

  const nuevos = formData.getAll("servicio").map(String);
  const quitados = sede.services.filter((x) => !nuevos.includes(x));
  const anadidos = nuevos.filter((x) => !sede.services.includes(x));
  if (quitados.length === 0 && anadidos.length === 0) return { ok: false, error: "No has cambiado ningún servicio." };
  /* Quitarle un servicio a una sede es una restricción, y como toda restricción
     de PuntoCash lleva motivo. Habilitar no lo necesita. */
  if (quitados.length > 0 && !isMotivoValido(motivo)) return { ok: false, error: MENSAJE_SEDE["motivo-requerido"] };

  const r = fijarServicios(session.scope, sede.id, nuevos);
  if (!r.ok) return { ok: false, error: MENSAJE_SEDE[r.reason] };

  const nombre = (id: string) => WORKER_SERVICES.find((x) => x.id === id)?.name ?? id;
  for (const id of anadidos) {
    registrarEvento({
      actorId: session.user.id,
      actorName: session.user.fullName,
      actorRole: "super-admin",
      type: "servicio.habilitado",
      subject: `${sede.name} · ${nombre(id)}`,
      branchId: sede.id,
    });
  }
  for (const id of quitados) {
    registrarEvento({
      actorId: session.user.id,
      actorName: session.user.fullName,
      actorRole: "super-admin",
      type: "servicio.deshabilitado",
      subject: `${sede.name} · ${nombre(id)}`,
      branchId: sede.id,
      reason: motivo,
    });
  }
  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/sedes/${sede.id}?hecho=servicios`);
}

export async function asignarSedeAction(_p: ResultadoAccionSede, formData: FormData): Promise<ResultadoAccionSede> {
  const { session, sede, motivo } = await contexto(formData);
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  if (!sede) return { ok: false, error: MENSAJE_SEDE["sede-no-encontrada"] };
  const operador = findOperatorById(String(formData.get("operador") ?? ""));
  if (!operador) return { ok: false, error: "Elige un operador." };

  const r = asignarSede(session.scope, {
    branchId: sede.id,
    operatorId: operador.id,
    reason: motivo,
    id: `asg-${Date.now().toString(36)}`,
  });
  if (!r.ok) return { ok: false, error: MENSAJE_ASIGNACION[r.reason] };

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
  redirect(`/super-admin/sedes/${sede.id}?hecho=asignada`);
}

export async function revocarAsignacionAction(_p: ResultadoAccionSede, formData: FormData): Promise<ResultadoAccionSede> {
  const { session, sede, motivo } = await contexto(formData);
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  if (!sede) return { ok: false, error: MENSAJE_SEDE["sede-no-encontrada"] };
  const vigente = asignacionVigente(sede.id);
  const operador = vigente ? findOperatorById(vigente.operatorId) : null;

  const r = revocarAsignacion(session.scope, sede.id, motivo, { hasOpenJornadas: hayJornadasAbiertas(sede.id) });
  if (!r.ok) return { ok: false, error: MENSAJE_ASIGNACION[r.reason] };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "sede.revocada",
    subject: sede.name,
    branchId: sede.id,
    operatorId: operador?.id,
    reason: motivo,
    before: operador?.name ?? "",
    after: "Sin operador asignado",
  });
  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/sedes/${sede.id}?hecho=revocada`);
}

export async function suspenderSedeAction(_p: ResultadoAccionSede, formData: FormData): Promise<ResultadoAccionSede> {
  const { session, sede, motivo } = await contexto(formData);
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  if (!sede) return { ok: false, error: MENSAJE_SEDE["sede-no-encontrada"] };

  const r = suspenderSede(session.scope, sede.id, motivo, session.user.fullName);
  if (!r.ok) return { ok: false, error: MENSAJE_SEDE[r.reason] };

  const abiertas = jornadasDeSede(sede.id).filter((j) => j.closedAt === null).length;
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "sede.suspendida",
    subject: sede.name,
    branchId: sede.id,
    operatorId: asignacionVigente(sede.id)?.operatorId,
    reason: motivo,
    after: `${abiertas} ${abiertas === 1 ? "jornada abierta" : "jornadas abiertas"} al suspender`,
  });
  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/sedes/${sede.id}?hecho=suspendida`);
}

export async function reactivarSedeAction(_p: ResultadoAccionSede, formData: FormData): Promise<ResultadoAccionSede> {
  const { session, sede, motivo } = await contexto(formData);
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  if (!sede) return { ok: false, error: MENSAJE_SEDE["sede-no-encontrada"] };

  const r = reactivarSede(session.scope, sede.id, motivo);
  if (!r.ok) return { ok: false, error: MENSAJE_SEDE[r.reason] };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "sede.reactivada",
    subject: sede.name,
    branchId: sede.id,
    operatorId: asignacionVigente(sede.id)?.operatorId,
    reason: motivo,
  });
  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/sedes/${sede.id}?hecho=reactivada`);
}

export async function cerrarSedeAction(_p: ResultadoAccionSede, formData: FormData): Promise<ResultadoAccionSede> {
  const { session, sede, motivo } = await contexto(formData);
  if (!session) return { ok: false, error: "Tu sesión ha terminado. Vuelve a entrar." };
  if (!sede) return { ok: false, error: MENSAJE_SEDE["sede-no-encontrada"] };

  const r = cerrarSede(session.scope, sede.id, motivo, { hasOpenJornadas: hayJornadasAbiertas(sede.id) });
  if (!r.ok) return { ok: false, error: MENSAJE_SEDE[r.reason] };

  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "super-admin",
    type: "sede.cerrada",
    subject: sede.name,
    branchId: sede.id,
    operatorId: asignacionVigente(sede.id)?.operatorId,
    reason: motivo,
  });
  revalidatePath("/super-admin", "layout");
  redirect(`/super-admin/sedes/${sede.id}?hecho=cerrada`);
}
