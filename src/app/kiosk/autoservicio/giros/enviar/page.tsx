import type { Metadata } from "next";

import { exigirServicioDeKiosco, getKiosco, giroDeSede } from "@/features/kiosk/sesion-servidor";
import { EnviarGiroAutoservicioFlow } from "./enviar-giro-flow";

export const metadata: Metadata = {
  title: "Enviar giro",
  robots: { index: false, follow: false },
};

export default async function EnviarGiroAutoservicioPage() {
  await exigirServicioDeKiosco("giros");
  const kiosco = await getKiosco();
  if (kiosco.estado !== "operando") return null;

  const giros = giroDeSede(kiosco.sede.id);
  if (giros.monedas.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center py-16 text-center">
        <h1 className="text-screen-title text-text-primary">Enviar giro</h1>
        <p className="mt-3 max-w-xl text-body text-text-secondary">
          Hoy esta sucursal no envía giros desde el kiosco. Consulta al personal de la sucursal.
        </p>
      </div>
    );
  }
  return <EnviarGiroAutoservicioFlow giros={giros} />;
}
