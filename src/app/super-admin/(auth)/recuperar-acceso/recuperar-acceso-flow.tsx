"use client";

import * as React from "react";

import { PasswordRecoveryForm, type RecuperacionCopy } from "@/components/patterns/password-recovery-form";
import { guardarContrasenaRecuperadaSuperAdminAction } from "./_actions";

/** A una persona de PuntoCash le ayuda el área de sistemas, no un administrador de sede. */
const COPY: RecuperacionCopy = {
  loginHref: "/super-admin/login",
  asistencia: "al área de sistemas de PuntoCash",
};

export function SuperAdminRecuperarAccesoFlow(): React.JSX.Element {
  return <PasswordRecoveryForm copy={COPY} alGuardar={guardarContrasenaRecuperadaSuperAdminAction} />;
}
