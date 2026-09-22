import type { DocumentType } from "./customers";

/**
 * FRONTEND-ONLY MOCK of the document/QR scanner.
 *
 * No camera is opened and no hardware permission is requested — this simulates
 * the reading so the surrounding flow can be built and reviewed. The UI states
 * plainly that it is a simulation; it must never imply a real scan occurred.
 *
 * A real scanner replaces `simulateDocumentScan` and nothing else: the flow only
 * consumes `ScannedDocument`.
 */
export interface ScannedDocument {
  documentType: DocumentType;
  documentNumber: string;
}

/** The two outcomes a worker needs to rehearse. */
export type ScanScenario = "registered" | "unregistered";

export const SCAN_SCENARIOS = [
  {
    id: "registered",
    label: "Simular documento registrado",
    hint: "Lee un carné que ya existe en PuntoCash.",
  },
  {
    id: "unregistered",
    label: "Simular documento no registrado",
    hint: "Lee un carné sin cliente asociado.",
  },
] as const satisfies readonly { id: ScanScenario; label: string; hint: string }[];

/** Simulated read latency, so the scanning state is actually observable. */
const SCAN_MS = 700;

export async function simulateDocumentScan(
  scenario: ScanScenario,
): Promise<ScannedDocument> {
  await new Promise((resolve) => setTimeout(resolve, SCAN_MS));

  return scenario === "registered"
    ? { documentType: "CI", documentNumber: "90010112345" }
    : { documentType: "CI", documentNumber: "04052398765" };
}

/* -------------------------------------------------------------------------
 * Kiosk — full carné read
 * ---------------------------------------------------------------------- */

/**
 * What the QR on a Cuban carné de identidad yields for the kiosk's
 * self-entry form: the document itself plus the holder's name. Contact data
 * (phone) is not on the card, so the client still types that in.
 *
 * Unlike the Worker read above, the kiosk has no customer to look up — it
 * only pre-fills the fields the client would otherwise type.
 */
export interface ScannedIdentityCard extends ScannedDocument {
  documentType: "CI";
  firstName: string;
  firstSurname: string;
  secondSurname: string;
}

export type IdentityCardScanResult =
  | { ok: true; card: ScannedIdentityCard }
  /** A real reader can time out or fail to decode — the kiosk must say so and fall back to typing. */
  | { ok: false; reason: "unreadable" };

/** Simulated time for the client to present the card and the reader to decode it. */
const CARD_SCAN_MS = 1_500;

/**
 * FRONTEND-ONLY MOCK of the kiosk's built-in QR reader. Always succeeds with
 * the same demo card; a real reader replaces this function and nothing else.
 * `signal` lets the client cancel while the reader is waiting for the card.
 */
export async function simulateIdentityCardScan(signal?: AbortSignal): Promise<IdentityCardScanResult> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, CARD_SCAN_MS);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Scan cancelled", "AbortError"));
    });
  });

  return {
    ok: true,
    card: {
      documentType: "CI",
      documentNumber: "88030512345",
      firstName: "Laura",
      firstSurname: "Hernández",
      secondSurname: "Soto",
    },
  };
}
