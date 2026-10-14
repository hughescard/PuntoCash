"use client";

import * as React from "react";

import {
  TwoFactorForm,
  TwoFactorHeading,
  type TwoFactorScreenCopy,
} from "@/components/patterns/two-factor-form";

/**
 * Verificación en dos pasos del Worker.
 *
 * El formulario es el compartido por todas las consolas
 * (`@/components/patterns/two-factor-form`): el trámite es el mismo y sus
 * matices —vigencia, intentos, reenvíos, qué se dice en cada desenlace— no
 * deben poder separarse entre productos. Aquí solo queda lo que sí es del
 * Worker: a dónde vuelve, a dónde entra y a quién le pide ayuda.
 */
const WORKER_2FA: TwoFactorScreenCopy = {
  loginHref: "/worker/login",
  /** Donde entra un trabajador ya verificado (manual §21). */
  afterVerification: "/worker/inicio",
  successTitle: "Verificación completada",
  successMessage: "Bienvenido a PuntoCash. Tu jornada está lista para comenzar.",
  assistance: "al administrador de tu sede",
};

export function VerificationForm(): React.JSX.Element | null {
  return <TwoFactorForm copy={WORKER_2FA} />;
}

export function VerificationHeading(): React.JSX.Element {
  return <TwoFactorHeading />;
}
