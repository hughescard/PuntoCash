import type { Metadata } from "next";

import { CajaView } from "./caja-view";

export const metadata: Metadata = {
  title: "Caja",
  description: "Estado operativo y financiero de la caja del trabajador.",
  robots: { index: false, follow: false },
};

export default function CajaPage() {
  return <CajaView />;
}
