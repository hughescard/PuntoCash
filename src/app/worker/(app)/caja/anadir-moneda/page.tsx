import type { Metadata } from "next";

import { AnadirMonedaFlow } from "./anadir-moneda-flow";

export const metadata: Metadata = {
  title: "Añadir moneda",
  description: "Incorpora una nueva divisa a la caja del trabajador.",
  robots: { index: false, follow: false },
};

/**
 * «Añadir moneda» ofrece **la lista de monedas de la sede de la caja**, la que
 * decide su mercante (FR-AD-MON-1, FR-AD-MON-2), menos las que la caja ya
 * tiene. Lo calcula el servidor y llega en la foto de la caja.
 */
export default function AnadirMonedaPage() {
  return <AnadirMonedaFlow />;
}
