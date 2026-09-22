import type { Metadata } from "next";

import { EnviarGiroAutoservicioFlow } from "./enviar-giro-flow";

export const metadata: Metadata = {
  title: "Enviar giro",
  robots: { index: false, follow: false },
};

export default function EnviarGiroAutoservicioPage() {
  return <EnviarGiroAutoservicioFlow />;
}
