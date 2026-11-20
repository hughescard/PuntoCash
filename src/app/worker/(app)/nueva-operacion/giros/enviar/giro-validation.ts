import { parseAmountInput } from "@/lib/format";
import { findMunicipality, findProvince } from "@/features/geography/cuba-provinces";
import type { Denominacion } from "@/features/caja/billetes";
import type { BeneficiaryValues, GiroDraft, GiroFormValues, SenderValues } from "./giro-types";
import { cotizarEnCaja, errorDeCotizacion, tarifaDelGiro, type CotizacionEnCaja, type Tarifas } from "./cotizacion-de-giro";

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

/** Lo que hace falta para cotizar: la tarifa de cada moneda y sus denominaciones. */
export interface ParaCotizar {
  tarifas: Tarifas;
  denominaciones: Readonly<Record<string, readonly Denominacion[]>>;
}

/** La cotización de lo escrito, o `null` si todavía no hay moneda o importe que cotizar. */
export function cotizacionDe(giro: GiroFormValues["giro"], c: ParaCotizar): CotizacionEnCaja | null {
  const parsed = parseAmountInput(giro.amountInput);
  if (!giro.senderCurrency || !giro.amountInput.trim() || parsed === null) return null;
  return cotizarEnCaja(c.tarifas, c.denominaciones, giro.senderCurrency, giro.forma, parsed);
}

function validateGiro(giro: GiroFormValues["giro"], enabledCurrencies: readonly string[], c: ParaCotizar): GiroErrors {
  const errors: GiroErrors = {};

  if (!giro.senderCurrency || !enabledCurrencies.includes(giro.senderCurrency)) {
    errors.senderCurrency = c.tarifas[giro.senderCurrency] || !giro.senderCurrency
      ? "Selecciona una moneda habilitada en caja."
      : `En ${giro.senderCurrency} no se envían giros: PuntoCash no le ha puesto tarifa.`;
  }

  const parsed = parseAmountInput(giro.amountInput);
  if (!giro.amountInput.trim()) {
    errors.amount = "Introduce el importe.";
  } else if (parsed === null || parsed <= 0) {
    errors.amount = "Introduce un monto válido.";
  } else if (!errors.senderCurrency) {
    const q = cotizacionDe(giro, c);
    if (q && !q.ok) errors.amount = errorDeCotizacion(q, giro.senderCurrency, giro.forma);
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
  c: ParaCotizar,
): { errors: GiroFormErrors; draft: GiroDraft | null } {
  const errors: GiroFormErrors = {
    sender: validateSender(values.sender),
    beneficiary: validateBeneficiary(values.beneficiary),
    giro: validateGiro(values.giro, enabledCurrencies, c),
  };

  if (hasAnyError(errors)) return { errors, draft: null };

  // hasAnyError already guarantees a quote, but keeps the compiler honest.
  const q = cotizacionDe(values.giro, c);
  const politica = c.tarifas[values.giro.senderCurrency];
  if (!q || !q.ok || !politica) return { errors, draft: null };

  return {
    errors,
    draft: {
      sender: { ...values.sender },
      beneficiary: { ...values.beneficiary },
      senderCurrency: values.giro.senderCurrency,
      deliveryAmount: q.value.giro,
      tarifa: tarifaDelGiro(politica, q.value),
      entrega: q.value.entrega,
      vuelto: q.value.vuelto,
      ...(q.value.siguiente ? { siguiente: q.value.siguiente } : {}),
    },
  };
}

export function provinceLabel(code: string): string {
  return findProvince(code)?.label ?? code;
}

export function municipalityLabel(provinceCode: string, municipalityCode: string): string {
  return findMunicipality(provinceCode, municipalityCode)?.label ?? municipalityCode;
}
