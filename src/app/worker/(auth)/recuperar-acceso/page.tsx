import type { Metadata } from "next";

import { UnderConstruction } from "@/components/patterns/under-construction";

export const metadata: Metadata = {
  title: "Recuperar acceso",
  description: "Recuperación de acceso para trabajadores de PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * Temporary placeholder so the recovery link on the login screen never 404s.
 * Replace with the real flow once it is designed — the route stays the same.
 */
export default function RecuperarAccesoPage() {
  return (
    <UnderConstruction
      title="Recuperación de acceso"
      description="Todavía estamos preparando este flujo. Por ahora, solicita el restablecimiento de tu contraseña al administrador de tu sede."
      backHref="/worker/login"
      backLabel="Volver a iniciar sesión"
    />
  );
}
