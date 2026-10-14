import type { Metadata } from "next";

import { UnderConstruction } from "@/components/patterns/under-construction";

export const metadata: Metadata = {
  title: "Administración de sede · Aprobaciones",
  robots: { index: false, follow: false },
};

/**
 * Marcador de posición. La ruta existe desde este tramo para que la
 * navegación de la consola se pueda recorrer entera —un destino de la barra
 * lateral que devuelve un 404 se lee como un producto roto— y su pantalla
 * llega con su propio tramo.
 */
export default function AdminAprobacionesPage() {
  return (
    <UnderConstruction
      embedded
      title="Aprobaciones"
      description="La bandeja de solicitudes que un trabajador eleva y que solo tú puedes resolver."
      backHref="/admin/inicio"
      backLabel="Volver a Inicio"
    />
  );
}
