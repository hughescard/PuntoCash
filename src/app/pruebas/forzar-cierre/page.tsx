import { notFound } from "next/navigation";

import { forzarCierreDePrueba } from "@/features/network/puesto-de-prueba";

export const dynamic = "force-dynamic";

/**
 * **SOLO PARA LAS PRUEBAS AUTOMATIZADAS**, igual que `/pruebas/puesto`: 404 salvo
 * con `PUNTOCASH_PRUEBAS=1`. Fuerza el cierre de la jornada abierta de una caja
 * como lo haría el administrador, para probar lo que ve el trabajador.
 */
export default async function ForzarCierreDePruebaPage({
  searchParams,
}: {
  searchParams: Promise<{ caja?: string; sede?: string; motivo?: string }>;
}) {
  if (process.env.PUNTOCASH_PRUEBAS !== "1") notFound();
  const { caja, sede, motivo } = await searchParams;
  const r = forzarCierreDePrueba(caja ?? "", sede ?? "", motivo ?? "Nadie vino a cerrar la caja");
  return <pre id="resultado">{JSON.stringify(r)}</pre>;
}
