import type { Money } from "@/lib/format";
import { parseIsoDate } from "@/lib/format";
import { OPERATION_STATUSES, type OperationStatus } from "@/components/patterns/operation-status-badge";
import type { DocumentType } from "@/features/customers/customers";
import { documentTypeShortLabel } from "@/features/customers/customers";
import { normalizeForSearch } from "@/features/operations/services";

/**
 * FRONTEND-ONLY MOCK operations history.
 *
 * Single source of truth for /worker/operaciones (the list) and
 * /worker/operaciones/[codigo] (the detail). Shaped like the future backend
 * response, so wiring a real query later means replacing `OPERATIONS` with a
 * fetch and leaving both screens untouched.
 *
 * Scoped to the signed-in worker's own register, like the Home widgets — this
 * is not a branch-wide or cross-worker view.
 */

/** The services a Worker can look up here. */
export type OperationServiceName =
  | "Cambio de moneda"
  | "Remesa"
  | "Remesa nacional"
  | "Extracción tarjeta"
  | "Pago de servicio"
  | "Giros";

export const OPERATION_SERVICE_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "Cambio de moneda", label: "Cambio de moneda" },
  { value: "Remesa", label: "Remesa" },
  { value: "Remesa nacional", label: "Remesa nacional" },
  { value: "Extracción tarjeta", label: "Extracción tarjeta" },
  { value: "Pago de servicio", label: "Pago de servicio" },
  { value: "Giros", label: "Giros" },
] as const satisfies readonly { value: string; label: string }[];

/**
 * Options derive from `OPERATION_STATUSES` — the one authoritative status
 * list (`@/components/patterns/operation-status-badge`) — rather than keeping
 * an independent copy here that could drift out of sync with the badge or the
 * mock data.
 */
export const OPERATION_STATUS_FILTERS = [
  { value: "todos", label: "Todos" },
  ...OPERATION_STATUSES.map((status) => ({ value: status, label: status })),
] as const satisfies readonly { value: string; label: string }[];

/**
 * A simple rolling window rather than a calendar-day picker for the three
 * relative options: "does not need an enterprise-grade datepicker, but it
 * must behave coherently" is satisfied by relative recency, and it sidesteps
 * midnight-boundary ambiguity entirely. "Personalizado" is the exception — it
 * hands the boundaries to the worker via `operationMatchesDateRange` instead
 * of a fixed `hours` window, so its own `hours` value is never read.
 */
export const OPERATION_DATE_FILTERS = [
  { value: "todos", label: "Todos", hours: Infinity },
  { value: "hoy", label: "Hoy", hours: 24 },
  { value: "7d", label: "Últimos 7 días", hours: 24 * 7 },
  { value: "30d", label: "Últimos 30 días", hours: 24 * 30 },
  { value: "personalizado", label: "Personalizado", hours: Infinity },
] as const satisfies readonly { value: string; label: string; hours: number }[];

export type OperationDateFilter = (typeof OPERATION_DATE_FILTERS)[number]["value"];

/**
 * The customer's identifying data as it was AT THE TIME the operation ran —
 * copied onto the record itself rather than looked up live from the customer
 * directory (`@/features/customers/customers`). A later edit to that
 * customer's own profile must never rewrite what an old operation says (§15
 * "regla de datos históricos" / historical-snapshot rule) — see also
 * `OperationCashSnapshot` below for the same principle applied to the caja.
 */
export interface OperationClienteSnapshot {
  nombre: string;
  documentType: DocumentType;
  documentNumber: string;
  telefono: string;
  nacionalidad: string;
}

/**
 * The register's own state around a cash-moving operation, captured once at
 * processing time. `before`/`after` are never recomputed from the live Caja
 * balance later — that balance keeps moving with newer operations, while this
 * stays what actually happened at the moment this one was confirmed.
 */
export interface OperationCashSnapshot {
  before: Money;
  /** What actually left (or entered) the register for this operation. */
  movement: Money;
  after: Money;
}

/**
 * Every service produces one figure except Cambio de moneda, which produces a
 * pair plus the register snapshot around it. A discriminated union keeps the
 * two shapes distinct instead of a bag of optional fields.
 */
export type OperationAmount =
  | { kind: "single"; money: Money; cashSnapshot?: OperationCashSnapshot }
  | {
      kind: "exchange";
      source: Money;
      destination: Money;
      /** Destination units per one source unit — the operation's rate snapshot. */
      appliedRate: number;
      cashSnapshot: OperationCashSnapshot;
    };

