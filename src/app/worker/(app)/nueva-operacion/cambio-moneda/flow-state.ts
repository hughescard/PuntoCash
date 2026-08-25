import type { ExchangeQuote } from "@/features/exchange/quote";
import type { Customer } from "@/features/customers/customers";

/**
 * State machine for the Cambio de moneda operation.
 *
 * Explicit reducer rather than a store: the flow is local to one route, dies
 * when the worker leaves, and every transition is a named action that can be
 * read in one screen of code.
 *
 * Going backwards never discards anything — `step` moves, the data does not.
 */

export type StepId = "cambio" | "cliente" | "revision" | "completado";

/** The three steps shown in the stepper; the result is not a step. */
export const FLOW_STEPS = [
  { id: "cambio", label: "Cambio" },
  { id: "cliente", label: "Cliente" },
  { id: "revision", label: "Revisión" },
] as const;

export interface CompletedOperation {
  code: string;
  quote: ExchangeQuote;
  customer: Customer;
  worker: string;
  register: string;
  completedAt: string;
}

export interface FlowState {
  step: StepId;
  sourceCurrency: string;
  destinationCurrency: string;
  /** Raw text as typed; parsed at the edge so the worker can type freely. */
  amountInput: string;
  /**
   * The quote committed when leaving step 1 — the operation's rate snapshot.
   * Later rate changes must never rewrite a reviewed operation (§20), so
   * steps 2 and 3 read this and never re-quote.
   */
  quote: ExchangeQuote | null;
  customer: Customer | null;
  submitting: boolean;
  completed: CompletedOperation | null;
  /**
   * Whether the worker has actually touched anything. The screen opens with
   * demo values, and prefilled defaults are not "entered data" for the purpose
   * of warning before discarding (§17).
   */
  touched: boolean;
}

export const INITIAL_STATE: FlowState = {
  step: "cambio",
  sourceCurrency: "USD",
  destinationCurrency: "EUR",
  amountInput: "1.000,00",
  quote: null,
  customer: null,
  submitting: false,
  completed: null,
  touched: false,
};

export type FlowAction =
  | { type: "set-source-currency"; currency: string }
  | { type: "set-destination-currency"; currency: string }
  | { type: "set-amount"; value: string }
  | { type: "swap-currencies" }
  | { type: "commit-quote"; quote: ExchangeQuote }
  | { type: "select-customer"; customer: Customer }
  | { type: "clear-customer" }
  | { type: "go-to-step"; step: StepId }
  | { type: "submit-start" }
  | { type: "submit-success"; operation: CompletedOperation }
  | { type: "submit-failure" };

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "set-source-currency": {
      // The two sides can never be the same currency: adopting a value the
      // other side holds swaps them rather than producing an invalid pair.
      const collides = action.currency === state.destinationCurrency;
      return {
        ...state,
        touched: true,
        sourceCurrency: action.currency,
        destinationCurrency: collides ? state.sourceCurrency : state.destinationCurrency,
      };
    }

    case "set-destination-currency": {
      const collides = action.currency === state.sourceCurrency;
      return {
        ...state,
        touched: true,
        destinationCurrency: action.currency,
        sourceCurrency: collides ? state.destinationCurrency : state.sourceCurrency,
      };
    }

    case "set-amount":
      return { ...state, touched: true, amountInput: action.value };

    case "swap-currencies":
      return {
        ...state,
        touched: true,
        sourceCurrency: state.destinationCurrency,
        destinationCurrency: state.sourceCurrency,
      };

    case "commit-quote":
      return { ...state, quote: action.quote, step: "cliente" };

    case "select-customer":
      return { ...state, touched: true, customer: action.customer, step: "revision" };

    case "clear-customer":
      return { ...state, customer: null };

    case "go-to-step":
      return { ...state, step: action.step };

    case "submit-start":
      return { ...state, submitting: true };

    case "submit-success":
      return {
        ...state,
        submitting: false,
        completed: action.operation,
        step: "completado",
      };

    case "submit-failure":
      return { ...state, submitting: false };

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

/**
 * Whether abandoning now would lose work the worker did. Used to decide
 * between leaving straight away and asking first (§17).
 */
export function hasMeaningfulData(state: FlowState): boolean {
  return state.touched || state.customer !== null || state.step !== "cambio";
}

export function stepIndex(step: StepId): number {
  const index = FLOW_STEPS.findIndex((s) => s.id === step);
  // The result screen sits past the last step.
  return index === -1 ? FLOW_STEPS.length : index;
}

/**
 * Operation code, allocated only once the operation actually succeeds (§16) —
 * never reserved earlier, so a cancelled flow burns no identifier.
 */
export function generateOperationCode(now: Date, sequence: number): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `PC-${yy}${mm}${dd}-${String(sequence).padStart(6, "0")}`;
}
