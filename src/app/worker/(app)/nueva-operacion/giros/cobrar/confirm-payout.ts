import { alcanzaParaEntregarAction, comprobarOperacionAction, registrarOperacionAction } from "../../../../_actions";
import type { EfectivoRegistrado } from "@/features/network/caja-operativa";
import type { OperationLiquidation } from "@/features/operations/operations-history";
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
  /** Resto en CUP y lo que quedó a favor de la casa: consta en el comprobante. */
  liquidacion?: OperationLiquidation;
}

export type ConfirmPayoutOutcome =
  | { ok: true; completed: GiroPayoutCompleted }
  | {
      ok: false;
      message: string;
      /** Salen billetes que los libros no tienen: hay que contar esta moneda antes de seguir. */
      recuento?: string;
      /** Los billetes ya no valen: hay que volver a marcarlos. */
      revisarBilletes?: boolean;
    };

/** Por qué los billetes ya no valen, en palabras del trabajador. */
const MENSAJE_DE_BILLETES: Readonly<Record<string, string>> = {
  "cierre-forzado": "El administrador cerró tu jornada. Esto no se registró.",
  "sin-salida": "La caja no puede pagar eso entero. No se registró nada: ofrécele al beneficiario otra salida o que vuelva más tarde.",
  "propuesta-vencida": "Los billetes ya no cuadran con lo que toca, quizá porque cambió la caja. Revísalos.",
  "sin-esos-billetes": "Contada la caja, esos billetes no están. No se registró nada: vuelve a marcar con qué billetes se entrega.",
  "falta-foto-del-carne": "Faltan las fotos del carné del beneficiario. No se registró nada: haz las dos fotos con el móvil.",
  "falta-firma": "Falta la firma del beneficiario de lo que recibe. No se registró nada: pásale el móvil para que firme.",
};


/**
 * The only place `transferProvider.completeTransfer` is ever called.
 *
 * Order of operations, exactly as approved (§49):
 *   1. open Jornada
 *   2. currency enabled in the CURRENT Caja
 *   3. the server says the caja can pay it (yes or no only: Worker never sees balances)
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
  /** Las monedas de la caja, sin importes: Worker opera a ciegas. */
  monedas: readonly string[];
  /** Los billetes con los que se entrega (bloque 4). */
  efectivo: EfectivoRegistrado;
  /** La captura con las dos fotos del carné del beneficiario (16/11/2026). */
  fotoDelCarne: string;
}): Promise<ConfirmPayoutOutcome> {
  const { transfer } = params;
  const isCurrencyEnabled = (c: string) => params.monedas.includes(c);

  if (!params.jornadaAbierta) {
    return { ok: false, message: "Debes tener una jornada abierta para entregar el giro." };
  }
  if (!isCurrencyEnabled(transfer.payoutCurrency)) {
    return { ok: false, message: `${transfer.payoutCurrency} ya no está habilitada en esta caja.` };
  }

  if (transfer.status !== "READY") {
    return { ok: false, message: "Este giro ya no está disponible para pago." };
  }
  /* El servidor dice si alcanza —solo sí o no— antes de dar el giro por
     pagado en el proveedor. */
  if (!(await alcanzaParaEntregarAction(transfer.payoutCurrency, transfer.deliveryAmount))) {
    return {
      ok: false,
      message: `La caja no tiene ${transfer.payoutCurrency} suficiente para entregar este giro. No se registró nada: avisa a tu supervisor.`,
    };
  }

  const operacion = {
    cliente: {
      nombre: transfer.receiverName,
      documentType: "CI" as const,
      documentNumber: transfer.receiverIdentification,
      telefono: transfer.receiverPhone ?? "No disponible",
      nacionalidad: "No disponible",
    },
    servicio: "Giros" as const,
    tramo: { currency: transfer.payoutCurrency, delta: -transfer.deliveryAmount, concepto: "Pago de giro" },
    efectivo: params.efectivo,
  };
  /* El servidor comprueba, sin escribir nada, que se podría registrar con
     estos billetes: si hay que contar la moneda o no cuadran, se sabe antes de
     dar el giro por pagado fuera. */
  const previa = await comprobarOperacionAction(operacion, params.fotoDelCarne);
  if (!previa.ok) {
    if (previa.reason === "recuento-necesario" && previa.currency) {
      return { ok: false, message: "Hay que contar la moneda antes de entregar.", recuento: previa.currency };
    }
    const mensaje = MENSAJE_DE_BILLETES[previa.reason];
    return {
      ok: false,
      message: mensaje ?? "No se pudo comprobar la entrega. Vuelve a los billetes y revísalos.",
      revisarBilletes: previa.reason !== "cierre-forzado" && previa.reason !== "falta-foto-del-carne" && previa.reason !== "falta-firma",
    };
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
    ...operacion,
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
  }, params.fotoDelCarne);
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
      ...(registrada.value.liquidacion ? { liquidacion: registrada.value.liquidacion } : {}),
    },
  };
}
