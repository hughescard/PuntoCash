import type { Money } from "@/lib/format";
import type { OperationStatus } from "@/components/patterns/operation-status-badge";

/**
 * FRONTEND-ONLY MOCK data for the Worker home screen.
 *
 * Each export is the shape a real query should return, so wiring the backend
 * means replacing the constant with a fetch and leaving the screen untouched.
 * Everything here is scoped to the signed-in worker and their own register —
 * the home screen never shows other workers, other cajas or branch-wide data.
 */

/** Cash available in the worker's own register, by currency. */
export interface CashBalance extends Money {
  /** Flags a balance sitting below its operational floor. */
  low?: boolean;
}

// Annotated rather than `as const`, so `low` is readable on every element
// instead of only on the one that declares it.
export const CASH_BALANCES: readonly CashBalance[] = [
  { currency: "CUP", amount: 245_000 },
  { currency: "USD", amount: 3_850 },
  { currency: "EUR", amount: 2_120, low: true },
];

/**
 * Cash the register holds in one currency, or 0 when it holds none. Operations
 * that pay a client read availability through here rather than reaching into
 * the array, so a real balances query has one call site to replace.
 */
export function getCashBalance(currency: string): number {
  return CASH_BALANCES.find((balance) => balance.currency === currency)?.amount ?? 0;
}

/** Read-only rates for the worker. Rate management lives elsewhere. */
export interface ExchangeRate {
  currency: string;
  buy: number;
  sell: number;
}

export const EXCHANGE_RATES = [
  { currency: "USD", buy: 375, sell: 380 },
  { currency: "EUR", buy: 410, sell: 420 },
  { currency: "GBP", buy: 475, sell: 490 },
] as const satisfies readonly ExchangeRate[];

/** Human-readable freshness for the rates block. */
export const RATES_UPDATED_LABEL = "Actualizadas hace 4 min";

export interface RecentOperation {
  code: string;
  /** Local time of day, already formatted for display. */
  time: string;
  client: string;
  service: string;
  amount: Money;
  status: OperationStatus;
}

export const RECENT_OPERATIONS = [
  {
    code: "OP-000523",
    time: "09:35",
    client: "María Rodríguez",
    service: "Cambio de moneda",
    amount: { currency: "USD", amount: 350 },
    status: "Completada",
  },
  {
    code: "OP-000522",
    time: "09:12",
    client: "Carlos Gómez",
    service: "Remesa enviada",
    amount: { currency: "USD", amount: 500 },
    status: "Completada",
  },
  {
    code: "OP-000521",
    time: "08:47",
    client: "Ana López",
    service: "Extracción",
    amount: { currency: "USD", amount: 200 },
    status: "En proceso",
  },
  {
    code: "OP-000520",
    time: "08:21",
    client: "Luis Martínez",
    service: "Cambio de moneda",
    amount: { currency: "EUR", amount: 150 },
    status: "Completada",
  },
  {
    code: "OP-000519",
    time: "07:58",
    client: "Pedro Sánchez",
    service: "Inserción de efectivo",
    amount: { currency: "CUP", amount: 50_000 },
    status: "Completada",
  },
] as const satisfies readonly RecentOperation[];

/**
 * Items needing the worker's attention. An empty array must render nothing at
 * all — never an empty card.
 */
export interface WorkerAlert {
  id: string;
  /** Restricted to the non-blocking states; a home screen never reports failure. */
  variant: "warning" | "info";
  title: string;
  description: string;
}

export const WORKER_ALERTS = [
  {
    id: "low-cash-eur",
    variant: "warning",
    title: "Efectivo bajo en EUR",
    description: "Caja 03 dispone de menos del nivel operativo recomendado.",
  },
] as const satisfies readonly WorkerAlert[];