export interface OperationRecord {
  codigo: string;
  /** ISO 8601 datetime — parsed with `new Date()`, formatted with `formatDateTime()`. */
  fechaHora: string;
  cliente: OperationClienteSnapshot;
  servicio: OperationServiceName;
  estado: OperationStatus;
  amount: OperationAmount;
  worker: string;
  caja: string;
  /** Historical external-remittance snapshot. Kept separate from the generic
   * operation fields until the specialized Remesa detail is approved. */
  remittance?: {
    serviceId: string;
    code: string;
    reference?: string;
    beneficiaryName: string;
    beneficiaryIdentification: string;
    deliveryMethod: import("@/features/remittances/remittance-provider").DeliveryMethod;
    payoutAmount: number;
    payoutCurrency: string;
    externalStatus: import("@/features/remittances/remittance-provider").RemittanceStatus;
  };
  /**
   * Historical external-Giro snapshot, for BOTH sides of the service:
   * `transferAction: "send"` is the origin operation (Enviar giro) and
   * `"payout"` the independent payout operation (Cobrar giro). The two are
   * separate commercial operations with their own operation codes, and they
   * legitimately share the same external Giro `code`.
   *
   * Kept separate from the generic operation fields until a specialized Giro
   * detail is approved (this task deliberately keeps the generic Operation
   * Detail fallback). Preserves the sender's KYC snapshot when there is one,
   * the beneficiary as submitted, and the province/municipality catalog codes
   * together with their labels at the time — a later catalog relabel must
   * never make this record ambiguous.
   */
  transfer?: {
    /**
     * Which side of the Giro this operation is. Raw discriminator: these
     * English values are never rendered as labels.
     */
    transferAction: "send" | "payout";
    /** External transfer/service id, if the provider returned one. */
    externalId?: string;
    /** The Giro/service code — the credential Cobrar giro looks up. */
    code: string;
    /** Optional and never interchangeable with `code` (§44). */
    reference?: string;
    /**
     * Only the origin operation captures the sender: at payout time the
     * beneficiary presents a code, and PuntoCash never re-reads sender KYC.
     */
    sender?: {
      documentType: DocumentType;
      documentNumber: string;
      firstName: string;
      firstSurname: string;
      secondSurname: string;
      /** ISO date (yyyy-mm-dd). */
      birthDate: string;
      phone: string;
      nationality: string;
    };
    receiverName: string;
    /** Optional — the beneficiary is not required to provide an email. */
    receiverEmail?: string;
    /* Beneficiary contact/address as the service carries it. Optional on the
       payout side: the external service is not required to return them. */
    receiverPhone?: string;
    receiverAddress?: string;
    /** Beneficiary data — NOT payout-seat routing (§ no destination seat). */
    receiverProvinceCode?: string;
    receiverProvinceLabel?: string;
    receiverMunicipalityCode?: string;
    receiverMunicipalityLabel?: string;
    receiverIdentification: string;
    /** Raw API enum — always `"pickup"` in this flow (§9, §47). */
    deliveryMethod: import("@/features/remittances/remittance-provider").DeliveryMethod;
    /** Uppercase ISO currency code moved by this operation. */
    senderCurrency: string;
    deliveryAmount: number;
    /** Raw external status enum (e.g. `"COMPLETED"`) — never a Spanish label. */
    externalStatus?: string;
  };
}

/** "CI · 90010112345" — the same short form used on client cards. */
export function operationDocumentLabel(record: OperationRecord): string {
  return `${documentTypeShortLabel(record.cliente.documentType)} · ${record.cliente.documentNumber}`;
}

/**
 * Mirrors the "PC-yyMMdd-NNNNNN" convention from the Cambio de moneda flow
 * (`generateOperationCode`) without importing across the route/feature
 * boundary — the two stay independent, format-compatible mocks.
 */
function formatOperationCode(date: Date, sequence: number): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `PC-${yy}${mm}${dd}-${String(sequence).padStart(6, "0")}`;
}

/**
 * A fixed anchor rather than `Date.now()`. This module is imported by a
 * Client Component (`operations-list.tsx`), so its top-level array literal
 * is evaluated twice — once during SSR, once again in the browser during
 * hydration — at two genuinely different instants. Building "hours ago"
 * from the real clock made every record's rendered minute a race, which
 * React reports as a hydration mismatch (the same class of bug documented
 * in `currency-flag.tsx`'s float-rounding fix). A constant anchor makes both
 * passes compute the identical value.
 */
