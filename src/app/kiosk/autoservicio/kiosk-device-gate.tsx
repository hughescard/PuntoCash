"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { consultarKiosco } from "./_actions";

/** Cada cuánto pregunta el kiosco a la red qué es ahora. */
const SONDEO_MS = 3_000;

/**
 * Mantiene el kiosco al día con la red sin que nadie lo toque.
 *
 * Qué pantalla toca —vinculación, «no disponible» o el servicio— lo decide el
 * servidor en el layout. Este vigilante solo pregunta cada pocos segundos si
 * eso cambió y, en cuanto cambia, vuelve a pintar: el administrador vincula o
 * desvincula el kiosco, PuntoCash suspende la sede o le quita un servicio, y
 * el kiosco lo refleja aunque haya un cliente a medio flujo, que es cuando más
 * importa (lo que prepararía ya no se podría atender).
 */
export function KioskWatcher({ huella }: { huella: string }): null {
  const router = useRouter();

  React.useEffect(() => {
    const id = setInterval(() => {
      void consultarKiosco().then((actual) => {
        if (actual !== huella) router.refresh();
      });
    }, SONDEO_MS);
    return () => clearInterval(id);
  }, [huella, router]);

  return null;
}
