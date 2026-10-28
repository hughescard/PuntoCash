"use server";

import { redirect } from "next/navigation";

import type {
  CampoContrasena,
  ResultadoCambioContrasena,
} from "@/components/patterns/cambiar-contrasena-form";
import { LARGO_MINIMO } from "@/features/auth/password-recovery";
import { registrarEvento } from "@/features/network/audit";
import { cambiarContrasenaSuperAdmin } from "@/features/super-admin/auth";
import { getSuperAdminSession } from "@/features/super-admin/session-server";

/** Mismos mensajes que el perfil de Admin de sede. */
const MENSAJES: Record<
  "actual-incorrecta" | "demasiado-corta" | "igual-a-la-actual" | "no-coinciden",
  { error: string; campo: CampoContrasena }
> = {
  "actual-incorrecta": { error: "La contraseña actual no es correcta.", campo: "actual" },
  "demasiado-corta": { error: `La contraseña necesita al menos ${LARGO_MINIMO} caracteres.`, campo: "nueva" },
  "igual-a-la-actual": { error: "La contraseña nueva tiene que ser distinta de la actual.", campo: "nueva" },
  "no-coinciden": { error: "Las dos contraseñas no son iguales.", campo: "repetida" },
};

/** Cambiar la propia contraseña. Actúa sobre quien tiene la sesión y nadie más. */
export async function cambiarContrasenaSuperAdminAction(
  _previo: ResultadoCambioContrasena,
  formData: FormData,
): Promise<ResultadoCambioContrasena> {
  const session = await getSuperAdminSession();
  if (!session) return { ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión para continuar." };

  const leer = (campo: string) => String(formData.get(campo) ?? "");
  const resultado = await cambiarContrasenaSuperAdmin(
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
    actorRole: "super-admin",
    type: "usuario-puntocash.contrasena-cambiada",
    subject: session.user.fullName,
  });

  redirect("/super-admin/perfil?contrasena=cambiada");
}
