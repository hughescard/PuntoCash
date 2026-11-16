import type { Metadata } from "next";

import { exigirServicio } from "@/features/worker/servicio-habilitado";

import { EnviarGiroFlow } from "./enviar-giro-flow";

export const metadata: Metadata = {
  // Distinct from the "Giros" selector's own title, and symmetrical with
  // Cobrar giro's — the two operations are siblings.
  title: "Enviar giro",
  description: "Registra un giro para que el beneficiario lo cobre en otra provincia.",
  robots: { index: false, follow: false },
};

export default async function EnviarGiroPage() {
  await exigirServicio("giros");
  return <EnviarGiroFlow />;
}
