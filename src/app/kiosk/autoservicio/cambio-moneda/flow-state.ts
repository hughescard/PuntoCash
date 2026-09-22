import type { ExchangeQuote } from "@/features/exchange/quote";
import type { KioskClientInput, KioskRequest } from "@/features/kiosk/self-service-request";

/**
 * State machine for the kiosk's Cambio de moneda request.
 *
 * Shaped after the Worker flow's own reducer (`@/app/worker/.../cambio-moneda/flow-state.ts`),
 * minus everything that only makes sense once cash is actually involved: there
 * is no Caja here, so there is no cash check and no submit-time revalidation
 * against a register balance — the kiosk only ever prepares numbers for a
 * Worker to act on.
 */
export type StepId = "datos" | "cliente" | "revision" | "solicitud";

export const FLOW_STEPS = [
  { id: "datos", label: "Cambio" },
  { id: "cliente", label: "Tus datos" },
  { id: "revision", label: "Revisión" },
] as const;

export const EMPTY_CLIENT: KioskClientInput = {
  documentType: "CI",
  documentNumber: "",
  firstName: "",
  firstSurname: "",
  secondSurname: "",
  phone: "",
};

export interface FlowState {
  step: StepId;
  sourceCurrency: string;
  destinationCurrency: string;
  amountInput: string;
  /** Committed when leaving step 1, so a later live rate change never rewrites a reviewed request. */
  quote: ExchangeQuote | null;
  client: KioskClientInput;
  submitting: boolean;
  request: KioskRequest | null;
  touched: boolean;
}

export const INITIAL_STATE: FlowState = {
  step: "datos",
  sourceCurrency: "USD",
  destinationCurrency: "CUP",
  amountInput: "100,00",
  quote: null,
  client: EMPTY_CLIENT,
  submitting: false,
  request: null,
  touched: false,
};

export type FlowAction =
  | { type: "set-source-currency"; currency: string }
  | { type: "set-destination-currency"; currency: string }
  | { type: "set-amount"; value: string }
  | { type: "swap-currencies" }
  | { type: "commit-quote"; quote: ExchangeQuote }
  | { type: "set-client"; client: KioskClientInput }
  | { type: "go-to-step"; step: StepId }
  | { type: "submit-start" }
  | { type: "submit-success"; request: KioskRequest }
  | { type: "submit-failure" }
  | { type: "reset" };

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "set-source-currency": {
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
    case "set-client":
      return { ...state, touched: true, client: action.client };
    case "go-to-step":
      return { ...state, step: action.step };
    case "submit-start":
      return { ...state, submitting: true };
    case "submit-success":
      return { ...state, submitting: false, request: action.request, step: "solicitud" };
    case "submit-failure":
      return { ...state, submitting: false };
    case "reset":
      return INITIAL_STATE;
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function hasMeaningfulData(state: FlowState): boolean {
  return state.touched || state.step !== "datos";
}

export function stepIndex(step: StepId): number {
  const index = FLOW_STEPS.findIndex((s) => s.id === step);
  return index === -1 ? FLOW_STEPS.length : index;
}
