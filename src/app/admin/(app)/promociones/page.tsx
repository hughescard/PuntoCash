import type { Metadata } from "next";

import { UnderConstruction } from "@/components/patterns/under-construction";

export const metadata: Metadata = {
  title: "Administración de sede · Promociones",
  robots: { index: false, follow: false },
};

/**
 * Marcador de posición. La ruta existe desde este tramo para que la
 * navegación de la consola se pueda recorrer entera —un destino de la barra
 * lateral que devuelve un 404 se lee como un producto roto— y su pantalla
 * llega con su propio tramo.
 */
export default function AdminPromocionesPage() {
  return (
    <UnderConstruction
      embedded
      title="Promociones"
      description="Las promociones que se publican en la pantalla informativa de cada sede."
      backHref="/admin/inicio"
      backLabel="Volver a Inicio"
    />
  );
}
