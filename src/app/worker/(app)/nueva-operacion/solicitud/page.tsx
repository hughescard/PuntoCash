import type { Metadata } from "next";

import { SolicitudFlow } from "./solicitud-flow";

export const metadata: Metadata = { title: "Solicitud de kiosco", robots: { index: false, follow: false } };

export default function SolicitudPage() {
  return <SolicitudFlow />;
}
