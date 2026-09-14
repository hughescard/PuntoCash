import type { Metadata } from "next";

import { EnviarGiroFlow } from "./enviar-giro-flow";

export const metadata: Metadata = {
  // Distinct from the "Giros" selector's own title, and symmetrical with
  // Cobrar giro's — the two operations are siblings.
  title: "Enviar giro",
  description: "Registra un giro para que el beneficiario lo cobre en otra provincia.",
  robots: { index: false, follow: false },
};

export default function EnviarGiroPage() {
  return <EnviarGiroFlow />;
}
