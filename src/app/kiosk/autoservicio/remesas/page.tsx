import type { Metadata } from "next";

import { exigirServicioDeKiosco } from "@/features/kiosk/sesion-servidor";
import { RemesasAutoservicioFlow } from "./remesas-flow";

export const metadata: Metadata = {
  title: "Cobrar remesa",
  robots: { index: false, follow: false },
};

export default async function RemesasAutoservicioPage() {
  await exigirServicioDeKiosco("remesas");
  return <RemesasAutoservicioFlow />;
}
