import type { Metadata } from "next";

import { UnderConstruction } from "@/components/patterns/under-construction";

export const metadata: Metadata = {
  title: "Alertas",
  robots: { index: false, follow: false },
};

/**
 * Temporary placeholder so Worker navigation never dead-ends. Replace with the
 * real screen; the route and the shell stay the same.
 */
export default function Page() {
  return (
    <UnderConstruction
      embedded
      title="Alertas"
      description="Aquí podrás revisar el historial completo de avisos de tu caja y marcarlos como atendidos."
      backHref="/worker/inicio"
      backLabel="Volver a Inicio"
    />
  );
}
