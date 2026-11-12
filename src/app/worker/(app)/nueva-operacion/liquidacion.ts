import type { OperationLiquidation } from "@/features/operations/operations-history";
import { formatMoney } from "@/lib/format";

/**
 * La liquidación de una operación en líneas «etiqueta: valor» para el
 * comprobante y el detalle: el vuelto, lo pagado en CUP y lo que quedó a
 * favor de la casa, con su causa (bloque 4).
 */
export function liquidacionComoLineas(l: OperationLiquidation | undefined): { etiqueta: string; valor: string }[] {
  if (!l) return [];
  const out: { etiqueta: string; valor: string }[] = [];
  if (l.vuelto) out.push({ etiqueta: "Vuelto al cliente", valor: formatMoney({ amount: l.vuelto.importe, currency: l.vuelto.currency }) });
  if (l.enCup) {
    out.push({
      etiqueta: "Pagado en CUP por falta de billetes",
      valor: `${formatMoney({ amount: l.enCup.importe, currency: "CUP" })} por ${formatMoney({ amount: l.enCup.equivale.importe, currency: l.enCup.equivale.currency })}`,
    });
  }
  for (const f of l.aFavorDeLaCasa ?? []) {
    out.push({
      etiqueta: "A favor de la casa (redondeo)",
      valor: formatMoney({ amount: f.importe, currency: f.currency }),
    });
  }
  return out;
}
