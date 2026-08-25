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
