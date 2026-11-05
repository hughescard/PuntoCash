import type { CajaBalance } from "@/features/caja/caja-data";
import { registrarOperacionAction } from "../../../../_actions";
import { transferProvider, type TransferPayoutSnapshot } from "@/features/transfers/transfer-provider";
import { findMunicipality, findProvince } from "@/features/geography/cuba-provinces";

/** Everything the Result screen and its printable receipt need, frozen at payout time. */
export interface GiroPayoutCompleted {
  /** The LOCAL operation code of this payout — never the origin operation's. */
  operationCode: string;
  giroCode: string;
  giroReference?: string;
  beneficiaryName: string;
  beneficiaryIdentification: string;
  payoutAmount: number;
  payoutCurrency: string;
  /** Raw external enum as returned by the completion call. */
  externalStatus: string;
  caja: string;
  worker: string;
  /** ISO datetime, captured only once the payout actually succeeded. */
  completedAt: string;
}

export type ConfirmPayoutOutcome =
  | { ok: true; completed: GiroPayoutCompleted }
  | { ok: false; message: string };


/**
 * The only place `transferProvider.completeTransfer` is ever called.
 *
 * Order of operations, exactly as approved (§49):
 *   1. open Jornada
 *   2. currency enabled in the CURRENT Caja
 *   3. current balance covers the payout
 *   4. the transfer snapshot is still payable
 *   5. invoke the external completion — and require success
 *   6. only then commit the local operation and the commercial Caja Salida
 *
 * Steps 1-4 run here rather than at lookup time, so the final confirmation
 * revalidates against whatever the Caja looks like NOW: a balance drained or
 * a currency disabled between Revisar and Confirmar blocks the payout instead
 * of paying out of a stale snapshot. Caja is never mutated before the
 * external call succeeds, and a failed external call leaves no local
 * operation, no movement and no balance change — there is no retry and no
 * compensation here by design.
 */
export async function confirmGiroPayout(params: {
  transfer: TransferPayoutSnapshot;
  worker: string;
  caja: string;
  jornadaAbierta: boolean;
  saldos: readonly CajaBalance[];
}): Promise<ConfirmPayoutOutcome> {
  const { transfer } = params;
  const CAJA_BALANCES = params.saldos;
  const isCurrencyEnabled = (c: string) => CAJA_BALANCES.some((b) => b.currency === c);

  if (!params.jornadaAbierta) {
    return { ok: false, message: "Debes tener una jornada abierta para entregar el giro." };
  }
  if (!isCurrencyEnabled(transfer.payoutCurrency)) {
    return { ok: false, message: `${transfer.payoutCurrency} ya no está habilitada en esta caja.` };
  }

  const balance = CAJA_BALANCES.find((item) => item.currency === transfer.payoutCurrency);
  if (!balance || balance.amount < transfer.deliveryAmount) {
    return {
      ok: false,
      message: `La caja ya no dispone de suficiente ${transfer.payoutCurrency} para entregar este giro.`,
    };
  }
  if (transfer.status !== "READY") {
    return { ok: false, message: "Este giro ya no está disponible para pago." };
  }

  const external = await transferProvider.completeTransfer(transfer.id);
  if (!external.ok) {
    return {
      ok: false,
      message:
        external.reason === "conflict"
          ? "El giro ya no está disponible para pago."
          : "No se pudo completar el giro. Intenta nuevamente o solicita asistencia.",
    };
  }

  const provinceCode = transfer.receiverProvince;
  const municipalityCode = transfer.receiverMunicipality;

  const registrada = await registrarOperacionAction({
    // The beneficiary — not the sender — is the client of a payout.
    cliente: {
      nombre: transfer.receiverName,
      documentType: "CI",
      documentNumber: transfer.receiverIdentification,
      telefono: transfer.receiverPhone ?? "No disponible",
      nacionalidad: "No disponible",
    },
    servicio: "Giros",
    tramo: { currency: transfer.payoutCurrency, delta: -transfer.deliveryAmount, concepto: "Pago de giro" },
    transfer: {
      transferAction: "payout",
      externalId: transfer.id,
      code: transfer.code,
      reference: transfer.reference,
      receiverName: transfer.receiverName,
      receiverPhone: transfer.receiverPhone,
      receiverAddress: transfer.receiverAddress,
      receiverProvinceCode: provinceCode,
      receiverProvinceLabel: provinceCode ? (findProvince(provinceCode)?.label ?? provinceCode) : undefined,
      receiverMunicipalityCode: municipalityCode,
      receiverMunicipalityLabel:
        provinceCode && municipalityCode
          ? (findMunicipality(provinceCode, municipalityCode)?.label ?? municipalityCode)
          : municipalityCode,
      receiverIdentification: transfer.receiverIdentification,
      deliveryMethod: transfer.deliveryMethod,
      senderCurrency: transfer.payoutCurrency,
      deliveryAmount: transfer.deliveryAmount,
      // Raw API enum ("COMPLETED"), never the Spanish label.
      externalStatus: external.transfer.status,
    },
  });
  if (!registrada.ok) {
    return { ok: false, message: "No se pudo registrar el movimiento en caja. Solicita asistencia: el giro ya figura como pagado en el servicio externo." };
  }
  const operationCode = registrada.value.codigo;
  const now = new Date(registrada.value.fechaHora);

  return {
    ok: true,
    completed: {
      operationCode,
      giroCode: transfer.code,
      giroReference: transfer.reference,
      beneficiaryName: transfer.receiverName,
      beneficiaryIdentification: transfer.receiverIdentification,
      payoutAmount: transfer.deliveryAmount,
      payoutCurrency: transfer.payoutCurrency,
      externalStatus: external.transfer.status,
      caja: params.caja,
      worker: params.worker,
      completedAt: now.toISOString(),
    },
  };
}
