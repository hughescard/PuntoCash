/**
 * QUÉ CUENTA COMO VOLUMEN — Reportes (**FR-AD-REP-8**).
 *
 * El volumen mide **actividad**: el valor de lo operado en un periodo. Se
 * cuenta en **bruto** —las compras y las ventas se suman, no se compensan— y
 * **cada operación una sola vez**, por lo que el cliente vino a hacer:
 *
 * - **Cambio de moneda**: la **divisa** negociada. Si el cliente entrega
 *   100 USD y recibe 39.000 CUP, son 100 USD de compra; los pesos son el
 *   precio de esos dólares a la tasa del momento, y sumarlos contaría dos
 *   veces la misma operación. Se distingue **compra** (la caja recibe la
 *   divisa) de **venta** (la caja la entrega).
 * - **Remesa**: lo pagado al beneficiario.
 * - **Giro**: el importe del giro, **enviado** (entra efectivo en la caja) o
 *   **pagado** (sale).
 *
 * Solo cuentan las operaciones **completadas**: una rechazada no movió nada.
 * Nunca hay comisiones ni márgenes **[A8]**, y nunca se convierte a una
 * moneda única: cada cifra va en su moneda (**FR-AD-REP-3**).
 *
 * La **posición neta** del cambio —divisa comprada menos vendida— no es
 * volumen: dice cómo cambió la existencia de cada divisa, no cuánto se
 * trabajó. Reportes la muestra aparte, junto a lo comprado y lo vendido.
 */

import type { OperationRecord, OperationServiceName } from "@/features/operations/operations-history";

export type Sentido = "compra" | "venta" | "enviado" | "pagado";

export interface Volumen {
  servicio: OperationServiceName;
  sentido?: Sentido;
  currency: string;
  amount: number;
}

/** La moneda nacional: en un cambio, la contrapartida, no lo negociado. */
export const MONEDA_NACIONAL = "CUP";

export function volumenDeOperacion(o: OperationRecord): Volumen | null {
  if (o.estado !== "Completada") return null;

  if (o.amount.kind === "exchange") {
    const { source, destination } = o.amount;
    /* El cliente entrega la divisa: la caja la compra. */
    if (source.currency !== MONEDA_NACIONAL) {
      return { servicio: o.servicio, sentido: "compra", currency: source.currency, amount: source.amount };
    }
    return { servicio: o.servicio, sentido: "venta", currency: destination.currency, amount: destination.amount };
  }

  if (o.transfer) {
    return {
      servicio: o.servicio,
      sentido: o.transfer.transferAction === "send" ? "enviado" : "pagado",
      currency: o.amount.money.currency,
      amount: o.amount.money.amount,
    };
  }

  return { servicio: o.servicio, currency: o.amount.money.currency, amount: o.amount.money.amount };
}

/** Cómo se nombra cada línea de servicio en un reporte. */
export function lineaDeServicio(v: Pick<Volumen, "servicio" | "sentido">): string {
  switch (v.sentido) {
    case "compra":
      return "Cambio de moneda · compra de divisa";
    case "venta":
      return "Cambio de moneda · venta de divisa";
    case "enviado":
      return "Giros enviados";
    case "pagado":
      return "Giros pagados";
    default:
      return v.servicio === "Remesa" ? "Remesas pagadas" : v.servicio;
  }
}

/** El orden en que se listan las líneas: el de los servicios de la red. */
export const ORDEN_DE_LINEAS = [
  "Cambio de moneda · compra de divisa",
  "Cambio de moneda · venta de divisa",
  "Remesas pagadas",
  "Giros enviados",
  "Giros pagados",
] as const;

/** CUP primero; después las divisas, por su código. */
export function ordenarMonedas(monedas: Iterable<string>): string[] {
  return [...new Set(monedas)].sort((a, b) =>
    a === MONEDA_NACIONAL ? -1 : b === MONEDA_NACIONAL ? 1 : a.localeCompare(b),
  );
}
