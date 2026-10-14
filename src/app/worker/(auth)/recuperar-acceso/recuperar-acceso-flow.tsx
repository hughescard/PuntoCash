"use client";

import * as React from "react";

import {
  PasswordRecoveryForm,
  type RecuperacionCopy,
} from "@/components/patterns/password-recovery-form";

/**
 * Recuperación de contraseña del Worker — **§2.13**.
 *
 * El flujo es el compartido por las dos consolas
 * (`@/components/patterns/password-recovery-form`): el trámite es el mismo y
 * sus matices —no decir a dónde fue el código, responder igual exista la
 * cuenta o no, no abrir sesión al terminar— no deben poder separarse entre
 * productos. Aquí solo queda lo que sí es del Worker: a dónde vuelve y a quién
 * le pide ayuda.
 */
const WORKER_RECUPERACION: RecuperacionCopy = {
  loginHref: "/worker/login",
  asistencia: "a tu administrador de sede",
};

export function RecuperarAccesoFlow(): React.JSX.Element {
  return <PasswordRecoveryForm copy={WORKER_RECUPERACION} />;
}
