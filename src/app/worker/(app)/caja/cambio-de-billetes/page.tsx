import type { Metadata } from "next";

import { CambioDeBilletesFlow } from "./cambio-de-billetes-flow";

export const metadata: Metadata = {
  title: "Cambio de billetes",
  description: "Registra un cambio de billetes con un cliente o con el supervisor.",
  robots: { index: false, follow: false },
};

export default function CambioDeBilletesPage() {
  return <CambioDeBilletesFlow />;
}
