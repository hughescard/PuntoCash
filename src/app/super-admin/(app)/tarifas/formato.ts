import { formatAmount, LOCALE } from "@/lib/format";

/** Un importe de una tarifa: siempre con dos decimales, como todo importe del producto. */
export const importe = (v: number): string => formatAmount(v, 2);

/** «2 %», «1,5 %», «0,25 %»: sin ceros de más. */
export function porcentaje(v: number): string {
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(v)} %`;
}

/**
 * Dónde cae un tramo, por lo que recibe el beneficiario. El primero empieza en
 * el giro mínimo, incluido; los demás, justo por encima del límite anterior;
 * el último no tiene techo.
 */
export function textoDelTramo(t: { desde: number; incluido: boolean; hasta: number | null }): string {
  if (t.hasta === null) return t.incluido ? `Desde ${importe(t.desde)}` : `Más de ${importe(t.desde)}`;
  return t.incluido ? `De ${importe(t.desde)} a ${importe(t.hasta)}` : `Más de ${importe(t.desde)} hasta ${importe(t.hasta)}`;
}