const MOCK_NOW = new Date("2026-08-18T12:00:00");

function hoursAgo(hours: number): Date {
  return new Date(MOCK_NOW.getTime() - hours * 60 * 60 * 1000);
}

const WORKER_NAME = "Juan Pérez";
const REGISTER_NAME = "Caja 03";

/**
 * Four "hero" records with fixed, literal values — including both example
 * amounts from the spec ("250,00 USD", "15.000,00 CUP") — so the search,
 * filter and formatting behaviour has known, stable targets to verify against.
 * Everything after them is generated filler for volume and pagination.
 */
const HERO_RECORDS: readonly OperationRecord[] = [
  {
    codigo: formatOperationCode(hoursAgo(3), 5006),
    fechaHora: hoursAgo(3).toISOString(),
    cliente: { nombre: "María Pérez García", documentType: "CI", documentNumber: "85010112345", telefono: "+53 5 678 1234", nacionalidad: "Cubana" },
    servicio: "Remesa", estado: "Completada",
    amount: { kind: "single", money: { amount: 500, currency: "CUP" }, cashSnapshot: { before: { amount: 8450, currency: "CUP" }, movement: { amount: 500, currency: "CUP" }, after: { amount: 7950, currency: "CUP" } } },
    worker: WORKER_NAME, caja: REGISTER_NAME,
    remittance: { serviceId: "srv-rem-historical-001", code: "RM-7X82-9KLM", reference: "REF-REM-500", beneficiaryName: "María Pérez García", beneficiaryIdentification: "85010112345", deliveryMethod: "pickup", payoutAmount: 500, payoutCurrency: "CUP", externalStatus: "COMPLETED" },
  },
  {
    codigo: formatOperationCode(hoursAgo(2), 5004),
    fechaHora: hoursAgo(2).toISOString(),
    cliente: {
      nombre: "Carlos Pérez Rodríguez",
      documentType: "CI",
      documentNumber: "90010112345",
      telefono: "+53 5 123 4567",
      nacionalidad: "Cubana",
    },
    servicio: "Cambio de moneda",
    estado: "Completada",
    amount: {
      kind: "exchange",
      source: { amount: 1000, currency: "USD" },
      destination: { amount: 920, currency: "EUR" },
      appliedRate: 0.92,
      cashSnapshot: {
        before: { amount: 1250, currency: "EUR" },
        movement: { amount: 920, currency: "EUR" },
        after: { amount: 330, currency: "EUR" },
      },
    },
    worker: WORKER_NAME,
    caja: REGISTER_NAME,
  },
  {
    codigo: formatOperationCode(hoursAgo(5), 5003),
    fechaHora: hoursAgo(5).toISOString(),
    cliente: {
      nombre: "María López González",
      documentType: "CI",
      documentNumber: "85073156421",
      telefono: "+53 5 234 5678",
      nacionalidad: "Cubana",
    },
    servicio: "Remesa nacional",
    estado: "En proceso",
    amount: { kind: "single", money: { amount: 8500, currency: "CUP" } },
    worker: WORKER_NAME,
    caja: REGISTER_NAME,
  },
  {
    codigo: formatOperationCode(hoursAgo(0.5), 5002),
    fechaHora: hoursAgo(0.5).toISOString(),
    cliente: {
      nombre: "Ana Ruiz",
      documentType: "CI",
      documentNumber: "92112087654",
      telefono: "+53 5 345 6789",
      nacionalidad: "Cubana",
    },
    servicio: "Extracción tarjeta",
    estado: "Rechazada",
    amount: { kind: "single", money: { amount: 250, currency: "USD" } },
    worker: WORKER_NAME,
    caja: REGISTER_NAME,
  },
  {
    codigo: formatOperationCode(hoursAgo(26), 5001),
    fechaHora: hoursAgo(26).toISOString(),
    cliente: {
      nombre: "Pedro Sánchez",
      documentType: "PASAPORTE",
      documentNumber: "X7788990",
      telefono: "+34 600 112 233",
      nacionalidad: "Española",
    },
    servicio: "Pago de servicio",
    estado: "Cancelada",
    amount: { kind: "single", money: { amount: 15_000, currency: "CUP" } },
    worker: WORKER_NAME,
    caja: REGISTER_NAME,
  },
  {
    // Rechazada (above, Ana Ruiz) is a business/authorization decision.
    // Fallida is a distinct, technical processing failure — the operation was
    // attempted and broke, rather than being disallowed.
    codigo: formatOperationCode(hoursAgo(8), 5005),
    fechaHora: hoursAgo(8).toISOString(),
    cliente: {
      nombre: "Yasmani Prieto",
      documentType: "CI",
      documentNumber: "87051234567",
      telefono: "+53 5 456 7890",
      nacionalidad: "Cubana",
    },
    servicio: "Extracción tarjeta",
    estado: "Fallida",
    amount: { kind: "single", money: { amount: 180, currency: "USD" } },
    worker: WORKER_NAME,
    caja: REGISTER_NAME,
  },
  /*
   * Both sides of one Giro, so each specialized detail has a stable historical
   * record to render without first running the flow. They share the external
   * code on purpose — that is exactly what a sent-then-paid giro looks like —
   * while remaining two independent local operations with their own codes,
   * their own client (sender vs. beneficiary) and opposite cash movements.
   */
  {
    codigo: formatOperationCode(hoursAgo(7), 5007),
    fechaHora: hoursAgo(7).toISOString(),
    // The sender is the client of the origin operation. Deliberately its own
    // person: reusing another hero record's name would make "Cliente" values
    // ambiguous for every screen and test that looks one up by name.
    cliente: {
      nombre: "Alejandro Nieves Cabrera",
      documentType: "CI",
      documentNumber: "84071912345",
      telefono: "+53 5 234 5678",
      nacionalidad: "Cubana",
    },
    servicio: "Giros",
    estado: "Completada",
    amount: {
      kind: "single",
      money: { amount: 2500, currency: "CUP" },
      // Enviar giro takes cash IN: 5.000,00 → 7.500,00 CUP.
      cashSnapshot: {
        before: { amount: 5000, currency: "CUP" },
        movement: { amount: 2500, currency: "CUP" },
        after: { amount: 7500, currency: "CUP" },
      },
    },
    worker: WORKER_NAME,
    caja: REGISTER_NAME,
    transfer: {
      transferAction: "send",
      externalId: "srv-transfer-historical-245",
      code: "TR-260901-000245",
      reference: "REF-GIRO-245",
      sender: {
        documentType: "CI",
        documentNumber: "84071912345",
        firstName: "Alejandro",
        firstSurname: "Nieves",
        secondSurname: "Cabrera",
        birthDate: "1984-07-19",
        phone: "+53 5 234 5678",
        nationality: "Cubana",
      },
      receiverName: "Dayana Quesada Peña",
      receiverPhone: "+53 5 345 6789",
      receiverAddress: "Calle 23 #456",
      receiverProvinceCode: "LH",
      receiverProvinceLabel: "La Habana",
      receiverMunicipalityCode: "PDR",
      receiverMunicipalityLabel: "Plaza de la Revolución",
      receiverIdentification: "92030512345",
      deliveryMethod: "pickup",
      senderCurrency: "CUP",
      deliveryAmount: 2500,
      // Still awaiting payout when this operation was committed.
      externalStatus: "READY",
    },
  },
  {
    codigo: formatOperationCode(hoursAgo(6), 5008),
    fechaHora: hoursAgo(6).toISOString(),
    // The beneficiary is the client of the payout operation.
    cliente: {
      nombre: "Dayana Quesada Peña",
      documentType: "CI",
      documentNumber: "92030512345",
      telefono: "+53 5 345 6789",
      nacionalidad: "Cubana",
    },
    servicio: "Giros",
    estado: "Completada",
    amount: {
      kind: "single",
      money: { amount: 2500, currency: "CUP" },
      // Cobrar giro pays cash OUT: 7.500,00 → 5.000,00 CUP.
      cashSnapshot: {
        before: { amount: 7500, currency: "CUP" },
        movement: { amount: 2500, currency: "CUP" },
        after: { amount: 5000, currency: "CUP" },
      },
    },
    worker: WORKER_NAME,
    caja: REGISTER_NAME,
    transfer: {
      transferAction: "payout",
      externalId: "srv-transfer-historical-245",
      code: "TR-260901-000245",
      reference: "REF-GIRO-245",
      receiverName: "Dayana Quesada Peña",
      receiverPhone: "+53 5 345 6789",
      receiverAddress: "Calle 23 #456",
      receiverProvinceCode: "LH",
      receiverProvinceLabel: "La Habana",
      receiverMunicipalityCode: "PDR",
      receiverMunicipalityLabel: "Plaza de la Revolución",
      receiverIdentification: "92030512345",
      deliveryMethod: "pickup",
      senderCurrency: "CUP",
      deliveryAmount: 2500,
      externalStatus: "COMPLETED",
    },
  },
];

