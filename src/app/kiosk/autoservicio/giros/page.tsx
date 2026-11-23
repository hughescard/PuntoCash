import type { Metadata } from "next";

import { exigirServicioDeKiosco } from "@/features/kiosk/sesion-servidor";
import { GirosAutoservicioSelector } from "./giros-selector";

export const metadata: Metadata = {
  title: "Giros",
  robots: { index: false, follow: false },
};

export default async function GirosAutoservicioPage() {
  await exigirServicioDeKiosco("giros");
  return <GirosAutoservicioSelector />;
}
