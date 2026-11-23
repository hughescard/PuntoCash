import type { Metadata } from "next";

import { cambioDeSede, exigirServicioDeKiosco, getKiosco } from "@/features/kiosk/sesion-servidor";
import { CambioMonedaAutoservicioFlow } from "./cambio-moneda-flow";

export const metadata: Metadata = {
  title: "Cambio de moneda",
  robots: { index: false, follow: false },
};

export default async function CambioMonedaAutoservicioPage() {
  await exigirServicioDeKiosco("cambio-moneda");
  const kiosco = await getKiosco();
  /* Si el kiosco no opera, el layout ya muestra otra cosa y esto no se pinta. */
  if (kiosco.estado !== "operando") return null;

  const cambio = cambioDeSede(kiosco.sede.id);
  if (cambio.monedas.length < 2) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center py-16 text-center">
        <h1 className="text-screen-title text-text-primary">Cambio de moneda</h1>
        <p className="mt-3 max-w-xl text-body text-text-secondary">
          Hoy esta sucursal no tiene tasas para cambiar moneda. Consulta al personal de la sucursal.
        </p>
      </div>
    );
  }
  return <CambioMonedaAutoservicioFlow cambio={cambio} />;
}
