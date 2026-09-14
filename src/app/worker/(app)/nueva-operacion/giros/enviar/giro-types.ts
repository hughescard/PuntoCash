import type { DocumentType } from "@/features/customers/customers";

/** The approved base KYC set for the sender — identical shape to `Customer`, just not persisted as one (§20-22). */
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
  deliveryAmount: number;
}

export function senderFullName(sender: SenderValues): string {
  return [sender.firstName, sender.firstSurname, sender.secondSurname].filter(Boolean).join(" ");
}
