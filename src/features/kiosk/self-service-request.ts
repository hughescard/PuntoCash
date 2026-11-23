import type { DocumentType } from "@/features/customers/customers";
import type { ExchangeQuote } from "@/features/exchange/quote";
import type { RemittanceSnapshot } from "@/features/remittances/remittance-provider";
import type { TransferPayoutSnapshot } from "@/features/transfers/transfer-provider";
import type { KioskServiceId } from "./kiosk-catalog";

/**
 * FRONTEND-ONLY MOCK of the self-service "solicitud" (request) a kiosk
 * produces.
 *
 * A request is NOT an Operación in the Worker sense (see the Worker PRD §4):
 * it moves no cash, registers nothing against a Caja, and carries no
 * provider confirmation. It is only ever the data a client entered at the
 * kiosk, stamped with a code and a short validity window, so a Worker can
 * pick it up at the counter, verify the client's identity in person, and run
 * the real operation from there. Calling it anything closer to "operación" or
 * "comprobante" would misstate what actually happened, so the product and the
 * code both call it a "solicitud".
 *
 * Worker's "Buscar solicitud" screen (`/worker/nueva-operacion/solicitud`)
 * reads these back with `findSelfServiceRequestByCode`, marks the request
 * consumed, and opens the matching operation flow prefilled from `data`:
 *
 *   cambio-moneda → pair + amount prefilled, live quote recomputed; customer
 *                   pre-searched by document, the worker verifies and selects.
 *   remesas       → remittance found automatically; the worker verifies the
 *                   beneficiary's document in person (R5).
 *   giros-enviar  → sender pre-searched by document, the worker verifies and
 *                   selects (as in cambio-moneda); the rest of the giro is
 *                   prefilled, so it then opens on "Revisar giro".
 *   giros-cobrar  → giro found automatically; the worker checks the carné
 *                   photo against the person and pays.
 *
 * Las solicitudes viven en la red (`features/network/solicitudes-de-kiosco.ts`):
 * las registra el servidor con la sede y el kiosco del vínculo, y solo una
 * caja de esa sede las canjea. Este módulo tiene únicamente su forma y lo que
 * el navegador necesita de ellas.
 */

/** Minimal self-declared contact info the kiosk collects — never verified there (Worker PRD R5). */
export interface KioskClientInput {
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  firstSurname: string;
  secondSurname: string;
  phone: string;
}

export function kioskClientFullName(client: KioskClientInput): string {
  return [client.firstName, client.firstSurname, client.secondSurname].filter(Boolean).join(" ");
}

/** Beneficiary data for a Giro sent from the kiosk — API-shaped like the Worker's own (§ enviar giro). */
export interface KioskBeneficiaryInput {
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  /** Province catalog code — see `@/features/geography/cuba-provinces`. */
  receiverProvince: string;
  /** Municipality catalog code. */
  receiverMunicipality: string;
  /** Beneficiary's carné number — required by `POST /api/transfers`. */
  receiverIdentification: string;
}

export interface CambioMonedaRequestData {
  /** La cotización que vio el cliente, con las tasas de su sede en ese momento. */
  quote: ExchangeQuote;
  client: KioskClientInput;
  /**
   * Cómo lo pidió: diciendo cuánto entrega («cambiar») o cuánto quiere
   * recibir («recibir»). La caja vuelve a cotizar de la misma forma, con las
   * tasas del momento en que lo atiende. Sin él, «cambiar».
   */
  modo?: "cambiar" | "recibir";
  /** Lo que escribió: lo que entrega con «cambiar», lo que quiere recibir con «recibir». */
  importePedido?: number;
}

export interface RemesaRequestData {
  code: string;
  remittance: RemittanceSnapshot;
}

