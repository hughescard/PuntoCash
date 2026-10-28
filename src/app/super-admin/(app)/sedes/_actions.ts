"use server";

import { revalidatePath } from "next/cache";

import { registrarEvento } from "@/features/network/audit";
import { asignarSede } from "@/features/network/assignments";
import { telefonoValido } from "@/features/network/datos-de-sede";
import { NOMBRE_DEL_DIA, horarioDesdeFormulario, validarHorario, type Dia } from "@/features/network/horario";
import { findOperatorById } from "@/features/network/operators";
import { crearSede, findSedeByCode, isMotivoValido, MOTIVO_MIN_LENGTH } from "@/features/network/sedes";
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
