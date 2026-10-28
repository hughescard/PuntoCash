"use client";

import * as React from "react";

import { TwoFactorForm, type TwoFactorScreenCopy } from "@/components/patterns/two-factor-form";
import { abrirSesionSuperAdmin, descartarAccesoSuperAdmin } from "@/app/super-admin/_actions";

/** La sesión se abre en el servidor antes de navegar, como en Admin de sede. */
const SUPER_ADMIN_2FA: TwoFactorScreenCopy = {
  loginHref: "/super-admin/login",
  afterVerification: "/super-admin/inicio",
  successTitle: "Verificación completada",
  successMessage: "Bienvenido a la administración de la red PuntoCash.",
  assistance: "al área de sistemas de PuntoCash",
  onVerified: async (code) => {
    await abrirSesionSuperAdmin(code);
  },
  onDiscard: descartarAccesoSuperAdmin,
};

export function SuperAdminVerificationForm({
  servidorSinReto,
}: {
  servidorSinReto: boolean;
}): React.JSX.Element | null {
  return <TwoFactorForm copy={SUPER_ADMIN_2FA} servidorSinReto={servidorSinReto} />;
}
