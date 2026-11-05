import { registrarOperacionAction } from "../../../../_actions";
import { transferProvider, type TransferCreatePayload } from "@/features/transfers/transfer-provider";
import { senderFullName, type GiroDraft } from "./giro-types";
import { municipalityLabel, provinceLabel } from "./giro-validation";
import type { GiroCompleted } from "./giro-result";

export type ConfirmGiroOutcome = { ok: true; completed: GiroCompleted } | { ok: false; message: string };

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
  jornadaAbierta: boolean;
  monedasHabilitadas: readonly string[];
}): Promise<ConfirmGiroOutcome> {
  const { draft } = params;

  if (!params.jornadaAbierta) {
    return { ok: false, message: "Debes tener una jornada abierta para registrar el giro." };
  }
  if (!params.monedasHabilitadas.includes(draft.senderCurrency)) {
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

  const registrada = await registrarOperacionAction({
    cliente: {
      nombre: senderFullName(draft.sender),
      documentType: draft.sender.documentType,
      documentNumber: draft.sender.documentNumber,
      telefono: draft.sender.phone,
      nacionalidad: draft.sender.nationality,
    },
    tramo: { currency: payload.senderCurrency, delta: draft.deliveryAmount, concepto: "Envío de giro" },
    servicio: "Giros",
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
  if (!registrada.ok) {
    return { ok: false, message: "No se pudo registrar el movimiento en caja. Solicita asistencia: el giro ya existe en el servicio externo." };
  }
  const operationCode = registrada.value.codigo;
  const now = new Date(registrada.value.fechaHora);

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
