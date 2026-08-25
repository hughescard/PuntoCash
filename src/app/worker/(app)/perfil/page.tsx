import type { Metadata } from "next";

import { UnderConstruction } from "@/components/patterns/under-construction";

export const metadata: Metadata = {
  title: "Perfil",
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
      title="Perfil"
      description="Aquí podrás revisar los datos de tu cuenta y tus preferencias."
      backHref="/worker/inicio"
      backLabel="Volver a Inicio"
    />
  );
}
