import type { Metadata } from "next";

import { ServiceCatalog } from "./service-catalog";

export const metadata: Metadata = {
  title: "Nueva operación",
  description: "Selecciona el servicio que deseas realizar.",
  robots: { index: false, follow: false },
};

/**
 * Worker service selector. Its only question is which service the worker is
 * starting — no balances, rates, operations or alerts, which belong to Inicio.
 */
export default function NuevaOperacionPage() {
  return <ServiceCatalog />;
}
