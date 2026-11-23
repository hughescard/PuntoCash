import type { ExchangeQuote } from "@/features/exchange/quote";
import type { Customer } from "@/features/customers/customers";
import { readPendingWorkerHandoff, type KioskClientInput } from "@/features/kiosk/self-service-request";
import { formatAmount } from "@/lib/format";
import type { EfectivoRegistrado } from "@/features/network/caja-operativa";
import type { OperationLiquidation } from "@/features/operations/operations-history";

/**
 * State machine for the Cambio de moneda operation.
 *
 * Explicit reducer rather than a store: the flow is local to one route, dies
 * when the worker leaves, and every transition is a named action that can be
 * read in one screen of code.
 *
 * Going backwards never discards anything — `step` moves, the data does not.
 */

export type StepId = "cambio" | "cliente" | "efectivo" | "revision" | "completado";

/** «Cambiar X»: el cliente dice cuánto entrega. «Recibir Y»: dice cuánto quiere recibir. */
export type ModoDeCambio = "cambiar" | "recibir";

/** The four steps shown in the stepper; the result is not a step. */
export const FLOW_STEPS = [
  { id: "cambio", label: "Cambio" },
  { id: "cliente", label: "Cliente" },
  { id: "efectivo", label: "Efectivo" },
  { id: "revision", label: "Revisión" },
] as const;

export interface CompletedOperation {
  code: string;
  quote: ExchangeQuote;
  customer: Customer;
  worker: string;
  register: string;
  completedAt: string;
  /** Vuelto, resto en CUP y lo que quedó a favor de la casa: consta en el comprobante. */
  liquidacion?: OperationLiquidation;
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
  /** Qué escribe el trabajador en el primer paso: lo que entrega o lo que quiere recibir el cliente. */
  modo: ModoDeCambio;
  /** Los billetes del cambio (bloque 4): paga, vuelto y entrega, cuando cuadran. */
  efectivo: EfectivoRegistrado | null;
  /** Sube cuando hay que pedir otra vez la propuesta de billetes (tras un recuento). */
  recarga: number;
  /**
   * Whether the worker has actually touched anything. The screen opens with
   * demo values, and prefilled defaults are not "entered data" for the purpose
   * of warning before discarding (§17).
   */
  touched: boolean;
  /**
   * Set only when the flow was opened from "Buscar solicitud": the kiosk code
   * and the client's self-declared data, used to pre-run the customer search
   * on step 2. It never selects a customer by itself — the worker still checks
   * the document in person and selects (Worker PRD R5).
   */
  kioskCode: string | null;
  kioskClient: KioskClientInput | null;
  /**
   * Lo que el kiosco le enseñó al cliente. La caja no lo aplica —cotiza de
   * nuevo con la tasa de ahora—, pero si no coincide, se lo dice al
   * trabajador para que se lo explique al cliente.
   */
  kioskQuote: ExchangeQuote | null;
}

/** Fallback demo starting point when no "Buscar solicitud" handoff is pending. */
const DEFAULT_STATE: FlowState = {
  step: "cambio",
  sourceCurrency: "USD",
  destinationCurrency: "CUP",
  amountInput: "1.000,00",
  quote: null,
  customer: null,
  submitting: false,
  completed: null,
  modo: "cambiar",
  efectivo: null,
  recarga: 0,
  touched: false,
  kioskCode: null,
  kioskClient: null,
  kioskQuote: null,
};

/**
 * Lazy initial state for `useReducer`. If a worker just arrived here from
 * "Buscar solicitud" (`/worker/nueva-operacion/solicitud`), this is the ONE
 * place that prefill is applied: the pair, the way the client asked for it
 * («cambiar» o «recibir») and the amount, plus the client's data for step 2.
 *
 * The flow then re-quotes at once with the sede's rate of NOW and commits it
 * by itself (`cambio-moneda-flow.tsx`), so the worker lands on «Cliente»: the
 * kiosk already did everything that comes before the cash. On step 2 the
 * customer is only pre-searched by the client's document — never
 * auto-selected (Worker PRD R5).
 */
export function createInitialState(): FlowState {
  const handoff = readPendingWorkerHandoff("cambio-moneda");
  if (!handoff) return DEFAULT_STATE;

  const { quote, modo = "cambiar", importePedido } = handoff.data;
  const importe = importePedido ?? (modo === "recibir" ? quote.destinationAmount : quote.sourceAmount);
  return {
    ...DEFAULT_STATE,
    sourceCurrency: quote.sourceCurrency,
    destinationCurrency: quote.destinationCurrency,
    modo,
    amountInput: formatAmount(importe, 2),
    kioskCode: handoff.code,
    kioskClient: handoff.data.client,
    kioskQuote: quote,
  };
}

export type FlowAction =
  | { type: "set-source-currency"; currency: string }
  | { type: "set-destination-currency"; currency: string }
  | { type: "set-amount"; value: string }
  | { type: "swap-currencies" }
  | { type: "set-modo"; modo: ModoDeCambio }
  | { type: "set-efectivo"; efectivo: EfectivoRegistrado | null }
  | { type: "recargar-efectivo" }
  /** Salida (a): el cliente cambia otro importe, que sí se paga entero. */
  | { type: "cambiar-otro-importe"; quote: ExchangeQuote }
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

    case "set-modo":
      return { ...state, touched: true, modo: action.modo, amountInput: "" };

    case "set-efectivo":
      return { ...state, efectivo: action.efectivo };

    case "recargar-efectivo":
      return { ...state, recarga: state.recarga + 1 };

    case "cambiar-otro-importe":
      /* El cliente sigue siendo el mismo; solo cambia el importe y hay que volver a marcar los billetes. */
      return {
        ...state,
        quote: action.quote,
        modo: "cambiar",
        amountInput: formatAmount(action.quote.sourceAmount, 2),
        efectivo: null,
        step: "efectivo",
      };

    case "commit-quote":
      return { ...state, quote: action.quote, efectivo: null, step: "cliente" };

    case "select-customer":
      return { ...state, touched: true, customer: action.customer, step: "efectivo" };

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