const FILLER_CLIENTS: readonly {
  name: string;
  documentType: DocumentType;
  documentNumber: string;
  telefono: string;
  nacionalidad: string;
}[] = [
  { name: "Luis Martínez", documentType: "CI", documentNumber: "88041523456", telefono: "+53 5 567 8901", nacionalidad: "Cubana" },
  { name: "Yudelkis Ramírez", documentType: "CI", documentNumber: "95022734567", telefono: "+53 5 678 9012", nacionalidad: "Cubana" },
  { name: "Jorge Fernández", documentType: "CI", documentNumber: "79101245678", telefono: "+53 5 789 0123", nacionalidad: "Cubana" },
  { name: "Carlos Gómez", documentType: "CI", documentNumber: "83051856789", telefono: "+53 5 890 1234", nacionalidad: "Cubana" },
  { name: "Odalys Suárez", documentType: "CI", documentNumber: "91093067890", telefono: "+53 5 901 2345", nacionalidad: "Cubana" },
  { name: "Marta Silva Duarte", documentType: "PASAPORTE", documentNumber: "X1234567", telefono: "+55 11 98765 4321", nacionalidad: "Brasileña" },
  { name: "Roberto Alonso", documentType: "CI", documentNumber: "76122178901", telefono: "+53 5 012 3456", nacionalidad: "Cubana" },
  { name: "Diana Castellanos", documentType: "CI", documentNumber: "89070489012", telefono: "+53 5 123 5678", nacionalidad: "Cubana" },
];

