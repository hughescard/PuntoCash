import type { Metadata } from "next";

import { CambioMonedaAutoservicioFlow } from "./cambio-moneda-flow";

export const metadata: Metadata = {
  title: "Cambio de moneda",
  robots: { index: false, follow: false },
};

export default function CambioMonedaAutoservicioPage() {
  return <CambioMonedaAutoservicioFlow />;
}
