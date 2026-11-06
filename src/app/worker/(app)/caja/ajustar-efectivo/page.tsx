import type { Metadata } from "next";

import { AjustarEfectivoFlow } from "./ajustar-efectivo-flow";

export const metadata: Metadata = {
  title: "Ajustar efectivo",
  description: "Registra un conteo de efectivo de una moneda y explica la diferencia, si la hay.",
  robots: { index: false, follow: false },
};

export default function AjustarEfectivoPage() {
  return <AjustarEfectivoFlow />;
}
