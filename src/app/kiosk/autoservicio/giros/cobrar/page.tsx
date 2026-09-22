import type { Metadata } from "next";

import { CobrarGiroAutoservicioFlow } from "./cobrar-giro-flow";

export const metadata: Metadata = {
  title: "Cobrar giro",
  robots: { index: false, follow: false },
};

export default function CobrarGiroAutoservicioPage() {
  return <CobrarGiroAutoservicioFlow />;
}
