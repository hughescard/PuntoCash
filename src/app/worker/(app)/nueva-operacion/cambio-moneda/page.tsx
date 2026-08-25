import type { Metadata } from "next";

import { CambioMonedaFlow } from "./cambio-moneda-flow";

export const metadata: Metadata = {
  title: "Cambio de moneda",
  description: "Operación de compra y venta entre divisas.",
  robots: { index: false, follow: false },
};

/**
 * The first complete PuntoCash operation.
 *
 * A dedicated static route: the catalog's dynamic `[servicio]` placeholder
 * still covers the twelve services whose flows are not built, and Next resolves
 * this static segment ahead of it.
 */
export default function CambioMonedaPage() {
  return <CambioMonedaFlow />;
}
