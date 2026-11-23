import { cotizar, cotizarParaRecibir, type Cotizacion, type TasaVigente } from "@/features/exchange/cotizacion";
import type { ExchangeQuote } from "@/features/exchange/quote";

/**
 * EL CAMBIO DE MONEDA DEL KIOSCO: lo mismo que cotiza la caja, con las mismas
 * tasas de la sede y la misma aritmética (`cotizacion.ts`). Lo usan la
 * pantalla, para la vista previa, y el servidor, para no fiarse de ella al
 * registrar la solicitud.
 *
 * El kiosco no toca billetes. Lo único de los billetes que sí le importa es que
 * lo que el cliente va a entregar se pueda pagar: un importe con fracciones
 * menores que la moneda más pequeña de su divisa no lo podría cobrar ninguna
 * caja. Lo demás —el vuelto, si la caja tiene los billetes exactos, si hay que
 * redondear o pagar una parte en pesos— lo resuelve la caja al terminar.
 */

/** «Cambiar un importe»: el cliente dice cuánto entrega. «Recibir un importe»: cuánto quiere recibir. */
export type ModoDeCambio = "cambiar" | "recibir";

/** Lo que el kiosco necesita saber de su sede para cotizar, y nada más. */
export interface CambioDeSede {
  tasas: readonly TasaVigente[];
  /** Las monedas que se pueden cambiar, con su nombre. El peso cubano va primero. */
  monedas: readonly { code: string; name: string }[];
  /** La denominación más pequeña de cada moneda: lo mínimo que se puede cobrar o pagar. */
  pasos: Readonly<Record<string, number>>;
}

function aQuote(c: Cotizacion): ExchangeQuote {
  return {
    sourceCurrency: c.sourceCurrency,
    destinationCurrency: c.destinationCurrency,
    sourceAmount: c.sourceAmount,
    destinationAmount: c.destinationAmount,
    appliedRate: c.appliedRate,
    tasasAplicadas: c.tasasAplicadas,
    quoteId: `${c.sourceCurrency}-${c.destinationCurrency}`,
    quotedAt: new Date().toISOString(),
  };
}

/** ¿Tiene `importe` fracciones menores que `paso`? Entonces no se puede cobrar en billetes. */
export function noSePuedeCobrar(importe: number, paso: number | undefined): boolean {
  if (!paso || !Number.isFinite(paso) || paso <= 0) return false;
  return Math.round(importe * 100) % Math.round(paso * 100) !== 0;
}

export function cotizarEnKiosco(
  cambio: CambioDeSede,
  modo: ModoDeCambio,
  sourceCurrency: string,
  destinationCurrency: string,
  importe: number,
): ExchangeQuote | null {
  const r =
    modo === "recibir"
      ? cotizarParaRecibir(cambio.tasas, sourceCurrency, destinationCurrency, importe, cambio.pasos[sourceCurrency])
      : cotizar(cambio.tasas, sourceCurrency, destinationCurrency, importe);
  return r.ok ? aQuote(r.value) : null;
}
