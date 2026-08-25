import type { Metadata } from "next";

import { FondeoInicialFlow } from "./fondeo-inicial-flow";

export const metadata: Metadata = {
  title: "Registrar fondeo inicial",
  description: "Registra los fondos con los que la caja inicia su jornada.",
  robots: { index: false, follow: false },
};

export default function FondeoInicialPage() {
  return <FondeoInicialFlow />;
}
