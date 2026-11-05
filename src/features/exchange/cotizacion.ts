/**
 * LA COTIZACIÓN de un cambio de moneda con las tasas de la sede.
 *
 * Las tasas se fijan sede por sede, siempre de una divisa contra el peso
 * cubano: la **compra** es lo que la casa paga en pesos por una unidad de la
 * divisa, la **venta** lo que cobra en pesos por entregarla. Todo cambio se
 * resuelve con esas dos cifras:
 *
 *   · divisa → CUP: el cliente vende; se aplica la compra.
 *   · CUP → divisa: el cliente compra; se aplica la venta.
 *   · divisa → otra divisa: la casa compra la primera y vende la segunda, a
 *     través del peso. No hay tasa cruzada propia.
 *
 * El importe que se entrega se redondea **a la baja** al céntimo: la casa
 * nunca entrega una fracción que no tiene en la caja ni redondea a su favor
 * más de lo que el céntimo obliga.
 *
 * Módulo puro, sin estado: lo usa la pantalla para la vista previa y el
 * servidor para confirmar, con las mismas tasas y la misma aritmética.
 */

export const MONEDA_LOCAL = "CUP";

export interface TasaVigente {
  code: string;
  compra: number;
  venta: number;
}

export interface Cotizacion {
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: number;
  destinationAmount: number;
  /** Unidades de destino por unidad de origen, como se guarda en la operación. */
  appliedRate: number;
  /**
   * La tasa como la cotiza la sede, para mostrarla: la divisa contra el peso.
   * En un cambio entre dos divisas hay dos.
   */
  tasasAplicadas: readonly { code: string; lado: "compra" | "venta"; valor: number }[];
}

export type MotivoSinCotizar = "misma-moneda" | "sin-tasa" | "importe-invalido";

function aLaBaja(valor: number): number {
  return Math.floor(valor * 100 + 1e-9) / 100;
}

export function cotizar(
  tasas: readonly TasaVigente[],
  sourceCurrency: string,
  destinationCurrency: string,
  sourceAmount: number,
): { ok: true; value: Cotizacion } | { ok: false; reason: MotivoSinCotizar } {
  if (sourceCurrency === destinationCurrency) return { ok: false, reason: "misma-moneda" };
  if (!Number.isFinite(sourceAmount) || sourceAmount <= 0) return { ok: false, reason: "importe-invalido" };

  const tasa = (code: string) => tasas.find((t) => t.code === code) ?? null;
  const usadas: { code: string; lado: "compra" | "venta"; valor: number }[] = [];

  /* Origen → pesos. */
  let enPesos = sourceAmount;
  if (sourceCurrency !== MONEDA_LOCAL) {
    const t = tasa(sourceCurrency);
    if (!t) return { ok: false, reason: "sin-tasa" };
    enPesos = sourceAmount * t.compra;
    usadas.push({ code: sourceCurrency, lado: "compra", valor: t.compra });
  }

  /* Pesos → destino. */
  let destino = enPesos;
  if (destinationCurrency !== MONEDA_LOCAL) {
    const t = tasa(destinationCurrency);
    if (!t) return { ok: false, reason: "sin-tasa" };
    destino = enPesos / t.venta;
    usadas.push({ code: destinationCurrency, lado: "venta", valor: t.venta });
  }

  const destinationAmount = aLaBaja(destino);
  if (destinationAmount <= 0) return { ok: false, reason: "importe-invalido" };

  return {
    ok: true,
    value: {
      sourceCurrency,
      destinationCurrency,
      sourceAmount,
      destinationAmount,
      appliedRate: destinationAmount / sourceAmount,
      tasasAplicadas: usadas,
    },
  };
}

/** Las monedas que pueden cambiarse con estas tasas: el peso y las que tienen tasa. */
export function monedasCotizables(tasas: readonly TasaVigente[]): readonly string[] {
  return [MONEDA_LOCAL, ...tasas.map((t) => t.code)];
}
