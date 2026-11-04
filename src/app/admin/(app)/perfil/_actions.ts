"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { cambiarContrasenaAdmin } from "@/features/admin/admin-auth";
import { getAdminSession } from "@/features/admin/session-server";
import { LARGO_MINIMO } from "@/features/auth/password-recovery";
import { registrarEvento } from "@/features/network/audit";
import { editarDatosPropiosAdmin } from "@/features/network/operators";
import { mensaje } from "../mensajes";

/**
 * Las dos escrituras del perfil — **FR-AD-PERF-3** a **FR-AD-PERF-8**.
 *
 * Las dos actúan **sobre quien tiene la sesión y sobre nadie más**: ninguna
 * lee de la petición a qué usuario aplicarse. Es lo que separa el perfil de
 * §8, donde el principal actúa sobre otros, y lo que hace que no necesite la
 * llave de §8.
 */


/* -------------------------------------------------------------------------
 * Datos personales — FR-AD-PERF-3
 * ---------------------------------------------------------------------- */

export interface ValoresDelPerfil {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  telefono: string;
}

export type ResultadoEdicionPerfil =
  | {
      ok: false;
      error: string;
      campo?: "nombre" | "primer-apellido" | "telefono";
      valores: ValoresDelPerfil;
    }
  | null;

export async function editarPerfilAction(
  _previo: ResultadoEdicionPerfil,
  formData: FormData,
): Promise<ResultadoEdicionPerfil> {
  const session = await getAdminSession();
  const leer = (campo: string) => String(formData.get(campo) ?? "").trim();

  const valores: ValoresDelPerfil = {
    nombre: leer("nombre"),
    primerApellido: leer("primer-apellido"),
    segundoApellido: leer("segundo-apellido"),
    telefono: leer("telefono"),
  };

  if (!session) return { ok: false, error: mensaje("perfil", "sesion-terminada"), valores };

  const obligatorios = [
    { campo: "nombre", valor: valores.nombre },
    { campo: "primer-apellido", valor: valores.primerApellido },
    { campo: "telefono", valor: valores.telefono },
  ] as const;

  const vacio = obligatorios.find((c) => !c.valor);
  if (vacio) {
    return { ok: false, error: mensaje("perfil", "campo-obligatorio"), campo: vacio.campo, valores };
  }

  const resultado = editarDatosPropiosAdmin(session.scope, session.user.id, {
    fullName: `${valores.nombre} ${valores.primerApellido} ${valores.segundoApellido}`.trim(),
    phone: valores.telefono,
  });

  if (!resultado.ok) return { ok: false, error: mensaje("perfil", "error-inesperado"), valores };

  registrarEvento({
    actorId: session.user.id,
    actorName: resultado.value.fullName,
    actorRole: "admin-sede",
    type: "usuario-admin.editado",
    subject: `${resultado.value.fullName} · datos personales, desde su perfil`,
    operatorId: session.operator.id,
  });

  /* El layout entero, no solo esta ruta: el nombre está también en la
     cabecera y en el cajón del teléfono. */
  revalidatePath("/admin", "layout");
  redirect("/admin/perfil");
}

/* -------------------------------------------------------------------------
 * Contraseña — FR-AD-PERF-5 a FR-AD-PERF-8
 * ---------------------------------------------------------------------- */

import type {
  CampoContrasena,
  ResultadoCambioContrasena,
} from "@/components/patterns/cambiar-contrasena-form";

const MENSAJES: Record<
  "actual-incorrecta" | "demasiado-corta" | "igual-a-la-actual" | "no-coinciden",
  { error: string; campo: CampoContrasena }
> = {
  "actual-incorrecta": { error: mensaje("perfil", "actual-incorrecta"), campo: "actual" },
  "demasiado-corta": {
    error: mensaje("perfil", "demasiado-corta", { min: LARGO_MINIMO }),
    campo: "nueva",
  },
  "igual-a-la-actual": {
    error: mensaje("perfil", "igual-a-la-actual"),
    campo: "nueva",
  },
  "no-coinciden": { error: mensaje("perfil", "no-coinciden"), campo: "repetida" },
};

export async function cambiarContrasenaAction(
  _previo: ResultadoCambioContrasena,
  formData: FormData,
): Promise<ResultadoCambioContrasena> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: mensaje("perfil", "sesion-terminada") };

  /* Sin `trim`: en una contraseña un espacio es un carácter más. */
  const leer = (campo: string) => String(formData.get(campo) ?? "");

  const resultado = await cambiarContrasenaAdmin(
    session.user.identifier,
    leer("actual"),
    leer("nueva"),
    leer("repetida"),
  );

  if (resultado.status !== "ok") return { ok: false, ...MENSAJES[resultado.status] };

  /* Se registra que cambió, nunca a qué. */
  registrarEvento({
    actorId: session.user.id,
    actorName: session.user.fullName,
    actorRole: "admin-sede",
    type: "usuario-admin.contrasena-cambiada",
    subject: session.user.fullName,
    operatorId: session.operator.id,
  });

  /* **FR-AD-PERF-7**: la sesión desde la que se cambia sigue abierta. Volver
     al perfil con la confirmación es lo único que queda por hacer. */
  redirect("/admin/perfil?contrasena=cambiada");
}