const FILLER_SERVICES: readonly OperationServiceName[] = [
  "Cambio de moneda",
  "Remesa nacional",
  "Extracción tarjeta",
  "Pago de servicio",
];

/**
 * Weighted so completed operations dominate, as in a real register (§9).
 * Rechazada (business/authorization rejection) and Fallida (technical
 * processing failure) both appear as distinct entries — neither is a rename
 * of the other — so every status has enough rows for filter testing.
 */
const FILLER_STATUSES: readonly OperationStatus[] = [
  "Completada",
  "Completada",
  "Completada",
  "En proceso",
  "Completada",
  "Rechazada",
  "Completada",
  "Fallida",
  "Cancelada",
];

// CUP is deliberately excluded here: at a ~320x rate a three-digit source
// amount renders a 6-digit destination figure, which reads oddly next to the
// other exchange rows. CUP still appears plenty via single-currency rows.
const EXCHANGE_PAIRS: readonly { source: string; destination: string; rate: number }[] = [
  { source: "USD", destination: "EUR", rate: 0.92 },
  { source: "EUR", destination: "USD", rate: 1.087 },
  { source: "USD", destination: "GBP", rate: 0.79 },
  { source: "GBP", destination: "USD", rate: 1.2658 },
];

const SINGLE_CURRENCIES: readonly string[] = ["USD", "EUR", "CUP"];

function filler(index: number): OperationRecord {
  const client = FILLER_CLIENTS[index % FILLER_CLIENTS.length]!;
  const servicio = FILLER_SERVICES[index % FILLER_SERVICES.length]!;
  const estado = FILLER_STATUSES[index % FILLER_STATUSES.length]!;
  // Spans roughly 6 hours to ~88 days back, crossing both the 7-day and
  // 30-day windows repeatedly so every Fecha filter has visible effect.
  const at = hoursAgo(6 + index * 17);

  const amount: OperationAmount =
    servicio === "Cambio de moneda"
      ? (() => {
          const pair = EXCHANGE_PAIRS[index % EXCHANGE_PAIRS.length]!;
          const sourceAmount = 100 + ((index * 37) % 900);
          const destinationAmount = Math.round(sourceAmount * pair.rate * 100) / 100;
          // A baseline comfortably above the movement, so "after" always
          // stays positive — a real register never runs this operation
          // otherwise.
          const before = Math.round((destinationAmount + 200 + (index % 5) * 50) * 100) / 100;
          return {
            kind: "exchange",
            source: { amount: sourceAmount, currency: pair.source },
            destination: { amount: destinationAmount, currency: pair.destination },
            appliedRate: pair.rate,
            cashSnapshot: {
              before: { amount: before, currency: pair.destination },
              movement: { amount: destinationAmount, currency: pair.destination },
              after: {
                amount: Math.round((before - destinationAmount) * 100) / 100,
                currency: pair.destination,
              },
            },
          };
        })()
      : {
          kind: "single",
          money: {
            amount: 50 + ((index * 123) % 20_000),
            currency: SINGLE_CURRENCIES[index % SINGLE_CURRENCIES.length]!,
          },
        };

  return {
    codigo: formatOperationCode(at, 5000 - index),
    fechaHora: at.toISOString(),
    cliente: {
      nombre: client.name,
      documentType: client.documentType,
      documentNumber: client.documentNumber,
      telefono: client.telefono,
      nacionalidad: client.nacionalidad,
    },
    servicio,
    estado,
    amount,
    worker: WORKER_NAME,
    caja: REGISTER_NAME,
  };
}

