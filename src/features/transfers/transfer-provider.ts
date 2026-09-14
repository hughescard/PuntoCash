import {
  DELIVERY_METHODS,
  DELIVERY_METHOD_LABEL,
  REMITTANCE_STATUSES,
  type DeliveryMethod,
  type RemittanceStatus,
} from "@/features/remittances/remittance-provider";

/**
 * API-shaped boundary for `POST /api/transfers` — the external service that
 * creates a Giro. Field names match the documented request DTO exactly (§7):
 * do not rename them into presentation labels — that mapping happens only in
 * the UI layer, never here.
 *
 * `deliveryMethod` reuses the same raw enum Remesas already established
 * (`delivery` | `transfer` | `pickup`) rather than redefining it — PuntoCash
 * only ever sends `"pickup"` for this flow (§9-10), but the type stays
 * API-complete so a future delivery method needs no provider-boundary change.
 */
export { DELIVERY_METHODS, DELIVERY_METHOD_LABEL, type DeliveryMethod };

/**
 * Service status enum, exactly as the API returns it. Shared with Remesas
 * because it is the *service* status, not a per-product one — re-exported
 * here under a transfer-facing name so this flow never has to import from
 * the remittance module to spell its own domain.
 *
 * The Spanish strings below are presentation only (§ raw enums are never
 * shown, never stored as labels, never compared against labels), and differ
 * from the Remesas wording on purpose: a Giro is "pagado", not "entregado".
 */
export const TRANSFER_STATUSES = REMITTANCE_STATUSES;
export type TransferStatus = RemittanceStatus;

export const TRANSFER_STATUS_LABEL: Record<TransferStatus, string> = {
  COMPLETED: "Completado",
  IN_TRANSIT: "En tránsito",
  READY: "Lista para pago",
  PENDING_PAYMENT: "Pendiente de pago",
  PAYED: "Pagado",
  DENIED_PAYMENT: "Pago denegado",
  PAYOUT_DENIED: "Entrega denegada",
};

/** Only `READY` authorises a physical payout — `COMPLETED` was already paid. */
export function isPayableStatus(status: TransferStatus): boolean {
  return status === "READY";
}

export interface TransferCreatePayload {
  receiverName: string;
  /** Optional — the beneficiary is not required to provide an email. */
  receiverEmail?: string;
  receiverPhone: string;
  receiverAddress: string;
  /** Province API code — never the UI label. */
  receiverProvince: string;
  /** Municipality API code — never the UI label. */
  receiverMunicipality: string;
  deliveryMethod: DeliveryMethod;
  /** Uppercase ISO currency code. */
  senderCurrency: string;
  deliveryAmount: number;
  receiverIdentification: string;
}

/** The Swagger `TransferFlat`-shaped response — only what this flow actually reads. */
export interface TransferRecord extends TransferCreatePayload {
  id: string;
  /** The service/transfer code — the credential the future Cobrar giro flow will look up. */
  code: string;
  /** Optional and NOT interchangeable with `code` — never a payout credential (§44). */
  reference?: string;
  /** Raw external status, if the API-shaped response includes one. */
  status?: string;
}

export type TransferCreateResult =
  | { ok: true; transfer: TransferRecord }
  | { ok: false; reason: "failed" };

/**
 * Deterministic mock scenarios (§61):
 *
 *   receiverName = "Falla Externa" (any case)  → external create failure
 *   anything else                              → success
 *
 * Mirrors the same "trigger the scenario through an ordinary field value"
 * convention `remittanceProvider` already uses, rather than a hidden flag.
 */
let sequence = 5000;

/* -------------------------------------------------------------------------
 * Cobrar giro — GET /api/services/code/{code} and PUT /api/services/{id}/complete
 * ---------------------------------------------------------------------- */

/**
 * The API-shaped `Service` a payout reads. Province/municipality are the raw
 * API codes the transfer was created with — never labels: the UI resolves
 * those through the geography catalog at render time.
 *
 * `type` is part of the contract on purpose: `GET /api/services/code/{code}`
 * answers for every service kind, so a remittance can come back from a code
 * lookup and must be rejected by this flow (§ Cobrar giro pays Giros only).
 */
