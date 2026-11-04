"use server";

import { registrarContrasenaRecuperadaSuperAdmin } from "@/features/super-admin/auth";

/** Solo en la demostración: lleva al servidor la contraseña fijada (ver el gemelo de Admin). */
export async function guardarContrasenaRecuperadaSuperAdminAction(
  cuenta: string,
  contrasena: string,
): Promise<void> {
  registrarContrasenaRecuperadaSuperAdmin(cuenta, contrasena);
}
