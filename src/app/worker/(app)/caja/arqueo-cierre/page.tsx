import type { Metadata } from "next";

import { ArqueoCierreFlow } from "./arqueo-cierre-flow";

export const metadata: Metadata = {
  title: "Arqueo y cierre de caja",
  description: "Cuenta el efectivo disponible para cerrar la jornada de Caja 03.",
  robots: { index: false, follow: false },
};

export default function ArqueoCierrePage() {
  return <ArqueoCierreFlow />;
}
