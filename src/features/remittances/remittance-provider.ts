/** API-shaped boundary for GET /api/services/code/{code} and PUT /api/services/{id}/complete.
 * Backend codes remain authoritative; Spanish labels belong in the UI only. */
export const REMITTANCE_STATUSES = [
  "COMPLETED", "IN_TRANSIT", "READY", "PENDING_PAYMENT", "PAYED", "DENIED_PAYMENT", "PAYOUT_DENIED",
] as const;
export type RemittanceStatus = (typeof REMITTANCE_STATUSES)[number];
export const DELIVERY_METHODS = ["delivery", "transfer", "pickup"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const REMITTANCE_STATUS_LABEL: Record<RemittanceStatus, string> = {
  COMPLETED: "Completada", IN_TRANSIT: "En tránsito", READY: "Lista para entrega", PENDING_PAYMENT: "Pendiente de pago", PAYED: "Pagada", DENIED_PAYMENT: "Pago denegado", PAYOUT_DENIED: "Entrega denegada",
};
export const DELIVERY_METHOD_LABEL: Record<DeliveryMethod, string> = {
  delivery: "Entrega", transfer: "Transferencia", pickup: "Recogida",
};

export interface RemittanceSnapshot {
  id: string; code: string; reference?: string; type: "remittance" | "transfer";
  status: RemittanceStatus; receiverName: string; receiverIdentification: string;
  receiverPhone?: string; receiverAddress?: string; receiverProvince?: string; receiverMunicipality?: string;
  deliveryMethod: DeliveryMethod; deliveryAmount: number; payoutCurrency: string;
}

export type RemittanceLookup = { ok: true; remittance: RemittanceSnapshot } | { ok: false; reason: "not-found" };
export type RemittanceComplete = { ok: true; remittance: RemittanceSnapshot } | { ok: false; reason: "failed" | "conflict" };

const records: RemittanceSnapshot[] = [
  { id: "srv-rem-001", code: "RM-7X82-9KLM", reference: "REF-REM-500", type: "remittance", status: "READY", receiverName: "María Pérez García", receiverIdentification: "85010112345", receiverPhone: "+53 5 678 1234", receiverAddress: "Calle 23 #456", receiverProvince: "La Habana", receiverMunicipality: "Plaza de la Revolución", deliveryMethod: "pickup", deliveryAmount: 500, payoutCurrency: "CUP" },
  { id: "srv-rem-002", code: "RM-TRANSITO-01", type: "remittance", status: "IN_TRANSIT", receiverName: "Luis Díaz", receiverIdentification: "89020212345", deliveryMethod: "pickup", deliveryAmount: 200, payoutCurrency: "CUP" },
  { id: "srv-rem-003", code: "RM-COMPLETADA", type: "remittance", status: "COMPLETED", receiverName: "Ana Torres", receiverIdentification: "91030312345", deliveryMethod: "pickup", deliveryAmount: 300, payoutCurrency: "CUP" },
  { id: "srv-transfer-001", code: "TR-9Z10-ABCD", type: "transfer", status: "READY", receiverName: "Datos no revelados", receiverIdentification: "000", deliveryMethod: "transfer", deliveryAmount: 100, payoutCurrency: "CUP" },
  { id: "srv-rem-004", code: "RM-SIN-FONDOS", type: "remittance", status: "READY", receiverName: "Rosa Martínez", receiverIdentification: "82040412345", deliveryMethod: "pickup", deliveryAmount: 999_999, payoutCurrency: "CUP" },
  { id: "srv-rem-005", code: "RM-FALLA-EXT", type: "remittance", status: "READY", receiverName: "Pablo León", receiverIdentification: "87050512345", deliveryMethod: "pickup", deliveryAmount: 200, payoutCurrency: "CUP" },
];

function normalize(value: string) { return value.trim().toLocaleUpperCase("es-ES"); }

export const remittanceProvider = {
  async findByCode(code: string): Promise<RemittanceLookup> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    // Mocking the documented endpoint's possible reference fallback lets the
    // product boundary prove it rejects that result without revealing it.
    const record = records.find((item) => normalize(item.code) === normalize(code) || normalize(item.reference ?? "") === normalize(code));
    if (!record || normalize(record.code) !== normalize(code) || record.type !== "remittance") return { ok: false, reason: "not-found" };
    return { ok: true, remittance: { ...record } };
  },
  async complete(serviceId: string): Promise<RemittanceComplete> {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const record = records.find((item) => item.id === serviceId);
    if (!record) return { ok: false, reason: "failed" };
    if (record.code === "RM-FALLA-EXT") return { ok: false, reason: "failed" };
    if (record.status !== "READY") return { ok: false, reason: "conflict" };
    record.status = "COMPLETED";
    return { ok: true, remittance: { ...record } };
  },
};
