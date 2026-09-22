import type { KioskBeneficiaryInput, KioskClientInput, KioskRequest } from "@/features/kiosk/self-service-request";

/**
 * State machine for the kiosk's "Enviar giro" request.
 *
 * Shaped after `@/app/kiosk/autoservicio/cambio-moneda/flow-state.ts`: no
 * Caja, no jornada check, no submit-time cash revalidation — the kiosk only
 * ever prepares the sender, beneficiary and amount for a Worker to register
 * as a real giro at the counter (see the domain note in
 * `@/features/kiosk/self-service-request`).
 */
export type StepId = "remitente" | "beneficiario" | "monto" | "revision" | "solicitud";

export const FLOW_STEPS = [
  { id: "remitente", label: "Remitente" },
  { id: "beneficiario", label: "Beneficiario" },
  { id: "monto", label: "Monto" },
  { id: "revision", label: "Revisión" },
] as const;

export const EMPTY_SENDER: KioskClientInput = {
  documentType: "CI",
  documentNumber: "",
  firstName: "",
  firstSurname: "",
  secondSurname: "",
  phone: "",
};

export const EMPTY_BENEFICIARY: KioskBeneficiaryInput = {
  receiverName: "",
  receiverPhone: "",
  receiverAddress: "",
  receiverProvince: "",
  receiverMunicipality: "",
  receiverIdentification: "",
};

export interface FlowState {
  step: StepId;
  sender: KioskClientInput;
  beneficiary: KioskBeneficiaryInput;
  senderCurrency: string;
  amountInput: string;
  submitting: boolean;
  request: KioskRequest | null;
  touched: boolean;
}

export const INITIAL_STATE: FlowState = {
  step: "remitente",
  sender: EMPTY_SENDER,
  beneficiary: EMPTY_BENEFICIARY,
  senderCurrency: "USD",
  amountInput: "",
  submitting: false,
  request: null,
  touched: false,
};

export type FlowAction =
  | { type: "set-sender"; sender: KioskClientInput }
  | { type: "set-beneficiary"; beneficiary: KioskBeneficiaryInput }
  | { type: "set-currency"; currency: string }
  | { type: "set-amount"; value: string }
  | { type: "go-to-step"; step: StepId }
  | { type: "submit-start" }
  | { type: "submit-success"; request: KioskRequest }
  | { type: "submit-failure" };

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "set-sender":
      return { ...state, touched: true, sender: action.sender };
    case "set-beneficiary":
      return { ...state, touched: true, beneficiary: action.beneficiary };
    case "set-currency":
      return { ...state, touched: true, senderCurrency: action.currency };
    case "set-amount":
      return { ...state, touched: true, amountInput: action.value };
    case "go-to-step":
      return { ...state, step: action.step };
    case "submit-start":
      return { ...state, submitting: true };
    case "submit-success":
      return { ...state, submitting: false, request: action.request, step: "solicitud" };
    case "submit-failure":
      return { ...state, submitting: false };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function hasMeaningfulData(state: FlowState): boolean {
  return state.touched || state.step !== "remitente";
}

export function stepIndex(step: StepId): number {
  const index = FLOW_STEPS.findIndex((s) => s.id === step);
  return index === -1 ? FLOW_STEPS.length : index;
}
