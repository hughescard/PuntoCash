import { formatMoney } from "@/lib/format";
import {
  cotizarGiro,
  textoDeTarifa,
  type CotizacionDeGiro,
  type FormaDeGiro,
  type ResultadoDeCotizacion,
  type TarifaDeGiro,
} from "@/features/network/tarifas-reglas";

/**
 * EL GIRO DEL KIOSCO: la misma tarifa y la misma regla que aplica la caja
 * (`tarifas-reglas.ts`). El cliente ve, antes de recibir su código, lo que
 * recibe el beneficiario, la tarifa y lo que tiene que entregar: es su propio
 * giro, y si no lo ve llega a caja esperando pagar otra cifra.
 *
 * La pantalla cotiza para la vista previa; el servidor vuelve a cotizar al
 * registrar y no se fía de ella.
 */

export type { FormaDeGiro };

/** Lo que el kiosco necesita de su sede para cotizar giros. */
export interface GiroDeSede {
  /** Las monedas en que la sede envía giros: las que maneja y tienen tarifa. */
  monedas: readonly { code: string; name: string }[];
  tarifas: Readonly<Record<string, Pick<TarifaDeGiro, "minimo" | "tramos">>>;
  /** La denominación más pequeña de cada moneda: lo mínimo que se puede cobrar. */
  menores: Readonly<Record<string, number>>;
}

/** Lo que el cliente vio en el kiosco, guardado en la solicitud. */
export interface GiroCotizadoEnKiosco {
  giro: number;
  tarifa: number;
  total: number;
}

export function cotizarGiroEnKiosco(
  giros: GiroDeSede,
  currency: string,
  forma: FormaDeGiro,
  importe: number,
): ResultadoDeCotizacion | { ok: false; reason: "sin-tarifa" } {
  const tarifa = giros.tarifas[currency];
  const menor = giros.menores[currency];
  if (!tarifa || menor === undefined) return { ok: false, reason: "sin-tarifa" };
  return cotizarGiro(tarifa, menor, forma, importe);
}

export function resumenDeGiro(c: CotizacionDeGiro): GiroCotizadoEnKiosco {
  return { giro: c.giro, tarifa: c.tarifa.cobrada, total: c.total };
}

/** «150,00 CUP + 1 %»; `null` si es solo un fijo, que ya es la cifra de la tarifa. */
export function desgloseSiLlevaPorcentaje(c: CotizacionDeGiro, currency: string): string | null {
  if (c.tarifa.porcentaje <= 0) return null;
  return textoDeTarifa(c.tarifa, (v) => formatMoney({ amount: v, currency }));
}

/** Por qué no se cotiza, en palabras para el cliente. */
export function errorDeGiro(
  c: Exclude<ReturnType<typeof cotizarGiroEnKiosco>, { ok: true }>,
  currency: string,
  forma: FormaDeGiro,
): string {
  const m = (amount: number) => formatMoney({ amount, currency });
  switch (c.reason) {
    case "sin-tarifa":
      return `En esta sucursal no se envían giros en ${currency}.`;
    case "importe-invalido":
      return "Escribe un monto válido.";
    case "no-pagable":
      return `No se puede entregar en billetes: usa múltiplos de ${m(c.menor)}.`;
    case "bajo-minimo":
      return forma === "llegar"
        ? `El giro mínimo es de ${m(c.minimo)}.`
        : `El giro mínimo es de ${m(c.minimo)}: con la tarifa, tienes que entregar al menos ${m(c.entregaMinima)}.`;
  }
}
