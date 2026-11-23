import type { Metadata } from "next";

import { UnderConstruction } from "@/components/patterns/under-construction";

export const metadata: Metadata = {
  title: "Tasas",
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
      title="Tasas"
      description="Aquí podrás consultar el listado completo de tasas de cambio vigentes."
      backHref="/worker/inicio"
      backLabel="Volver a Inicio"
    />
  );
}
