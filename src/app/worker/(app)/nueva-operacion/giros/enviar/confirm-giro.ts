import { CAJA_BALANCES, CAJA_SUMMARY, hasOpenJornada, registrarEntradaComercial } from "@/features/caja/caja-data";
import { registerCompletedOperation } from "@/features/operations/operations-history";
import { transferProvider, type TransferCreatePayload } from "@/features/transfers/transfer-provider";
import { senderFullName, type GiroDraft } from "./giro-types";
import { municipalityLabel, provinceLabel } from "./giro-validation";
import type { GiroCompleted } from "./giro-result";

export type ConfirmGiroOutcome = { ok: true; completed: GiroCompleted } | { ok: false; message: string };

/**
 * "PC-yyMMdd-NNNNNN" — format-compatible with every other PuntoCash
 * operation-code generator (Cambio de moneda, Remesas), kept as its own
 * local sequence so this flow never shares a counter with another one.
 */
let operationSequence = 9000;
function nextGiroOperationCode(now: Date): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  operationSequence += 1;
  return `PC-${yy}${mm}${dd}-${String(operationSequence).padStart(6, "0")}`;
}

/**
 * The only place `transferProvider.createTransfer` is ever called. Follows
 * the approved order of operations exactly (§41): validate everything local
 * first, call the external provider, and only on external success commit the
 * local operation + Caja movement + balance together. Caja is never mutated
 * before the external transfer succeeds, and no local operation is created
 * before that either.
 */
export async function confirmGiro(params: {
  draft: GiroDraft;
  worker: string;
}): Promise<ConfirmGiroOutcome> {
  const { draft } = params;

  if (!hasOpenJornada()) {
    return { ok: false, message: "Debes tener una jornada abierta para registrar el giro." };
  }
  if (!CAJA_BALANCES.some((balance) => balance.currency === draft.senderCurrency)) {
    return { ok: false, message: `${draft.senderCurrency} ya no está habilitada en esta caja.` };
  }

  const payload: TransferCreatePayload = {
    receiverName: draft.beneficiary.receiverName.trim(),
    receiverEmail: draft.beneficiary.receiverEmail.trim() || undefined,
    receiverPhone: draft.beneficiary.receiverPhone.trim(),
    receiverAddress: draft.beneficiary.receiverAddress.trim(),
    receiverProvince: draft.beneficiary.receiverProvince,
    receiverMunicipality: draft.beneficiary.receiverMunicipality,
    deliveryMethod: "pickup",
    senderCurrency: draft.senderCurrency.toUpperCase(),
    deliveryAmount: draft.deliveryAmount,
    receiverIdentification: draft.beneficiary.receiverIdentification.trim(),
  };

  const external = await transferProvider.createTransfer(payload);
  if (!external.ok) {
    return {
      ok: false,
      message: "No se pudo registrar el giro. Intenta nuevamente o solicita asistencia.",
    };
  }

  const now = new Date();
  const operationCode = nextGiroOperationCode(now);

  const cashIn = registrarEntradaComercial({
    operationCode,
    concepto: "Giros",
    currency: payload.senderCurrency,
    amount: draft.deliveryAmount,
    timestamp: now,
  });
  if (!cashIn.ok) {
    return { ok: false, message: "No se pudo registrar el movimiento en caja. Intenta nuevamente." };
  }

  registerCompletedOperation({
    codigo: operationCode,
    fechaHora: now.toISOString(),
    cliente: {
      nombre: senderFullName(draft.sender),
      documentType: draft.sender.documentType,
      documentNumber: draft.sender.documentNumber,
      telefono: draft.sender.phone,
      nacionalidad: draft.sender.nationality,
    },
    servicio: "Giros",
    estado: "Completada",
    amount: {
      kind: "single",
      money: { amount: draft.deliveryAmount, currency: payload.senderCurrency },
      cashSnapshot: {
        before: { amount: cashIn.saldoAntes, currency: payload.senderCurrency },
        movement: { amount: draft.deliveryAmount, currency: payload.senderCurrency },
        after: { amount: cashIn.saldoDespues, currency: payload.senderCurrency },
      },
    },
    worker: CAJA_SUMMARY.worker,
    caja: CAJA_SUMMARY.register,
    transfer: {
      transferAction: "send",
      externalId: external.transfer.id,
      code: external.transfer.code,
      reference: external.transfer.reference,
      sender: { ...draft.sender },
      receiverName: payload.receiverName,
      receiverEmail: payload.receiverEmail,
      receiverPhone: payload.receiverPhone,
      receiverAddress: payload.receiverAddress,
      receiverProvinceCode: payload.receiverProvince,
      receiverProvinceLabel: provinceLabel(payload.receiverProvince),
      receiverMunicipalityCode: payload.receiverMunicipality,
      receiverMunicipalityLabel: municipalityLabel(payload.receiverProvince, payload.receiverMunicipality),
      receiverIdentification: payload.receiverIdentification,
      deliveryMethod: payload.deliveryMethod,
      senderCurrency: payload.senderCurrency,
      deliveryAmount: draft.deliveryAmount,
      externalStatus: external.transfer.status,
    },
  });

  const completed: GiroCompleted = {
    operationCode,
    giroCode: external.transfer.code,
    giroReference: external.transfer.reference,
    sender: draft.sender,
    beneficiary: draft.beneficiary,
    senderCurrency: payload.senderCurrency,
    deliveryAmount: draft.deliveryAmount,
    completedAt: now.toISOString(),
  };

  return { ok: true, completed };
}