export interface TransferPayoutSnapshot {
  id: string;
  code: string;
  reference?: string;
  type: "transfer" | "remittance";
  status: TransferStatus;
  receiverName: string;
  receiverIdentification: string;
  receiverPhone?: string;
  receiverAddress?: string;
  /** Province API code — beneficiary data, NOT payout-seat routing. */
  receiverProvince?: string;
  /** Municipality API code — beneficiary data, NOT payout-seat routing. */
  receiverMunicipality?: string;
  deliveryMethod: DeliveryMethod;
  deliveryAmount: number;
  payoutCurrency: string;
}

export type TransferLookup =
  | { ok: true; transfer: TransferPayoutSnapshot }
  /** Deliberately one single reason: the UI must never learn WHY (§ anti-discovery). */
  | { ok: false; reason: "not-found" };

export type TransferCompleteResult =
  | { ok: true; transfer: TransferPayoutSnapshot }
  /** `not-found` → 404, `conflict` → 409, `failed` → any other failure. */
  | { ok: false; reason: "not-found" | "conflict" | "failed" };

/**
 * Deterministic payout scenarios, all reachable through an ordinary code —
 * there is no scenario picker in the UI and none of these codes are ever
 * listed, suggested or autocompleted anywhere.
 *
 *   TR-260901-000245  READY, payable                     → success
 *   REF-GIRO-245      reference of the above             → rejected as not found
 *   TR-REMESA-01      a remittance, not a transfer       → rejected as not found
 *   TR-TRANSITO-01    IN_TRANSIT                         → not payable
 *   TR-PENDIENTE-01   PENDING_PAYMENT                    → not payable
 *   TR-COMPLETADO-01  COMPLETED                          → already paid, not payable
 *   TR-MONEDA-NO      READY in a currency Caja lacks     → blocked locally
 *   TR-SIN-FONDOS     READY but above the Caja balance   → blocked locally
 *   TR-CONFLICTO-09   READY on lookup, 409 on complete   → external conflict
 *   TR-FALLA-EXT      READY on lookup, failure on complete
 */
const payoutRecords: TransferPayoutSnapshot[] = [
  {
    id: "srv-transfer-245",
    code: "TR-260901-000245",
    reference: "REF-GIRO-245",
    type: "transfer",
    status: "READY",
    receiverName: "María Pérez García",
    receiverIdentification: "85010112345",
    receiverPhone: "+53 5 678 1234",
    receiverAddress: "Calle 23 #456",
    receiverProvince: "LH",
    receiverMunicipality: "PDR",
    deliveryMethod: "pickup",
    deliveryAmount: 2_500,
    payoutCurrency: "CUP",
  },
  {
    id: "srv-transfer-rem",
    code: "TR-REMESA-01",
    type: "remittance",
    status: "READY",
    receiverName: "Datos no revelados",
    receiverIdentification: "000",
    deliveryMethod: "pickup",
    deliveryAmount: 400,
    payoutCurrency: "CUP",
  },
  {
    id: "srv-transfer-transito",
    code: "TR-TRANSITO-01",
    type: "transfer",
    status: "IN_TRANSIT",
    receiverName: "Luis Díaz Ramos",
    receiverIdentification: "89020212345",
    receiverProvince: "MTZ",
    receiverMunicipality: "CRD",
    deliveryMethod: "pickup",
    deliveryAmount: 800,
    payoutCurrency: "CUP",
  },
  {
    id: "srv-transfer-pendiente",
    code: "TR-PENDIENTE-01",
    type: "transfer",
    status: "PENDING_PAYMENT",
    receiverName: "Ana Torres Blanco",
    receiverIdentification: "91030312345",
    deliveryMethod: "pickup",
    deliveryAmount: 600,
    payoutCurrency: "CUP",
  },
  {
    id: "srv-transfer-completado",
    code: "TR-COMPLETADO-01",
    type: "transfer",
    status: "COMPLETED",
    receiverName: "Pedro Naranjo Silva",
    receiverIdentification: "78040412345",
    deliveryMethod: "pickup",
    deliveryAmount: 1_000,
    payoutCurrency: "CUP",
  },
  {
    id: "srv-transfer-moneda",
    code: "TR-MONEDA-NO",
    type: "transfer",
    status: "READY",
    receiverName: "Elena Suárez Mora",
    receiverIdentification: "83050512345",
    deliveryMethod: "pickup",
    deliveryAmount: 300,
    payoutCurrency: "CHF",
  },
  {
    id: "srv-transfer-fondos",
    code: "TR-SIN-FONDOS",
    type: "transfer",
    status: "READY",
    receiverName: "Rosa Martínez Lima",
    receiverIdentification: "82040412345",
    deliveryMethod: "pickup",
    deliveryAmount: 9_999_999,
    payoutCurrency: "CUP",
  },
  {
    id: "srv-transfer-conflicto",
    code: "TR-CONFLICTO-09",
    type: "transfer",
    status: "READY",
    receiverName: "Jorge Estévez Pino",
    receiverIdentification: "84060612345",
    deliveryMethod: "pickup",
    deliveryAmount: 500,
    payoutCurrency: "CUP",
  },
  {
    id: "srv-transfer-falla",
    code: "TR-FALLA-EXT",
    type: "transfer",
    status: "READY",
    receiverName: "Pablo León Cruz",
    receiverIdentification: "87050512345",
    deliveryMethod: "pickup",
    deliveryAmount: 450,
    payoutCurrency: "CUP",
  },
];

