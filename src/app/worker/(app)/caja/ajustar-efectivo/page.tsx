import type { Metadata } from "next";

import { AjustarEfectivoFlow } from "./ajustar-efectivo-flow";

export const metadata: Metadata = {
  title: "Ajustar efectivo",
  description: "Corrige el saldo de una moneda a partir de un conteo físico.",
  robots: { index: false, follow: false },
};

export default function AjustarEfectivoPage() {
  return <AjustarEfectivoFlow />;
}
