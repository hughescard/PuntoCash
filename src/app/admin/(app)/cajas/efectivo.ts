import { formatAmount } from "@/lib/format";
import { saldosDe } from "@/features/network/jornadas";
import type { RedEnAlcance } from "@/features/network/scoped-reads";
import type { CajaRow } from "./cajas-de-sede";

/** Lo que tiene una caja ahora; cerrada, lo que quedó al cerrar (sigue dentro). */
export function efectivoDeCaja(red: RedEnAlcance, cajaId: string): CajaRow["efectivo"] {
  const abierta = red.jornadaAbiertaDeCaja(cajaId);
  const j = abierta ?? red.ultimaJornadaCerradaDeCaja(cajaId);
  if (!j) return null;
  const texto = saldosDe(j)
    .map((m) => `${formatAmount(m.amount)} ${m.currency}`)
    .join(" · ");
  return texto ? { texto, alCerrar: !abierta } : null;
}

