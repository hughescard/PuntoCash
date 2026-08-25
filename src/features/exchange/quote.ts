/**
 * FRONTEND-ONLY MOCK quote provider, shaped like the future backend contract.
 *
 * PuntoCash will price exchanges server-side from a configurable base currency
 * with buy/sell spreads that operations staff control. None of that belongs in
 * the UI, so this module is the single place a rate is ever computed: screens
 * ask for a quote and render what comes back. Replacing `getExchangeQuote` with
 * a real call should not change a single component.
 *
 * The returned quote is the source of truth for the amount, the rate and the
 * pair — never recompute any of it downstream.
 */

export interface SupportedCurrency {
  code: string;
  /** Full name, shown beside the code in selectors (§15 "Moneda"). */
  name: string;
}

export const SUPPORTED_CURRENCIES = [
  { code: "CUP", name: "Peso cubano" },
  { code: "USD", name: "Dólar estadounidense" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "Libra esterlina" },
] as const satisfies readonly SupportedCurrency[];

export function findCurrency(code: string): SupportedCurrency | undefined {
  return SUPPORTED_CURRENCIES.find((currency) => currency.code === code);
}

/** Label used by selectors and read-only rows: "USD — Dólar estadounidense". */
export function currencyLabel(code: string): string {
  const currency = findCurrency(code);
  return currency ? `${currency.code} — ${currency.name}` : code;
}

/**
 * Internal pricing table: units of each currency per 1 USD.
 *
 * Deliberately private. The Worker never sees a base currency, only the final
 * applied rate for their pair — exposing the intermediate maths would be an
 * invitation to reimplement it in a component.
 */
const UNITS_PER_USD: Readonly<Record<string, number>> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CUP: 320,
};

export interface ExchangeQuoteRequest {
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: number;
}

export interface ExchangeQuote {
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: number;
  destinationAmount: number;
  /** Destination units per one source unit, already including any spread. */
  appliedRate: number;
  /** Identifies the pricing used, so a reviewed operation keeps its snapshot. */
  quoteId: string;
  quotedAt: string;
}

export type QuoteFailureReason =
  | "unsupported-currency"
  | "same-currency"
  | "invalid-amount";

export type ExchangeQuoteResult =
  | { ok: true; quote: ExchangeQuote }
  | { ok: false; reason: QuoteFailureReason };

/** Money is rounded to minor units once, here, so totals never drift. */
function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

let quoteCounter = 0;

/**
 * Synchronous on purpose: the flow re-quotes on every keystroke, and a mock
 * that returned a promise would invite loading states the real endpoint will
 * not need for a cached rate table. When this becomes a network call, wrap it
 * — the result shape stays the same.
 */
export function getExchangeQuote({
  sourceCurrency,
  destinationCurrency,
  sourceAmount,
}: ExchangeQuoteRequest): ExchangeQuoteResult {
  const source = UNITS_PER_USD[sourceCurrency];
  const destination = UNITS_PER_USD[destinationCurrency];

  if (source === undefined || destination === undefined) {
    return { ok: false, reason: "unsupported-currency" };
  }
  if (sourceCurrency === destinationCurrency) {
    return { ok: false, reason: "same-currency" };
  }
  if (!Number.isFinite(sourceAmount) || sourceAmount <= 0) {
    return { ok: false, reason: "invalid-amount" };
  }

  const appliedRate = destination / source;

  quoteCounter += 1;

  return {
    ok: true,
    quote: {
      sourceCurrency,
      destinationCurrency,
      sourceAmount: roundToCents(sourceAmount),
      destinationAmount: roundToCents(sourceAmount * appliedRate),
      appliedRate,
      quoteId: `Q-${quoteCounter}`,
      quotedAt: new Date().toISOString(),
    },
  };
}
