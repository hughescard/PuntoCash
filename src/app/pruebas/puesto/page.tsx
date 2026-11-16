import { notFound } from "next/navigation";

import { crearPuestoDePrueba } from "@/features/network/puesto-de-prueba";

export const dynamic = "force-dynamic";

/**
 * **SOLO PARA LAS PRUEBAS AUTOMATIZADAS.** Responde 404 salvo que el servidor
 * arranque con `PUNTOCASH_PRUEBAS=1`, que solo pone la configuración de
 * Playwright en el servidor propio de las pruebas de Worker.
 *
 * Cada prueba de Worker pide aquí **su propio puesto** (`crearPuestoDePrueba`)
 * para no pisarse las jornadas con las que corren en paralelo.
 *
 * Es una página y no un manejador de ruta a propósito: Next carga los
 * manejadores de `route.ts` en otro grafo de módulos, y una caja, un equipo o
 * un trabajador creados allí no existirían para las pantallas de Worker.
 */
export default async function PuestoDePruebaPage({
  searchParams,
}: {
  searchParams: Promise<{ datos?: string }>;
}) {
  if (process.env.PUNTOCASH_PRUEBAS !== "1") notFound();
  const { datos } = await searchParams;
  const opciones = datos ? (JSON.parse(datos) as Parameters<typeof crearPuestoDePrueba>[0]) : {};
  const r = crearPuestoDePrueba(opciones);
  return <pre id="puesto">{JSON.stringify(r)}</pre>;
}
