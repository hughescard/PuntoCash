/**
 * FRONTEND-ONLY MOCK customer repository.
 *
 * Every PuntoCash operation requires this base KYC set and no more. The fields
 * below are the approved ones — nothing else is mandatory, and address in
 * particular is deliberately absent despite appearing decoratively in the
 * reference images.
 *
 * Replace the three functions with real calls; `Customer` is the contract the
 * screens render against. The in-memory store persists only for the browsing
 * session, which is enough to demonstrate registering a client and using them.
 */

/** The only two documents PuntoCash accepts today. */
export type DocumentType = "CI" | "PASAPORTE";

export const DOCUMENT_TYPES = [
  { value: "CI", label: "Carné de identidad" },
  { value: "PASAPORTE", label: "Pasaporte" },
] as const satisfies readonly { value: DocumentType; label: string }[];

export function documentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPES.find((d) => d.value === type)?.label ?? type;
}

/** Short form used beside the number on client cards: "CI · 90010112345". */
export function documentTypeShortLabel(type: DocumentType): string {
  return type === "CI" ? "CI" : "Pasaporte";
}

/** The approved base KYC record. */
export interface Customer {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  firstSurname: string;
  secondSurname: string;
  /** ISO date (yyyy-mm-dd), formatted for display at the edge. */
  birthDate: string;
  phone: string;
  nationality: string;
}

/** The exact base KYC a new client must provide — no more, no less. */
export type NewCustomerInput = Omit<Customer, "id">;

export function customerFullName(customer: Customer): string {
  return [customer.firstName, customer.firstSurname, customer.secondSurname]
    .filter(Boolean)
    .join(" ");
}

export function customerInitials(customer: Customer): string {
  return `${customer.firstName.charAt(0)}${customer.firstSurname.charAt(0)}`.toUpperCase();
}

/** Seeded so the "client found" path is demonstrable out of the box. */
const SEED: readonly Customer[] = [
  {
    id: "cus-1",
    documentType: "CI",
    documentNumber: "90010112345",
    firstName: "Carlos",
    firstSurname: "Pérez",
    secondSurname: "Rodríguez",
    birthDate: "1990-01-01",
    phone: "+53 5 1234 5678",
    nationality: "Cubana",
  },
  {
    id: "cus-2",
    documentType: "PASAPORTE",
    documentNumber: "X1234567",
    firstName: "Marta",
    firstSurname: "Silva",
    secondSurname: "Duarte",
    birthDate: "1985-07-19",
    phone: "+34 600 112 233",
    nationality: "Española",
  },
];

const customers: Customer[] = [...SEED];
let nextId = customers.length + 1;

/** Document numbers are compared without case or surrounding whitespace. */
function normalizeDocument(value: string): string {
  return value.trim().toUpperCase();
}

export function findCustomerByDocument(
  documentType: DocumentType,
  documentNumber: string,
): Customer | undefined {
  const wanted = normalizeDocument(documentNumber);
  if (!wanted) return undefined;

  return customers.find(
    (customer) =>
      customer.documentType === documentType &&
      normalizeDocument(customer.documentNumber) === wanted,
  );
}

/**
 * Registers a client. Workers may create clients but never edit existing ones,
 * so there is deliberately no update function here.
 */
export function createCustomer(input: NewCustomerInput): Customer {
  const customer: Customer = { ...input, id: `cus-${(nextId += 1)}` };
  customers.push(customer);
  return customer;
}