function normalize(value: string) {
  return value.trim().toLocaleUpperCase("es-ES");
}

export const transferProvider = {
  async createTransfer(payload: TransferCreatePayload): Promise<TransferCreateResult> {
    await new Promise((resolve) => setTimeout(resolve, 350));

    if (payload.receiverName.trim().toLocaleUpperCase("es-ES") === "FALLA EXTERNA") {
      return { ok: false, reason: "failed" };
    }

    sequence += 1;
    const code = `TR-${sequence.toString(36).toUpperCase()}-${Math.abs(sequence * 31).toString(36).toUpperCase().slice(0, 4)}`;
    const transfer: TransferRecord = {
      ...payload,
      id: `srv-transfer-out-${sequence}`,
      code,
      status: "READY",
    };
    // A Giro registered here is immediately payable by its code, exactly as
    // the real backend would have it — so Enviar → Cobrar works end to end
    // without either flow knowing about the other.
    payoutRecords.push({
      id: transfer.id,
      code: transfer.code,
      reference: transfer.reference,
      type: "transfer",
      status: "READY",
      receiverName: payload.receiverName,
      receiverIdentification: payload.receiverIdentification,
      receiverPhone: payload.receiverPhone,
      receiverAddress: payload.receiverAddress,
      receiverProvince: payload.receiverProvince,
      receiverMunicipality: payload.receiverMunicipality,
      deliveryMethod: payload.deliveryMethod,
      deliveryAmount: payload.deliveryAmount,
      payoutCurrency: payload.senderCurrency,
    });
    return { ok: true, transfer };
  },

  /**
   * `GET /api/services/code/{code}`.
   *
   * The documented endpoint may fall back to `Service.reference` when no code
   * matches. That fallback is mocked here precisely so this boundary can
   * prove it rejects such a result: a payout is authorised by the CODE the
   * beneficiary presents, never by a reference. Both that rejection and the
   * "wrong service type" rejection collapse into the same opaque
   * `not-found` — the UI must not be able to tell a wrong code from a
   * reference hit, a remittance, or a code that does not exist at all.
   */
  async findTransferByCode(code: string): Promise<TransferLookup> {
    await new Promise((resolve) => setTimeout(resolve, 250));

    const record = payoutRecords.find(
      (item) => normalize(item.code) === normalize(code) || normalize(item.reference ?? "") === normalize(code),
    );
    if (!record) return { ok: false, reason: "not-found" };
    if (normalize(record.code) !== normalize(code)) return { ok: false, reason: "not-found" };
    if (record.type !== "transfer") return { ok: false, reason: "not-found" };

    return { ok: true, transfer: { ...record } };
  },

  /** `PUT /api/services/{id}/complete` — 200 / 404 / 409. */
  async completeTransfer(serviceId: string): Promise<TransferCompleteResult> {
    await new Promise((resolve) => setTimeout(resolve, 350));

    const record = payoutRecords.find((item) => item.id === serviceId);
    if (!record) return { ok: false, reason: "not-found" };
    if (record.code === "TR-FALLA-EXT") return { ok: false, reason: "failed" };
    // Lookup said READY, completion says otherwise — the race this flow has
    // to survive without touching Caja.
    if (record.code === "TR-CONFLICTO-09") return { ok: false, reason: "conflict" };
    if (record.status !== "READY") return { ok: false, reason: "conflict" };

    record.status = "COMPLETED";
    return { ok: true, transfer: { ...record } };
  },
};
