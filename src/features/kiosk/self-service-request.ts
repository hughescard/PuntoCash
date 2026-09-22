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
 *   giros-enviar  → the whole giro prefilled and opened on "Revisar giro":
 *                   the worker only receives the cash and confirms.
 *   giros-cobrar  → giro found automatically; the worker checks the carné
 *                   photo against the person and pays.
 *
 * FRONTEND-ONLY MOCK STORAGE: requests live in `localStorage` (not a plain
 * array) because a demo runs the kiosk and the counter in different browser
 * tabs, which do not share module memory. A real backend replaces this.
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
  quote: ExchangeQuote;
  client: KioskClientInput;
}

export interface RemesaRequestData {
  code: string;
  remittance: RemittanceSnapshot;
}

export interface GiroEnviarRequestData {
  sender: KioskClientInput;
  beneficiary: KioskBeneficiaryInput;
  senderCurrency: string;
  deliveryAmount: number;
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
}

export type KioskRequest =
  | (KioskRequestBase & { service: "cambio-moneda"; data: CambioMonedaRequestData })
  | (KioskRequestBase & { service: "remesas"; data: RemesaRequestData })
  | (KioskRequestBase & { service: "giros-enviar"; data: GiroEnviarRequestData })
  | (KioskRequestBase & { service: "giros-cobrar"; data: GiroCobrarRequestData });

export type KioskRequestService = KioskRequest["service"];

/** How long a request stays valid before the client would need a new one. */
const VALIDITY_MINUTES = 30;

const STORAGE_KEY = "puntocash.kiosk.requests";

/** Fallback when storage is unavailable (private mode, blocked site data). */
let memoryRequests: KioskRequest[] = [];

function loadRequests(): KioskRequest[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as KioskRequest[]) : memoryRequests;
  } catch {
    return memoryRequests;
  }
}

function saveRequests(list: KioskRequest[]): void {
  memoryRequests = list;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Memory copy above is still valid for this tab.
  }
}

/** Continues the day's numbering across tabs instead of restarting at 101. */
let sequence = 100;

/** "KS-260915-000101" — visually distinct from PC-/RM-/TR- codes (§16 of the Worker PRD). */
function generateRequestCode(now: Date): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const prefix = `KS-${yy}${mm}${dd}-`;
  for (const item of loadRequests()) {
    if (item.code.startsWith(prefix)) sequence = Math.max(sequence, Number(item.code.slice(prefix.length)));
  }
  sequence += 1;
  return `KS-${yy}${mm}${dd}-${String(sequence).padStart(6, "0")}`;
}

function buildBase(now: Date): KioskRequestBase {
  const createdAt = now;
  const expiresAt = new Date(now.getTime() + VALIDITY_MINUTES * 60_000);
  return {
    code: generateRequestCode(now),
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    consumedAt: null,
  };
}

export function registerSelfServiceRequest(
  input:
    | { service: "cambio-moneda"; data: CambioMonedaRequestData }
    | { service: "remesas"; data: RemesaRequestData }
    | { service: "giros-enviar"; data: GiroEnviarRequestData }
    | { service: "giros-cobrar"; data: GiroCobrarRequestData },
): KioskRequest {
  const request = { ...buildBase(new Date()), ...input } as KioskRequest;
  saveRequests([...loadRequests(), request]);
  return request;
}

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

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export type SelfServiceLookupResult =
  | { ok: true; request: KioskRequest }
  /**
   * Unlike a client-facing lookup (Worker PRD R4 — one opaque rejection),
   * this screen is staff-only: a worker benefits from knowing whether a code
   * was mistyped, has expired, or was already redeemed by a colleague, so
   * each reason surfaces distinctly here.
   */
  | { ok: false; reason: "not-found" | "expired" | "consumed" };

/** `GET`-shaped lookup for Worker's "Buscar solicitud" screen. */
export function findSelfServiceRequestByCode(code: string, now: Date = new Date()): SelfServiceLookupResult {
  const normalized = normalizeCode(code);
  const request = loadRequests().find((item) => item.code === normalized);
  if (!request) return { ok: false, reason: "not-found" };
  if (request.consumedAt) return { ok: false, reason: "consumed" };
  if (new Date(request.expiresAt).getTime() < now.getTime()) return { ok: false, reason: "expired" };
  return { ok: true, request };
}

/** Marks a request redeemed so the same `KS-…` code cannot hand off twice. */
export function markSelfServiceRequestConsumed(code: string, now: Date = new Date()): void {
  const normalized = normalizeCode(code);
  saveRequests(
    loadRequests().map((item) =>
      item.code === normalized ? { ...item, consumedAt: now.toISOString() } : item,
    ),
  );
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
