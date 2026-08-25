import type { Metadata } from "next";

import { AnadirMonedaFlow } from "./anadir-moneda-flow";

export const metadata: Metadata = {
  title: "Añadir moneda",
  description: "Incorpora una nueva divisa a la caja del trabajador.",
  robots: { index: false, follow: false },
};

export default function AnadirMonedaPage() {
  return <AnadirMonedaFlow />;
}
