import type { Metadata } from "next";
import { cookies } from "next/headers";

import { DEVICE_COOKIE_NAMES, parseDeviceCookie } from "@/features/devices/device-cookie";
import { monedasDeSede } from "@/features/network/currencies";
import { AnadirMonedaFlow } from "./anadir-moneda-flow";

export const metadata: Metadata = {
  title: "Añadir moneda",
  description: "Incorpora una nueva divisa a la caja del trabajador.",
  robots: { index: false, follow: false },
};

/**
 * «Añadir moneda» ofrece **la lista de monedas de la sede de la caja**, la que
 * decide su mercante (FR-AD-MON-1, FR-AD-MON-2): una caja no puede habilitar
 * lo que su sede no maneja. La sede sale de la cookie espejo del vínculo, la
 * misma con la que el layout pinta la cabecera.
 */
export default async function AnadirMonedaPage() {
  const store = await cookies();
  const device = parseDeviceCookie(store.get(DEVICE_COOKIE_NAMES.caja)?.value);
  const lista = device ? monedasDeSede(device.branchId).map((m) => m.code) : [];
  return <AnadirMonedaFlow monedasDeLaSede={lista} />;
}
