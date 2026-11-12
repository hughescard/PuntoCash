import type { OperationLiquidation } from "./operations-history";

export interface Importe {
  amount: number;
  currency: string;
}

const aCien = (n: number): number => Math.round(n * 100) / 100;

/**
 * Lo que el cliente se llevó de verdad, a partir de lo que se le debía y de
 * cómo se liquidó (decisión del 12/11/2026). Lo que se le debía es la
 * cotización o el importe de la remesa o el giro. Lo que se llevó es eso menos
 * lo que quedó a favor de la casa por redondeo, y con la parte que no había en
 * billetes de la moneda pagada en CUP.
 *
 * Es lo que dicen «Cliente recibe», «Importe entregado» y «Salió de caja»: una
 * pantalla no puede decir que salieron 31.803,18 CUP cuando salieron 31.803.
 */
export function entregadoAlCliente(debido: Importe, l: OperationLiquidation | undefined): Importe[] {
  let enMoneda = debido.amount;
  for (const f of l?.aFavorDeLaCasa ?? []) if (f.currency === debido.currency) enMoneda -= f.importe;
  if (l?.enCup && l.enCup.equivale.currency === debido.currency) enMoneda -= l.enCup.equivale.importe;
  enMoneda = aCien(enMoneda);
  const out: Importe[] = [];
  if (enMoneda > 0.004) out.push({ amount: enMoneda, currency: debido.currency });
  if (l?.enCup && l.enCup.importe > 0) out.push({ amount: l.enCup.importe, currency: "CUP" });
  return out.length > 0 ? out : [{ amount: 0, currency: debido.currency }];
}

/** Si lo que se llevó no es exactamente lo que se le debía. */
export function difiereDeLoDebido(debido: Importe, l: OperationLiquidation | undefined): boolean {
  const e = entregadoAlCliente(debido, l);
  return e.length !== 1 || e[0]!.currency !== debido.currency || Math.abs(e[0]!.amount - debido.amount) >= 0.005;
}
