/**
 * Formatting helpers for financial data — manual §12 "Importes" and §17 "Números".
 *
 *   · "Utilizar separadores de miles y decimales consistentes según la
 *      configuración regional."
 *   · "Nunca depender sólo del color para comunicar el signo o el estado."
 *
 * Every amount rendered in PuntoCash should go through these helpers so the
 * separators, decimal places and alignment never drift between screens.
 */

/** Application locale. Spanish is the operational language of the product. */
export const LOCALE = "es-ES" as const;

/** Currency codes stay visible next to the figure — never hidden (§15). */
export interface Money {
  /** Amount in major units. */
  amount: number;
  /** ISO 4217 code, e.g. "USD", "EUR". */
  currency: string;
}

/**
 * Formats an amount with grouped thousands and a fixed number of decimals.
 * Returns the figure only; render the currency code alongside it.
 */
export function formatAmount(amount: number, fractionDigits = 2): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: true,
  }).format(amount);
}

/** Formats an amount together with its currency code: "1.250,00 USD". */
export function formatMoney({ amount, currency }: Money, fractionDigits = 2): string {
  return `${formatAmount(amount, fractionDigits)} ${currency}`;
}

/**
 * Exchange rates need more precision than amounts, so they carry their own
 * formatter rather than reusing the 2-decimal money rule.
 */
export function formatRate(rate: number, fractionDigits = 4): string {
  return formatAmount(rate, fractionDigits);
}

/**
 * Signed amount with an explicit "+"/"−" so direction survives without colour
 * (§12). The minus sign is U+2212, which aligns with tabular figures.
 */
export function formatSignedAmount(amount: number, fractionDigits = 2): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${sign}${formatAmount(Math.abs(amount), fractionDigits)}`;
}

/**
 * Parses an amount a worker typed, in either separator convention.
 *
 * es-ES writes "1.000,50" but a worker may type "1000.50" out of habit, and
 * silently reading that as one hundred thousand would be a serious error in a
 * cash terminal. So the LAST separator decides: if it is followed by one or two
 * digits it is the decimal mark, otherwise every separator is grouping.
 *
 *   "1.000,50" → 1000.5    "1000.50" → 1000.5
 *   "1.000"    → 1000      "1,000"   → 1000
 *
 * Returns `null` when the text is not a usable number, so callers decide what
 * to tell the worker rather than silently receiving NaN or 0.
 */
export function parseAmountInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[\d.,\s]+$/.test(trimmed)) return null;

  const compact = trimmed.replace(/\s/g, "");
  const lastSeparator = Math.max(compact.lastIndexOf(","), compact.lastIndexOf("."));

  let normalized: string;
  if (lastSeparator === -1) {
    normalized = compact;
  } else {
    const decimals = compact.slice(lastSeparator + 1);
    normalized =
      decimals.length >= 1 && decimals.length <= 2 && /^\d+$/.test(decimals)
        ? `${compact.slice(0, lastSeparator).replace(/[.,]/g, "")}.${decimals}`
        : compact.replace(/[.,]/g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Currency option label: "USD — Dólar estadounidense" (§15 "Moneda"). */
export function formatCurrencyOption(code: string, name: string): string {
  return `${code} — ${name}`;
}

/**
 * Date and time for financial operation records and tickets (§21).
 *
 * PuntoCash's canonical operation timestamp is "dd/MM/yyyy · HH:mm" —
 * zero-padded day/month, four-digit year, 24-hour time, joined with " · ".
 * `Intl.DateTimeFormat`'s locale-driven "short" styles do not guarantee this
 * (es-ES renders a 2-digit year and a comma separator: "18/8/26, 12:13"), so
 * the parts are read individually and assembled explicitly instead.
 */
export function formatDateTime(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");

  const day = pad(value.getDate());
  const month = pad(value.getMonth() + 1);
  const year = value.getFullYear();
  const hours = pad(value.getHours());
  const minutes = pad(value.getMinutes());

  return `${day}/${month}/${year} · ${hours}:${minutes}`;
}

export function formatDate(value: Date): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium" }).format(value);
}

/**
 * Reads a calendar date ("1990-01-01") as that day in local time.
 *
 * `new Date("1990-01-01")` is parsed as UTC midnight, which in any negative
 * offset renders as the previous day — a date of birth would display as
 * 31 dic 1989. Calendar dates carry no timezone, so they are built from parts.
 */
export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** Formats a stored calendar date without shifting it across a timezone. */
export function formatIsoDate(value: string): string {
  return formatDate(parseIsoDate(value));
}
