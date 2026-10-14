"use client";

import * as React from "react";

import {
  TwoFactorForm,
  TwoFactorHeading,
  type TwoFactorScreenCopy,
} from "@/components/patterns/two-factor-form";
import { abrirSesionAdmin, descartarAccesoAdmin } from "@/app/admin/_actions";

/**
 * Verificación en dos pasos de la consola de administración.
 *
 * El formulario es el compartido; lo propio de esta consola son los destinos,
 * el saludo y —esto sí es estructural— **qué ocurre al verificar**: la sesión
 * se abre en el servidor, mediante una acción, antes de navegar. Así el layout
 * de `(app)` puede decidir con la cookie ya puesta y nadie ve un rebote al
 * inicio de sesión inmediatamente después de haberse verificado.
 *
 * Lo que se le entrega a la acción es el **código**, no el usuario. El
 * servidor sabe de quién es el reto porque lo emitió él en el paso 1 y lo
 * guardó bajo una cookie `httpOnly`; lo único que le falta para abrir la
 * sesión es comprobar que el código es el que mandó. Si el código no cuadra
 * —o la pestaña se recargó entre la contraseña y el código, y ya no hay
 * reto— la acción no escribe nada, se navega igual, y el layout de `(app)`
 * devuelve al inicio de sesión, que es exactamente lo que hay que hacer.
 */
const ADMIN_2FA: TwoFactorScreenCopy = {
  loginHref: "/admin/login",
  afterVerification: "/admin/inicio",
  successTitle: "Verificación completada",
  successMessage: "Bienvenido a PuntoCash. Ya puedes administrar tus sedes.",
  assistance: "a PuntoCash",
  onVerified: async (code) => {
    await abrirSesionAdmin(code);
  },
  /* "Usar otra cuenta" cierra también el reto del servidor, no solo el de la
     pantalla: dejarlo vivo sería dejar abierta la posibilidad de canjearlo. */
  onDiscard: descartarAccesoAdmin,
};

export function AdminVerificationForm({
  servidorSinReto,
}: {
  /** Lo resuelve la pantalla leyendo la cookie del reto (ver `page.tsx`). */
  servidorSinReto: boolean;
}): React.JSX.Element | null {
  return <TwoFactorForm copy={ADMIN_2FA} servidorSinReto={servidorSinReto} />;
}

export function AdminVerificationHeading(): React.JSX.Element {
  return <TwoFactorHeading />;
}
