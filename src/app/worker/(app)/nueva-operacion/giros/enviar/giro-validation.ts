import { parseAmountInput } from "@/lib/format";
import { findMunicipality, findProvince } from "@/features/geography/cuba-provinces";
import type { BeneficiaryValues, GiroDraft, GiroFormValues, SenderValues } from "./giro-types";

/** Standard, unremarkable email shape — good enough for a mock KYC boundary. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SenderErrors {
  documentNumber?: string;
  firstName?: string;
  firstSurname?: string;
  secondSurname?: string;
  birthDate?: string;
  phone?: string;
  nationality?: string;
}

export interface BeneficiaryErrors {
  receiverName?: string;
  receiverEmail?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  receiverProvince?: string;
  receiverMunicipality?: string;
  receiverIdentification?: string;
}

export interface GiroErrors {
  senderCurrency?: string;
  amount?: string;
}

export interface GiroFormErrors {
  sender: SenderErrors;
  beneficiary: BeneficiaryErrors;
  giro: GiroErrors;
}

export const NO_ERRORS: GiroFormErrors = { sender: {}, beneficiary: {}, giro: {} };

function required(value: string): string | undefined {
  return value.trim() ? undefined : "Este dato es obligatorio.";
}

function withinLength(value: string, max: number, label: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Este dato es obligatorio.";
  if (trimmed.length > max) return `${label} no puede superar los ${max} caracteres.`;
  return undefined;
}

function validateSender(sender: SenderValues): SenderErrors {
  return {
    documentNumber: required(sender.documentNumber),
    firstName: required(sender.firstName),
    firstSurname: required(sender.firstSurname),
    // Second surname is required for every PuntoCash sender — an existing,
    // approved rule (§20), not something this flow invents.
    secondSurname: required(sender.secondSurname),
    birthDate: required(sender.birthDate),
    phone: required(sender.phone),
    nationality: required(sender.nationality),
  };
}

/** Mirrors the documented `POST /api/transfers` field constraints exactly (§8). */
function validateBeneficiary(beneficiary: BeneficiaryValues): BeneficiaryErrors {
  const errors: BeneficiaryErrors = {
    receiverName: withinLength(beneficiary.receiverName, 100, "El nombre"),
    receiverPhone: withinLength(beneficiary.receiverPhone, 20, "El teléfono"),
    receiverAddress: withinLength(beneficiary.receiverAddress, 255, "La dirección"),
    receiverIdentification: withinLength(beneficiary.receiverIdentification, 50, "El documento"),
  };

  // Optional: only validated as an email when the worker actually enters one.
  if (beneficiary.receiverEmail.trim() && !EMAIL_PATTERN.test(beneficiary.receiverEmail.trim())) {
    errors.receiverEmail = "Introduce un correo electrónico válido.";
  }

  if (!beneficiary.receiverProvince) {
    errors.receiverProvince = "Selecciona una provincia.";
  }
  if (!beneficiary.receiverMunicipality) {
    errors.receiverMunicipality = "Selecciona un municipio.";
  } else if (
    beneficiary.receiverProvince &&
    !findMunicipality(beneficiary.receiverProvince, beneficiary.receiverMunicipality)
  ) {
    errors.receiverMunicipality = "Selecciona un municipio válido para la provincia elegida.";
  }

  return errors;
}

function validateGiro(giro: GiroFormValues["giro"], enabledCurrencies: readonly string[]): GiroErrors {
  const errors: GiroErrors = {};

  if (!giro.senderCurrency || !enabledCurrencies.includes(giro.senderCurrency)) {
    errors.senderCurrency = "Selecciona una moneda habilitada en caja.";
  }

  const parsed = parseAmountInput(giro.amountInput);
  if (!giro.amountInput.trim()) {
    errors.amount = "Introduce el importe a entregar.";
  } else if (parsed === null || parsed <= 0) {
    errors.amount = "Introduce un monto válido.";
  }

  return errors;
}

export function hasAnyError(errors: GiroFormErrors): boolean {
  return (
    Object.values(errors.sender).some(Boolean) ||
    Object.values(errors.beneficiary).some(Boolean) ||
    Object.values(errors.giro).some(Boolean)
  );
}

/**
 * Validates the whole form and, only when everything passes, builds the
 * immutable draft Step 2/3 read from. Never partially valid: either every
 * field is clean and `draft` is populated, or `draft` is `null`.
 */
export function validateGiroForm(
  values: GiroFormValues,
  enabledCurrencies: readonly string[],
): { errors: GiroFormErrors; draft: GiroDraft | null } {
  const errors: GiroFormErrors = {
    sender: validateSender(values.sender),
    beneficiary: validateBeneficiary(values.beneficiary),
    giro: validateGiro(values.giro, enabledCurrencies),
  };

  if (hasAnyError(errors)) return { errors, draft: null };

  const parsedAmount = parseAmountInput(values.giro.amountInput);
  // hasAnyError already guarantees this, but keeps the compiler honest.
  if (parsedAmount === null) return { errors, draft: null };

  return {
    errors,
    draft: {
      sender: { ...values.sender },
      beneficiary: { ...values.beneficiary },
      senderCurrency: values.giro.senderCurrency,
      deliveryAmount: parsedAmount,
    },
  };
}

export function provinceLabel(code: string): string {
  return findProvince(code)?.label ?? code;
}

export function municipalityLabel(provinceCode: string, municipalityCode: string): string {
  return findMunicipality(provinceCode, municipalityCode)?.label ?? municipalityCode;
}
