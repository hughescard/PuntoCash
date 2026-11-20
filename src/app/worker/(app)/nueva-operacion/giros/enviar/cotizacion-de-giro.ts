import { formatMoney, LOCALE } from "@/lib/format";
import type { Denominacion } from "@/features/caja/billetes";
import {
  cotizarGiro,
  inicioDeTramo,
  type CotizacionDeGiro,
  type FormaDeGiro,
  type ResultadoDeCotizacion,
  type TarifaDeGiro,
} from "@/features/network/tarifas-reglas";
import type { TarifaDelGiro } from "@/features/operations/operations-history";

/**
 * La cotización de un giro en Worker, con lo que la caja recibe del servidor:
 * la tarifa de giros de cada moneda y sus denominaciones. El servidor la
 * vuelve a calcular al registrar con la tarifa vigente.
 */

export type Tarifas = Readonly<Record<string, Pick<TarifaDeGiro, "minimo" | "tramos">>>;

export type CotizacionEnCaja = ResultadoDeCotizacion | { ok: false; reason: "sin-tarifa" };

/** La denominación más pequeña de la moneda en esta caja, o `null` si no tiene. */
export function menorDe(denominaciones: Readonly<Record<string, readonly Denominacion[]>>, currency: string): number | null {
  const lista = denominaciones[currency] ?? [];
  return lista.length === 0 ? null : Math.min(...lista.map((d) => d.valor));
}

export function cotizarEnCaja(
  tarifas: Tarifas,
  denominaciones: Readonly<Record<string, readonly Denominacion[]>>,
  currency: string,
  forma: FormaDeGiro,
  importe: number,
): CotizacionEnCaja {
  const tarifa = tarifas[currency];
  const menor = menorDe(denominaciones, currency);
  if (!tarifa || menor === null) return { ok: false, reason: "sin-tarifa" };
  return cotizarGiro(tarifa, menor, forma, importe);
}

/** Lo que se guarda en la operación: la tarifa tal como se aplicó. */
export function tarifaDelGiro(tarifa: Pick<TarifaDeGiro, "minimo" | "tramos">, c: CotizacionDeGiro): TarifaDelGiro {
  return {
    forma: c.forma,
    tramo: { ...inicioDeTramo(tarifa, c.tarifa.tramo), hasta: tarifa.tramos[c.tarifa.tramo]?.hasta ?? null },
    fijo: c.tarifa.fijo,
    porcentaje: c.tarifa.porcentaje,
    cobrada: c.tarifa.cobrada,
    total: c.total,
  };
}

/** Por qué no se cotiza, en palabras del trabajador, junto al campo del importe. */
export function errorDeCotizacion(c: Exclude<CotizacionEnCaja, { ok: true }>, currency: string, forma: FormaDeGiro): string {
  switch (c.reason) {
    case "sin-tarifa":
      return `En ${currency} no se envían giros: PuntoCash no le ha puesto tarifa.`;
    case "importe-invalido":
      return "Introduce un monto válido.";
    case "no-pagable":
      return `El importe tiene que poder pagarse con billetes y monedas: múltiplo de ${formatMoney({ amount: c.menor, currency })}.`;
    case "bajo-minimo":
      return forma === "llegar"
        ? `El giro mínimo es de ${formatMoney({ amount: c.minimo, currency })}.`
        : `El giro mínimo es de ${formatMoney({ amount: c.minimo, currency })}; con la tarifa, el cliente tiene que entregar al menos ${formatMoney({ amount: c.entregaMinima, currency })}.`;
  }
}

/** «150,00 CUP», «2 %», «100,00 CUP + 1 %». */
export function desgloseDeTarifa(t: Pick<TarifaDelGiro, "fijo" | "porcentaje">, currency: string): string {
  const pct = `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(t.porcentaje)} %`;
  if (t.fijo > 0 && t.porcentaje > 0) return `${formatMoney({ amount: t.fijo, currency })} + ${pct}`;
  return t.fijo > 0 ? formatMoney({ amount: t.fijo, currency }) : pct;
}
