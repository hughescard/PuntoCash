import type { Metadata } from "next";

import { CobrarGiroFlow } from "./cobrar-giro-flow";

export const metadata: Metadata = {
  title: "Cobrar giro",
  description: "Entrega un giro existente al beneficiario mediante su código.",
  robots: { index: false, follow: false },
};

export default function CobrarGiroPage() {
  return <CobrarGiroFlow />;
}
