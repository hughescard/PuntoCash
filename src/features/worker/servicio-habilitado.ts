import { notFound } from "next/navigation";

import { getVistaDeCaja } from "./sesion-servidor";

/**
 * Un servicio que PuntoCash no habilitó en la sede de esta caja no existe para
 * su trabajador: ni en el catálogo ni por su dirección, que responde 404.
 */
export async function exigirServicio(serviceId: string): Promise<void> {
  const vista = await getVistaDeCaja();
  if (vista && !vista.servicios.includes(serviceId)) notFound();
}
