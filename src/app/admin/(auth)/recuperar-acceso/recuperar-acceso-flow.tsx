"use client";

import * as React from "react";

import {
  PasswordRecoveryForm,
  type RecuperacionCopy,
} from "@/components/patterns/password-recovery-form";
import { guardarContrasenaRecuperadaAction } from "./_actions";

/**
 * Recuperación de contraseña de la consola de administración —
 * **FR-AD-ACC-8**.
 *
 * Mismo flujo que Worker, y solo cambia a quién se le pide ayuda. Y ahí hay
 * una diferencia que importa y que **FR-AD-USR-11** decidió: a un trabajador
 * le ayuda su administrador de sede, pero a un administrador le ayuda **el
 * administrador principal de su empresa**, que es el único que puede
 * regenerarle la credencial. Si el que se quedó fuera es el propio principal,
 * la vía es PuntoCash.
 */
const ADMIN_RECUPERACION: RecuperacionCopy = {
  loginHref: "/admin/login",
  asistencia: "al administrador principal de tu empresa",
};

export function AdminRecuperarAccesoFlow(): React.JSX.Element {
  /* `alGuardar` lleva lo fijado **al servidor**, que es donde `/admin`
     comprueba las contraseñas. Worker no lo necesita porque su mock de acceso
     corre en el navegador; el comentario largo está en `admin-auth.ts`. */
  return (
    <PasswordRecoveryForm
      copy={ADMIN_RECUPERACION}
      alGuardar={guardarContrasenaRecuperadaAction}
    />
  );
}