/** 128 total: at 20 per page that is exactly the approved 7-page reference. */
const TOTAL_OPERATIONS = 128;

// Mutable so a freshly completed operation (see `registerCompletedOperation`)
// can join the same array the list and detail screens already read — kept
// private so every other caller still sees the frozen `OPERATIONS` view.
const mutableOperations: OperationRecord[] = [
  ...HERO_RECORDS,
  ...Array.from({ length: TOTAL_OPERATIONS - HERO_RECORDS.length }, (_, i) => filler(i)),
];

export const OPERATIONS: readonly OperationRecord[] = mutableOperations;

export function findOperation(codigo: string): OperationRecord | undefined {
  return OPERATIONS.find((op) => op.codigo === codigo);
}

/**
 * Records an operation that just completed live (e.g. from the Cambio de
 * moneda flow) so its own "Ver detalle" link resolves against the same
 * dataset the list reads, instead of hitting the graceful not-found card for
 * a code that is legitimately real but was minted after this module loaded.
 */
export function registerCompletedOperation(record: OperationRecord): void {
  mutableOperations.unshift(record);
}

/** Case- and accent-insensitive match across code, client, document and service. */
export function operationMatchesQuery(record: OperationRecord, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;

  const haystack = normalizeForSearch(
    `${record.codigo} ${record.cliente.nombre} ${record.cliente.documentNumber} ${record.servicio}`,
  );
  return haystack.includes(q);
}

export function operationMatchesDateFilter(record: OperationRecord, filter: OperationDateFilter): boolean {
  if (filter === "personalizado") return true;

  const spec = OPERATION_DATE_FILTERS.find((f) => f.value === filter);
  if (!spec || spec.hours === Infinity) return true;

  // Compared against the same fixed anchor the mock data was generated
  // from — see `MOCK_NOW` — so filtering stays coherent regardless of how
  // much real time has passed since.
  const elapsedHours =
    (MOCK_NOW.getTime() - new Date(record.fechaHora).getTime()) / (60 * 60 * 1000);
  return elapsedHours <= spec.hours;
}

/**
 * Whether a custom Desde/Hasta pair (yyyy-mm-dd, either half optional) is
 * usable as a filter. Desde after Hasta is the one thing that can never be
 * satisfied, so the caller shows a validation message and skips filtering
 * rather than silently returning zero rows.
 */
export function isValidDateRange(desde: string, hasta: string): boolean {
  if (!desde || !hasta) return true;
  return desde <= hasta;
}

/**
 * Inclusive custom date-range filter using local calendar-date semantics:
 * `parseIsoDate` reads "yyyy-mm-dd" as that day at local midnight (never
 * shifted a day by a UTC parse — see its own doc comment), and Hasta is
 * extended to the last instant of its day so an operation logged at 23:50 on
 * the Hasta date still matches. Only the supplied half(es) filter: Desde
 * alone means "from that date onward", Hasta alone means "up to that date".
 */
export function operationMatchesDateRange(record: OperationRecord, desde: string, hasta: string): boolean {
  if (!isValidDateRange(desde, hasta)) return true;

  const recordDate = new Date(record.fechaHora);

  if (desde) {
    const from = parseIsoDate(desde);
    if (recordDate < from) return false;
  }

  if (hasta) {
    const to = parseIsoDate(hasta);
    to.setHours(23, 59, 59, 999);
    if (recordDate > to) return false;
  }

  return true;
}
