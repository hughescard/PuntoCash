"use server";

import { registrarContrasenaRecuperada } from "@/features/admin/admin-auth";

/**
 * Guarda en el servidor la contraseña que alguien acaba de fijar al recuperar
 * su acceso — **FR-AD-ACC-8**.
 *
 * **Solo existe en la demostración.** El acceso de `/admin` se comprueba en el
 * servidor, y la pantalla de recuperación es de cliente: sin este puente, lo
 * que la persona fija se queda en su navegador y el inicio de sesión sigue
 * aceptando la contraseña anterior. En el producto no hace falta nada de esto,
 * porque quien fija la contraseña es el backend.
 *
 * No devuelve nada ni falla visiblemente: es un apunte del simulador, no un
 * paso del trámite, y la pantalla ya ha hecho lo suyo cuando llama aquí.
 */
export async function guardarContrasenaRecuperadaAction(
  cuenta: string,
  contrasena: string,
): Promise<void> {
  registrarContrasenaRecuperada(cuenta, contrasena);
}
