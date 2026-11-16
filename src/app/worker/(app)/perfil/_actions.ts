"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ResultadoCambioContrasena } from "@/components/patterns/cambiar-contrasena-form";
import { LARGO_MINIMO } from "@/features/auth/password-recovery";
import { mensajeDeIdentificador, revisarIdentificador } from "@/features/auth/identificador";
import { registrarEvento } from "@/features/network/audit";
import { operadorVigente } from "@/features/network/assignments";
import { editarDatosPropiosTrabajador } from "@/features/network/workers";
import { cambiarContrasenaTrabajador } from "@/features/worker/acceso";
import { getContextoDeTrabajo } from "@/features/worker/sesion-servidor";

/**
 * Las dos escrituras del perfil del trabajador. Actúan **sobre quien tiene la
 * sesión y sobre nadie más**: ninguna lee de la petición a quién aplicarse.
 */

const SESION_TERMINADA = "Tu sesión terminó. Vuelve a entrar para guardar los cambios.";

export interface ValoresDeDatosPropios {
  usuario: string;
  telefono: string;
}

export type ResultadoDatosPropios =
  | { ok: false; error: string; campo?: "usuario" | "telefono"; valores: ValoresDeDatosPropios }
  | null;

export async function editarDatosPropiosAction(
  _previo: ResultadoDatosPropios,
  formData: FormData,
): Promise<ResultadoDatosPropios> {
  const valores: ValoresDeDatosPropios = {
    usuario: String(formData.get("usuario") ?? "").trim(),
    telefono: String(formData.get("telefono") ?? "").trim(),
  };
  const ctx = await getContextoDeTrabajo();
  if (!ctx) return { ok: false, error: SESION_TERMINADA, valores };

  const formato = revisarIdentificador(valores.usuario);
  if (formato) return { ok: false, error: mensajeDeIdentificador(formato), campo: "usuario", valores };

  const r = editarDatosPropiosTrabajador(ctx.worker.id, { identifier: valores.usuario, phone: valores.telefono });
  if (!r.ok) {
    switch (r.reason) {
      case "identificador-duplicado":
        return { ok: false, error: "Ese nombre de usuario ya lo usa otra persona. Elige otro.", campo: "usuario", valores };
      case "identificador-invalido":
        return { ok: false, error: "Ese nombre de usuario no es válido.", campo: "usuario", valores };
      case "telefono-invalido":
        return { ok: false, error: "Escribe un teléfono de al menos 8 cifras. Puede llevar +, espacios y guiones.", campo: "telefono", valores };
      default:
        return { ok: false, error: SESION_TERMINADA, valores };
    }
  }

  const { worker, antes } = r.value;
  const cambios: string[] = [];
  if (antes.identifier !== worker.identifier) cambios.push("nombre de usuario");
  if (antes.phone !== worker.phone) cambios.push("teléfono");
  if (cambios.length > 0) {
    registrarEvento({
      actorId: worker.id,
      actorName: worker.fullName,
      actorRole: "trabajador",
      type: "trabajador.datos-propios",
      subject: `${worker.fullName} · ${cambios.join(" y ")}, desde su perfil`,
      branchId: worker.branchId,
      operatorId: operadorVigente(worker.branchId) ?? undefined,
      object: { kind: "trabajador", id: worker.id },
      before: `usuario ${antes.identifier} · teléfono ${antes.phone}`,
      after: `usuario ${worker.identifier} · teléfono ${worker.phone}`,
    });
  }

  revalidatePath("/worker", "layout");
  redirect(`/worker/perfil?datos=${cambios.length > 0 ? "guardados" : "sin-cambios"}`);
}

const MENSAJES = {
  "actual-incorrecta": { error: "La contraseña actual no es correcta.", campo: "actual" },
  "demasiado-corta": { error: `La contraseña necesita al menos ${LARGO_MINIMO} caracteres.`, campo: "nueva" },
  "igual-a-la-actual": { error: "La contraseña nueva tiene que ser distinta de la actual.", campo: "nueva" },
  "no-coinciden": { error: "Las dos contraseñas no son iguales.", campo: "repetida" },
} as const;

export async function cambiarContrasenaTrabajadorAction(
  _previo: ResultadoCambioContrasena,
  formData: FormData,
): Promise<ResultadoCambioContrasena> {
  const ctx = await getContextoDeTrabajo();
  if (!ctx) return { ok: false, error: SESION_TERMINADA };

  /* Sin `trim`: en una contraseña un espacio es un carácter más. */
  const leer = (campo: string) => String(formData.get(campo) ?? "");
  const r = await cambiarContrasenaTrabajador(ctx.worker.id, leer("actual"), leer("nueva"), leer("repetida"));
  if (r.status !== "ok") return { ok: false, ...MENSAJES[r.status] };

  /* Se registra que cambió, nunca a qué. */
  registrarEvento({
    actorId: ctx.worker.id,
    actorName: ctx.worker.fullName,
    actorRole: "trabajador",
    type: "trabajador.contrasena-cambiada",
    subject: ctx.worker.fullName,
    branchId: ctx.worker.branchId,
    operatorId: operadorVigente(ctx.worker.branchId) ?? undefined,
    object: { kind: "trabajador", id: ctx.worker.id },
  });
  redirect("/worker/perfil?contrasena=cambiada");
}
