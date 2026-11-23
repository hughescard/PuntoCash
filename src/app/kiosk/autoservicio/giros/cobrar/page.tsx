import type { Metadata } from "next";

import { exigirServicioDeKiosco } from "@/features/kiosk/sesion-servidor";
import { CobrarGiroAutoservicioFlow } from "./cobrar-giro-flow";

export const metadata: Metadata = {
  title: "Cobrar giro",
  robots: { index: false, follow: false },
};

export default async function CobrarGiroAutoservicioPage() {
  await exigirServicioDeKiosco("giros");
  return <CobrarGiroAutoservicioFlow />;
}
