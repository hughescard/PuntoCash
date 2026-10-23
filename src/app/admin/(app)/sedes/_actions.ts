"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/features/admin/session-server";
import { registrarEvento } from "@/features/network/audit";
import {
  editarDatosDeContacto,
  type CampoDeContacto,
  type DatosDeContacto,
} from "@/features/network/datos-de-sede";
import {
  DIAS,
  NOMBRE_DEL_DIA,
  textoDeHorario,
  type Dia,
  type Franja,
  type HorarioSemanal,
} from "@/features/network/horario";
import { mensaje } from "../mensajes";

/**
 * Los datos de contacto de una sede — **FR-AD-SEDE-14**.
 *
 * El formulario manda el horario día por día: `lun-abierto` (casilla),
 * `lun-abre` y `lun-cierra` (horas en 24 h). Un día sin la casilla marcada es
 * un día cerrado, aunque traiga horas: se ignoran, porque el formulario las
 * conserva para cuando se vuelva a abrir y no deben contar.
 */


export type CampoDeSede = "direccion" | "municipio" | "telefono" | "horario";

export interface ValoresDeSede {
  direccion: string;
  municipio: string;
  telefono: string;
}

export type ResultadoDatosDeSede =
  | { ok: false; error: string; campo?: CampoDeSede; dia?: Dia; valores: ValoresDeSede }
  | null;

const NOMBRE_DEL_CAMBIO: Record<CampoDeContacto, string> = {
  direccion: "dirección",
  municipio: "municipio y provincia",
  telefono: "teléfono",
  horario: "horario",
};

function resumen(d: DatosDeContacto): string {
  return `${d.address}, ${d.locality} · ${d.phone} · ${textoDeHorario(d.horario)}`;
}

export async function editarDatosDeSedeAction(
  _previo: ResultadoDatosDeSede,
  formData: FormData,
): Promise<ResultadoDatosDeSede> {
  const leer = (campo: string) => String(formData.get(campo) ?? "").trim();
  const sedeId = leer("sede");
  const valores: ValoresDeSede = {
    direccion: leer("direccion"),
    municipio: leer("municipio"),
    telefono: leer("telefono"),
  };

  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("sedes", "sesion-terminada"), valores };

  const horario = Object.fromEntries(
    DIAS.map((dia): [Dia, Franja | null] => [
      dia,
      formData.get(`${dia}-abierto`) ? { abre: leer(`${dia}-abre`), cierra: leer(`${dia}-cierra`) } : null,
    ]),
  ) as HorarioSemanal;

  const resultado = editarDatosDeContacto(session.scope, sedeId, {
    address: valores.direccion,
    locality: valores.municipio,
    phone: valores.telefono,
    horario,
  });

  if (!resultado.ok) {
    switch (resultado.reason) {
      case "direccion-vacia":
        return { ok: false, error: mensaje("sedes", "direccion-vacia"), campo: "direccion", valores };
      case "municipio-vacio":
        return { ok: false, error: mensaje("sedes", "municipio-vacio"), campo: "municipio", valores };
      case "telefono-invalido":
        return {
          ok: false,
          error: mensaje("sedes", "telefono-invalido"),
          campo: "telefono",
          valores,
        };
      case "horario-invalido": {
        const h = resultado.horario;
        if (!h || h.motivo === "sin-dias") {
          return { ok: false, error: mensaje("sedes", "horario-sin-dias"), campo: "horario", valores };
        }
        const dia = NOMBRE_DEL_DIA[h.dia].toLowerCase();
        return {
          ok: false,
          error: mensaje("sedes", h.motivo === "cierra-antes" ? "horario-cierra-antes" : "horario-incompleto", { dia }),
          campo: "horario",
          dia: h.dia,
          valores,
        };
      }
      default:
        /* Fuera de alcance, inexistente o cerrada: la pantalla no ofrece el
           formulario en esos casos, así que llegar aquí es una sesión vieja. */
        return { ok: false, error: mensaje("sedes", resultado.reason), valores };
    }
  }

  const { sede, antes, cambios } = resultado.value;
  if (cambios.length > 0) {
    /* El antes y el después completos: es como PuntoCash ve una mudanza que
       entró como corrección (FR-AD-SEDE-14). */
    registrarEvento({
      actorId: session.user.id,
      actorName: session.user.fullName,
      actorRole: "admin-sede",
      type: "sede.editada",
      subject: `${sede.name} · ${cambios.map((c) => NOMBRE_DEL_CAMBIO[c]).join(", ")}`,
      branchId: sede.id,
      operatorId: session.operator.id,
      before: resumen(antes),
      after: resumen(sede),
    });
  }

  revalidatePath("/admin", "layout");
  redirect(`/admin/sedes/${sede.id}?guardado=${cambios.length > 0 ? "1" : "0"}`);
}
