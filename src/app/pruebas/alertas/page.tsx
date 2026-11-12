import { notFound } from "next/navigation";

import type { ReglaDeMoneda } from "@/features/network/alertas";
import { definirAlertasDePrueba } from "@/features/network/puesto-de-prueba";

export const dynamic = "force-dynamic";

/**
 * **SOLO PARA LAS PRUEBAS AUTOMATIZADAS**, igual que `/pruebas/puesto`: 404 salvo
 * con `PUNTOCASH_PRUEBAS=1`. Fija las alertas de una sede (`?sede=…&reglas=<json>`).
 */
export default async function AlertasDePruebaPage({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string; reglas?: string }>;
}) {
  if (process.env.PUNTOCASH_PRUEBAS !== "1") notFound();
  const { sede, reglas } = await searchParams;
  let lista: ReglaDeMoneda[] = [];
  try {
    lista = JSON.parse(reglas ?? "[]") as ReglaDeMoneda[];
  } catch {
    return <pre id="resultado">{JSON.stringify({ ok: false, reason: "json" })}</pre>;
  }
  return <pre id="resultado">{JSON.stringify(definirAlertasDePrueba(sede ?? "", lista))}</pre>;
}