export interface GiroEnviarRequestData {
  sender: KioskClientInput;
  beneficiary: KioskBeneficiaryInput;
  senderCurrency: string;
  /**
   * El importe que dijo el cliente. Con `forma: "enviar"`, lo que entrega él;
   * con `"llegar"` (o sin forma, como hoy), lo que recibe el beneficiario.
   */
  deliveryAmount: number;
  /**
   * Cómo pidió el giro: «enviar», diciendo cuánto entrega, o «llegar»,
   * diciendo cuánto recibe el beneficiario. Sin él, «llegar».
   */
  forma?: "enviar" | "llegar";
  /**
   * Lo que el kiosco le enseñó: lo que recibe el beneficiario, la tarifa y
   * el total. La caja vuelve a cotizar con la tarifa del momento y, si no
   * coincide, se lo dice al trabajador.
   */
  cotizacion?: { giro: number; tarifa: number; total: number };
}

export interface GiroCobrarRequestData {
  code: string;
  transfer: TransferPayoutSnapshot;
}

interface KioskRequestBase {
  code: string;
  createdAt: string;
  /** Requests are only held at the counter for a short window (demo default: 30 minutes). */
  expiresAt: string;
  /** Set once a Worker picks the request up via "Buscar solicitud" — see `markSelfServiceRequestConsumed`. */
  consumedAt: string | null;
  /**
   * La sede del kiosco que la preparó. Solo una caja de esa sede la canjea:
   * lo que el cliente vio —tasas, servicios— es lo de esa sede.
   */
  branchId: string;
  /** El kiosco que la preparó, para poder rastrearla. */
  deviceId: string;
}

export type KioskRequest =
  | (KioskRequestBase & { service: "cambio-moneda"; data: CambioMonedaRequestData })
  | (KioskRequestBase & { service: "remesas"; data: RemesaRequestData })
  | (KioskRequestBase & { service: "giros-enviar"; data: GiroEnviarRequestData })
  | (KioskRequestBase & { service: "giros-cobrar"; data: GiroCobrarRequestData });

export type KioskRequestService = KioskRequest["service"];

/** Lo que el kiosco envía; el código, la vigencia, la sede y el kiosco los pone la red. */
export type KioskRequestInput =
  | { service: "cambio-moneda"; data: CambioMonedaRequestData }
  | { service: "remesas"; data: RemesaRequestData }
  | { service: "giros-enviar"; data: GiroEnviarRequestData }
  | { service: "giros-cobrar"; data: GiroCobrarRequestData };

/** Maps a home-screen service id to the two possible Giro request flavours. */
export type KioskFlowId = KioskServiceId | "giros-enviar" | "giros-cobrar";

/**
 * Birth date encoded in a Cuban carné de identidad (11 digits: YYMMDD + a
 * century digit + 4 more). 9 → 1800s, 0-5 → 1900s, 6-8 → 2000s. Returns
 * "yyyy-mm-dd", or "" when the number is not a valid CI — callers then leave
 * the field for the worker to fill in.
 */
export function birthDateFromCubanId(documentNumber: string): string {
  const digits = documentNumber.trim();
  if (!/^\d{11}$/.test(digits)) return "";
  const yy = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const dd = Number(digits.slice(4, 6));
  const centuryDigit = Number(digits[6]);
  const century = centuryDigit === 9 ? 1800 : centuryDigit <= 5 ? 1900 : 2000;
  const year = century + yy;
  const date = new Date(Date.UTC(year, mm - 1, dd));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return "";
  return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/**
 * In-tab handoff from "Buscar solicitud" into the target operation flow —
 * the same cross-flow idea `transferProvider` uses for `payoutRecords`,
 * scoped to a single pending prefill.
 *
 * Set right before `router.push`. The destination reads it in its initial
 * state with `readPendingWorkerHandoff` (non-destructive, because React's
 * Strict Mode may call initializers twice) and clears it in a mount effect
 * with `clearPendingWorkerHandoff`, so a later visit to the same route never
 * reapplies a stale prefill.
 */
let pendingHandoff: KioskRequest | null = null;

export function setPendingWorkerHandoff(request: KioskRequest): void {
  pendingHandoff = request;
}

/** The pending handoff, only if it belongs to the flow asking for it. */
export function readPendingWorkerHandoff<S extends KioskRequestService>(
  service: S,
): Extract<KioskRequest, { service: S }> | null {
  if (!pendingHandoff || pendingHandoff.service !== service) return null;
  return pendingHandoff as Extract<KioskRequest, { service: S }>;
}

export function clearPendingWorkerHandoff(): void {
  pendingHandoff = null;
}
