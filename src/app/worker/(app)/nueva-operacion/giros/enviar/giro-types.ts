import type { DocumentType } from "@/features/customers/customers";
import type { FormaDeGiro } from "@/features/network/tarifas-reglas";
import type { TarifaDelGiro } from "@/features/operations/operations-history";

/** The sender's base KYC: always a registered `Customer`, identified as in Cambio de moneda and copied into the giro. */
export interface SenderValues {
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  firstSurname: string;
  secondSurname: string;
  /** ISO date (yyyy-mm-dd) from a native date input. */
  birthDate: string;
  phone: string;
  nationality: string;
}

/** API-aligned beneficiary fields (§23) — `receiverProvince`/`receiverMunicipality` hold catalog CODES. */
export interface BeneficiaryValues {
  receiverName: string;
  receiverEmail: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverProvince: string;
  receiverMunicipality: string;
  receiverIdentification: string;
}

export interface GiroValues {
  senderCurrency: string;
  /**
   * Cómo lo pide el cliente (19/11/2026): `llegar`, cuánto recibe el
   * beneficiario, y se le suma la tarifa; `enviar`, cuánto entrega él, y la
   * tarifa sale de ahí.
   */
  forma: FormaDeGiro;
  /** Raw text as typed — parsed with `parseAmountInput` at validation time. */
  amountInput: string;
}

export interface GiroFormValues {
  sender: SenderValues;
  beneficiary: BeneficiaryValues;
  giro: GiroValues;
}

export const EMPTY_SENDER: SenderValues = {
  documentType: "CI",
  documentNumber: "",
  firstName: "",
  firstSurname: "",
  secondSurname: "",
  birthDate: "",
  phone: "",
  nationality: "Cubana",
};

export const EMPTY_BENEFICIARY: BeneficiaryValues = {
  receiverName: "",
  receiverEmail: "",
  receiverPhone: "",
  receiverAddress: "",
  receiverProvince: "",
  receiverMunicipality: "",
  receiverIdentification: "",
};

/** The fully validated Step 1 → Step 2/3 draft — built only once every field passes (§29). */
export interface GiroDraft {
  sender: SenderValues;
  beneficiary: BeneficiaryValues;
  senderCurrency: string;
  /** Lo que recibe el beneficiario. */
  deliveryAmount: number;
  /** La tarifa cotizada; `tarifa.total` es lo que se cobra. */
  tarifa: TarifaDelGiro;
  /** En «Enviar un importe», lo que dijo el cliente que entrega y lo que le sobra. */
  entrega: number;
  vuelto: number;
  /** Por qué sobra: el giro siguiente ya pediría más. */
  siguiente?: { giro: number; total: number };
}

export function senderFullName(sender: SenderValues): string {
  return [sender.firstName, sender.firstSurname, sender.secondSurname].filter(Boolean).join(" ");
}
