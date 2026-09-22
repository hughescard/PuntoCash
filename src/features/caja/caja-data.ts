import type { Money } from "@/lib/format";
import { CASH_BALANCES } from "@/features/worker/home-data";
import { OPERATIONS } from "@/features/operations/operations-history";
import { normalizeForSearch } from "@/features/operations/services";

/**
 * FRONTEND-ONLY MOCK data for the Worker Caja screen.
 *
 * This is a read-only, operational view of the register — not the eventual
 * open/fund/adjust/transfer/close flows (§ "Objetivo funcional de esta fase").
 * Every export is shaped like the future backend response, so wiring those
 * flows later means giving this module real mutations instead of a redesign.
 */

/* -------------------------------------------------------------------------
 * Balances
 * ---------------------------------------------------------------------- */

export interface CajaBalance extends Money {
  /** Flags a balance sitting below its operational floor. */
  low?: boolean;
}

/**
 * `CASH_BALANCES` (Home's "Mi caja" widget) is the single source of truth for
 * the three currencies Home highlights — reused here rather than copied, so
 * the two screens can never silently disagree about the same register. GBP is
 * additional: the register holds it, but Home's compact widget deliberately
 * shows only its three primary currencies (unchanged by this task).
 *
 * Mutable in place (not reassigned) so opening a jornada can replace each
 * currency's amount — its own object reference stays the same, so every
 * screen that read `CAJA_BALANCES` still sees the update on its next render,
 * the same "mutate the shared array, keep the exported binding readonly"
 * shape already used for `CAJA_MOVEMENTS`.
 */
const mutableBalances: CajaBalance[] = [...CASH_BALANCES, { currency: "GBP", amount: 950 }];

export const CAJA_BALANCES: readonly CajaBalance[] = mutableBalances;

/* -------------------------------------------------------------------------
 * Currency catalog & enablement ("Añadir moneda")
 * ---------------------------------------------------------------------- */

/**
 * Every currency PuntoCash's mock knows how to display — deliberately kept
 * separate from `CAJA_BALANCES`, which is only the subset actually enabled
 * for Caja 03. "Which currencies are enabled" and "what is each one's
 * balance" stay two independently answerable questions: enablement is this
 * catalog's business, balance is `CajaBalance`'s.
 */
export interface CajaCurrencyCatalogEntry {
  code: string;
  name: string;
  symbol: string;
}

export const CAJA_CURRENCY_CATALOG: readonly CajaCurrencyCatalogEntry[] = [
  { code: "CUP", name: "Peso cubano", symbol: "$" },
  { code: "USD", name: "Dólar estadounidense", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "Libra esterlina", symbol: "£" },
  { code: "CAD", name: "Dólar canadiense", symbol: "$" },
  { code: "CHF", name: "Franco suizo", symbol: "CHF" },
  { code: "MXN", name: "Peso mexicano", symbol: "$" },
  { code: "JPY", name: "Yen japonés", symbol: "¥" },
  { code: "AUD", name: "Dólar australiano", symbol: "$" },
  { code: "COP", name: "Peso colombiano", symbol: "$" },
  { code: "CLP", name: "Peso chileno", symbol: "$" },
];

export function findCajaCurrency(code: string): CajaCurrencyCatalogEntry | undefined {
  return CAJA_CURRENCY_CATALOG.find((entry) => entry.code === code);
}

export function isCurrencyEnabled(currency: string): boolean {
  return mutableBalances.some((balance) => balance.currency === currency);
}

/** Catalog entries Caja 03 has not enabled yet — what "Añadir moneda" may offer. */
export function getAvailableCurrenciesToAdd(): readonly CajaCurrencyCatalogEntry[] {
  return CAJA_CURRENCY_CATALOG.filter((entry) => !isCurrencyEnabled(entry.code));
}

export type HabilitarMonedaResult =
  | { ok: true; balance: CajaBalance }
  | { ok: false; reason: "ya-habilitada" };

/**
 * Enables a currency for Caja 03: adds it to `CAJA_BALANCES` at 0,00 and
 * nothing else. No cash movement, no operation, no change to any historical
 * balance, the current jornada's opening snapshot, or its Fondeo inicial
 * movements — enabling a currency and moving cash are different concepts.
 *
 * Rejects duplicates at the domain level rather than trusting the UI to
 * never offer an already-enabled currency — returns a result instead of
 * throwing, so a stale selection (e.g. enabled elsewhere a moment earlier)
 * is a normal, gracefully handleable product state, not a technical error.
 */
export function habilitarMoneda(currency: string): HabilitarMonedaResult {
  if (isCurrencyEnabled(currency)) {
    return { ok: false, reason: "ya-habilitada" };
  }

  const balance: CajaBalance = { currency, amount: 0 };
  mutableBalances.push(balance);
  return { ok: true, balance };
}

/* -------------------------------------------------------------------------
 * Register summary
 * ---------------------------------------------------------------------- */

export type CajaOperationalStatus = "operativa" | "cerrada";

export interface CajaSummary {
  register: string;
  worker: string;
  status: CajaOperationalStatus;
  /** ISO datetime the balances/movements below were last refreshed. */
  lastUpdated: string;
}

export const CAJA_SUMMARY: CajaSummary = {
  register: "Caja 03",
  worker: "Juan Pérez",
  status: "operativa",
  lastUpdated: "2026-08-18T12:00:00",
};

/* -------------------------------------------------------------------------
 * Today's metrics
 * ---------------------------------------------------------------------- */

export interface CajaMetric {
  id: string;
  label: string;
  value: string;
}

export const CAJA_METRICS: readonly CajaMetric[] = [
  { id: "operaciones", label: "Operaciones de hoy", value: "18" },
  { id: "entradas", label: "Entradas de hoy", value: "12" },
  { id: "salidas", label: "Salidas de hoy", value: "9" },
  { id: "moneda-top", label: "Moneda con mayor movimiento", value: "USD" },
];

/* -------------------------------------------------------------------------
 * Movements
 * ---------------------------------------------------------------------- */

export type CajaMovementType = "entrada" | "salida";

export const CAJA_MOVEMENT_TYPE_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "entrada", label: "Entrada" },
  { value: "salida", label: "Salida" },
] as const satisfies readonly { value: string; label: string }[];

/**
 * A function, not a frozen array: `CAJA_BALANCES` grows when "Añadir moneda"
 * enables a new currency, and this filter list must offer it immediately —
 * computing it once at import time would silently go stale the moment a
 * currency joins after module load.
 */
export function getCajaMovementCurrencyFilters(): readonly { value: string; label: string }[] {
  return [
    { value: "todas", label: "Todas" },
    ...CAJA_BALANCES.map((balance) => ({ value: balance.currency, label: balance.currency })),
  ];
}

/**
 * A simple rolling window, same criterion already used for Operaciones before
 * its own custom range existed — this screen does not need one.
 */
export const CAJA_MOVEMENT_DATE_FILTERS = [
  { value: "todos", label: "Todos", hours: Infinity },
  { value: "hoy", label: "Hoy", hours: 24 },
  { value: "7d", label: "Últimos 7 días", hours: 24 * 7 },
  { value: "30d", label: "Últimos 30 días", hours: 24 * 30 },
] as const satisfies readonly { value: string; label: string; hours: number }[];

export type CajaMovementDateFilter = (typeof CAJA_MOVEMENT_DATE_FILTERS)[number]["value"];

export interface CajaMovement {
  id: string;
  fechaHora: string;
  /** Absent for internal cash-management entries with no client operation. */
  operationCode?: string;
  tipo: CajaMovementType;
  concepto: string;
  currency: string;
  /** Positive for entrada, negative for salida — the sign carries direction (§20 also states it in `tipo`'s text). */
  amount: number;
  /**
   * The register's own running balance in this currency right after this
   * movement. `undefined` where the source operation predates the cash
   * snapshot this mock can compute honestly — rendered as "—" rather than a
   * guessed figure.
   */
  saldoDespues?: number;
  /** Only set for "Ajuste de efectivo" movements — the counted-cash reason (§14). */
  motivo?: string;
  /** Only set for "Ajuste de efectivo" movements — optional unless `motivo` is "Otro" (§15). */
  observaciones?: string;
  /** Only set for "Ajuste de efectivo" movements — the registered balance immediately before this adjustment. */
  saldoAntes?: number;
  /**
   * A snapshot of the jornada this movement belongs to, captured at the
   * movement's own creation time — never a live read of "whichever jornada
   * happens to be open now". Every movement recorded live carries it, commercial
   * (with `operationCode`) and internal alike: no operation exists outside a
   * jornada, so no commercial movement is ever detached from one. Only the
   * seeded, pre-existing demo history of commercial rows lacks it. Internal
   * movements are the only ones with a detail route.
   */
  jornada?: CajaMovementJornadaSnapshot;
}

/** Historical jornada context for one internal movement — see `CajaMovement.jornada`. */
export interface CajaMovementJornadaSnapshot {
  register: string;
  worker: string;
  /** ISO datetime the jornada was opened — historical, not necessarily still open. */
  openedAt: string;
  /** Present for movements created as part of a confirmed closing audit. */
  closedAt?: string | null;
  status?: CajaJornadaStatus;
}

/**
 * Every Caja movement's own stable identifier — independent from
 * `operationCode`, used to resolve `/worker/caja/movimientos/[id]` for
 * internal movements. Formatted `CM-YYMMDD-NNNNNN` purely for legibility;
 * this is a frontend mock convention, not a permanent backend contract — the
 * only real requirement is that it uniquely and reliably resolves a
 * movement, never an array index.
 */
let movementIdSequence = 0;
function nextMovementId(date: Date): string {
  movementIdSequence += 1;
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const datePart = `${String(date.getFullYear()).slice(2)}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
  return `CM-${datePart}-${String(movementIdSequence).padStart(6, "0")}`;
}

/**
 * Internal shape used while assembling movements: `historicalAfter` carries
 * an operation's own `amount.cashSnapshot.after` when one exists. It is kept
 * separate from `saldoDespues` (computed later, in `buildMovements`) because
 * it must win over that computation rather than merely seed it — the
 * operation-time snapshot is authoritative and must never be silently
 * overwritten by the reverse-from-current-balance arithmetic used for rows
 * that carry no such snapshot.
 */
type DraftMovement = Omit<CajaMovement, "saldoDespues"> & { historicalAfter?: number };

const MOCK_NOW = new Date("2026-08-18T12:00:00");

/**
 * Standalone cash-management entries with no linked client operation — the
 * kind of movement §5 calls out ("Apertura / fondeo… puede ser solo como
 * historial mock"). Kept small and clearly synthetic rather than invented
 * business analytics.
 */
function standaloneMovement(
  fechaHora: Date,
  jornadaOpenedAt: Date,
  fields: Omit<DraftMovement, "id" | "fechaHora" | "jornada">,
): DraftMovement {
  return {
    id: nextMovementId(fechaHora),
    fechaHora: fechaHora.toISOString(),
    jornada: { register: CAJA_SUMMARY.register, worker: CAJA_SUMMARY.worker, openedAt: jornadaOpenedAt.toISOString() },
    ...fields,
  };
}

const STANDALONE_MOVEMENTS: readonly DraftMovement[] = [
  standaloneMovement(
    new Date(MOCK_NOW.getTime() - 30 * 24 * 60 * 60 * 1000),
    new Date(MOCK_NOW.getTime() - 30 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000),
    { tipo: "entrada", concepto: "Apertura de caja", currency: "CUP", amount: 200_000 },
  ),
  standaloneMovement(
    new Date(MOCK_NOW.getTime() - 15 * 24 * 60 * 60 * 1000),
    new Date(MOCK_NOW.getTime() - 15 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000),
    { tipo: "entrada", concepto: "Fondeo adicional", currency: "USD", amount: 2_000 },
  ),
  standaloneMovement(
    new Date(MOCK_NOW.getTime() - 3 * 24 * 60 * 60 * 1000),
    new Date(MOCK_NOW.getTime() - 3 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000),
    {
      tipo: "salida",
      concepto: "Ajuste de efectivo",
      currency: "EUR",
      amount: -15,
      motivo: "Faltante detectado",
      observaciones: "Conteo verificado nuevamente.",
    },
  ),
  /**
   * Explicit reconciling entry, not a disguised operation: PC-260818-005004's
   * EUR leg is anchored to its own historical snapshot (cashAfter =
   * 330,00 EUR at the moment it ran, 10:00). The live Caja balance is
   * 2.120,00 EUR "now" (12:00) and nothing else moves EUR in between, so an
   * explicit internal movement — not a rewrite of that operation's history —
   * is what actually explains the difference (§ "Current balance
   * consistency"). It carries no `operationCode`: it is a Caja-internal
   * movement, not a customer operation.
   */
  standaloneMovement(new Date("2026-08-18T11:00:00"), new Date("2026-08-18T08:00:00"), {
    tipo: "entrada",
    concepto: "Fondeo adicional",
    currency: "EUR",
    amount: 1_790,
  }),
];

/**
 * SEEDED history only: movements derived from the pre-existing demo operations.
 * Operations completed live never pass through here — each records its own
 * movements at confirmation time (`registrarSalidaComercial`,
 * `registrarEntradaComercial`, `registrarCambioMoneda`), inside an open jornada.
 *
 * Movements derived from completed operations: only a finished operation
 * actually moved cash — a Rechazada, Fallida, Cancelada or still En proceso
 * one did not, so none of those produce a ledger row. Cambio de moneda
 * produces two legs (what came in, what went out), matching how the approved
 * reference shows the same operation code twice; every other service is a
 * single outgoing leg, since PuntoCash's registered services here all pay the
 * client rather than receive from them.
 */
function movementsFromOperations(): DraftMovement[] {
  const movements: DraftMovement[] = [];

  for (const op of OPERATIONS) {
    if (op.estado !== "Completada") continue;

    if (op.amount.kind === "exchange") {
      movements.push({
        id: `${op.codigo}-entrada`,
        fechaHora: op.fechaHora,
        operationCode: op.codigo,
        tipo: "entrada",
        concepto: op.servicio,
        currency: op.amount.source.currency,
        amount: op.amount.source.amount,
        // The snapshot only covers the disbursed (destination) currency —
        // the register never recorded a "before/after" for what the client
        // handed over, so the entrada leg keeps the computed fallback.
      });
      movements.push({
        id: `${op.codigo}-salida`,
        fechaHora: op.fechaHora,
        operationCode: op.codigo,
        tipo: "salida",
        concepto: op.servicio,
        currency: op.amount.destination.currency,
        amount: -op.amount.destination.amount,
        // Authoritative: this is the register's own recorded state right
        // after the operation ran, never reconstructed.
        historicalAfter: op.amount.cashSnapshot.after.amount,
      });
    } else {
      // Enviar giro is the one registered service that RECEIVES cash from the
      // client, so its leg is an entrada; every other single-amount service
      // (including a giro payout) pays the client and stays a salida.
      const entrada = op.transfer?.transferAction === "send";
      movements.push({
        id: `${op.codigo}-${entrada ? "entrada" : "salida"}`,
        fechaHora: op.fechaHora,
        operationCode: op.codigo,
        tipo: entrada ? "entrada" : "salida",
        concepto: op.servicio,
        currency: op.amount.money.currency,
        amount: entrada ? op.amount.money.amount : -op.amount.money.amount,
        historicalAfter: op.amount.cashSnapshot?.after.amount,
      });
    }
  }

  return movements;
}

/**
 * Assembles the final movement list.
 *
 * For rows with no operation-time snapshot, `saldoDespues` is computed by
 * walking each currency's running balance forward from oldest to newest so it
 * lands on that currency's current `CAJA_BALANCES` figure at the most recent
 * movement — never a guessed number.
 *
 * For rows derived from an operation that DOES carry a historical snapshot
 * (`historicalAfter`, from `amount.cashSnapshot.after`), that value is used
 * as-is instead: the operation-time snapshot is authoritative for what the
 * register looked like at that moment, and is never overwritten by this
 * reverse-from-current-balance arithmetic just to make the series line up.
 * Its delta still counts toward the running total, so every other row's
 * computed balance stays internally consistent with it having happened.
 */
function buildMovements(): readonly CajaMovement[] {
  const raw = [...movementsFromOperations(), ...STANDALONE_MOVEMENTS].sort(
    (a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime(),
  );

  const totalByCurrency = new Map<string, number>();
  for (const movement of raw) {
    totalByCurrency.set(movement.currency, (totalByCurrency.get(movement.currency) ?? 0) + movement.amount);
  }

  const runningBalance = new Map<string, number>();
  for (const balance of CAJA_BALANCES) {
    runningBalance.set(balance.currency, balance.amount - (totalByCurrency.get(balance.currency) ?? 0));
  }

  const withBalances: CajaMovement[] = raw.map((movement) => {
    const { historicalAfter, ...rest } = movement;

    // Captured before this movement's own delta is folded in — exactly the
    // registered balance an "Ajuste de efectivo" row corrected from.
    const before = runningBalance.get(movement.currency) ?? 0;

    const current = before + movement.amount;
    runningBalance.set(movement.currency, current);

    // Only currencies the register actually reports a balance for get a
    // computed "saldoDespues" — the others render "—" rather than a guess.
    const known = CAJA_BALANCES.some((b) => b.currency === movement.currency);
    const computed = known ? Math.round(current * 100) / 100 : undefined;

    // A static "Ajuste de efectivo" fixture may not carry its own
    // `saldoAntes` — derive it from the same running-balance walk that
    // already produces `saldoDespues`, rather than requiring every fixture
    // to hand-compute it.
    const saldoAntes =
      rest.concepto === "Ajuste de efectivo" && rest.saldoAntes === undefined && known
        ? Math.round(before * 100) / 100
        : rest.saldoAntes;

    const snapshotBefore = rest.operationCode
      ? OPERATIONS.find((operation) => operation.codigo === rest.operationCode)?.amount.kind === "single"
        ? OPERATIONS.find((operation) => operation.codigo === rest.operationCode)?.amount.cashSnapshot?.before.amount
        : undefined
      : undefined;
    return { ...rest, saldoDespues: historicalAfter ?? computed, saldoAntes: snapshotBefore ?? saldoAntes };
  });

  return withBalances.sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
}

// Mutable so opening a new jornada (see `registerJornadaApertura`) can join
// the same array the ledger already reads — kept private so every other
// caller still sees the frozen `CAJA_MOVEMENTS` view. Mirrors the identical
// pattern already used for `OPERATIONS`/`registerCompletedOperation`.
const mutableMovements: CajaMovement[] = [...buildMovements()];

export const CAJA_MOVEMENTS: readonly CajaMovement[] = mutableMovements;

/** Resolves one movement by its stable `id` — the `/worker/caja/movimientos/[id]` lookup. */
export function findCajaMovement(movementId: string): CajaMovement | undefined {
  return CAJA_MOVEMENTS.find((movement) => movement.id === movementId);
}

export function movementMatchesQuery(movement: CajaMovement, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;

  const haystack = normalizeForSearch(`${movement.operationCode ?? ""} ${movement.concepto}`);
  return haystack.includes(q);
}

export function movementMatchesDateFilter(movement: CajaMovement, filter: CajaMovementDateFilter): boolean {
  const spec = CAJA_MOVEMENT_DATE_FILTERS.find((f) => f.value === filter);
  if (!spec || spec.hours === Infinity) return true;

  const elapsedHours = (MOCK_NOW.getTime() - new Date(movement.fechaHora).getTime()) / (60 * 60 * 1000);
  return elapsedHours <= spec.hours;
}

/* -------------------------------------------------------------------------
 * Jornada (Registrar fondeo inicial)
 * ---------------------------------------------------------------------- */

export type CajaJornadaStatus = "OPEN" | "CLOSED";

/**
 * A working day for a register, opened by "Registrar fondeo inicial".
 * Deliberately minimal for this phase — only what opening actually produces.
 * No expected duration, business-hours logic or scheduled close time: the
 * jornada's duration is `closedAt - openedAt`, computed once Arqueo y cierre
 * exists and actually sets `closedAt`. Until then it stays `null`.
 */
export interface CajaJornada {
  register: string;
  worker: string;
  /** ISO datetime, captured only at the exact moment confirmation succeeds. */
  openedAt: string;
  closedAt: string | null;
  status: CajaJornadaStatus;
  /** Persisted only when Arqueo y cierre is confirmed. */
  closingAudit?: CajaClosingAudit;
}

export interface CajaClosingAuditCurrency {
  currency: string;
  expected: number;
  counted: number;
  difference: number;
  motivo?: CajaAdjustmentReason;
  observaciones?: string;
}

export interface CajaClosingAudit {
  worker: string;
  confirmedAt: string;
  currencies: readonly CajaClosingAuditCurrency[];
  result: {
    audited: number;
    balanced: number;
    withDifferences: number;
  };
}

export interface CerrarJornadaResult {
  jornada: CajaJornada;
  audit: CajaClosingAudit;
  movements: readonly CajaMovement[];
}

export type CerrarJornadaOutcome =
  | { ok: true; result: CerrarJornadaResult }
  | { ok: false; reason: "jornada-no-abierta" | "arqueo-invalido" | "motivo-incompatible" };

/** One currency's confirmed opening amount. */
export interface FondoInicial {
  currency: string;
  amount: number;
}

// Mutable, module-level "current jornada" slot — the same shared-mutable-
// module shape already used for `CAJA_MOVEMENTS`/`CAJA_BALANCES`. `null`
// means no jornada has been opened yet in this session.
let jornadaActual: CajaJornada | null = null;

export function getJornadaActual(): CajaJornada | null {
  return jornadaActual;
}

/**
 * Snapshot of the currently open jornada, stamped on every movement recorded
 * while it is open. `undefined` only when no jornada is open — callers that
 * move cash reject that case before ever reaching a movement.
 */
function currentJornadaSnapshot(): CajaMovementJornadaSnapshot | undefined {
  return jornadaActual && jornadaActual.status === "OPEN"
    ? { register: jornadaActual.register, worker: jornadaActual.worker, openedAt: jornadaActual.openedAt }
    : undefined;
}

/** Caja 03 cannot have a second open jornada while this one is open. */
export function hasOpenJornada(): boolean {
  return jornadaActual !== null && jornadaActual.status === "OPEN";
}

/**
 * Opens a new jornada. This is the one place that:
 *
 *   1. Establishes the OPENING balances of the new jornada — replacing each
 *      currency's amount outright, never adding on top of whatever the
 *      register held before. A currency with no confirmed fondo opens at 0,
 *      exactly like every other currency the jornada didn't fund.
 *   2. Records one "Fondeo inicial" entrada movement per currency funded with
 *      an amount greater than 0 (a 0-value fondo is not a real cash event, so
 *      it produces no row). Each movement's `saldoDespues` is simply that
 *      currency's opening amount — the whole point is that nothing from the
 *      previous jornada carries forward into this arithmetic.
 *   3. Persists the jornada itself as OPEN, `closedAt: null`, so a second
 *      "Registrar fondeo inicial" cannot run until Arqueo y cierre exists and
 *      actually closes it.
 */
export function abrirJornada(params: {
  register: string;
  worker: string;
  openedAt: Date;
  fondos: readonly FondoInicial[];
}): CajaJornada {
  const openedAtIso = params.openedAt.toISOString();

  for (const balance of mutableBalances) {
    const fondo = params.fondos.find((f) => f.currency === balance.currency);
    balance.amount = fondo ? fondo.amount : 0;
  }

  for (const fondo of params.fondos) {
    if (!(fondo.amount > 0)) continue;

    mutableMovements.unshift({
      id: nextMovementId(params.openedAt),
      fechaHora: openedAtIso,
      tipo: "entrada",
      concepto: "Fondeo inicial",
      currency: fondo.currency,
      amount: fondo.amount,
      saldoDespues: Math.round(fondo.amount * 100) / 100,
      jornada: { register: params.register, worker: params.worker, openedAt: openedAtIso },
    });
  }

  jornadaActual = {
    register: params.register,
    worker: params.worker,
    openedAt: openedAtIso,
    closedAt: null,
    status: "OPEN",
  };

  return jornadaActual;
}

/* -------------------------------------------------------------------------
 * Ajustar efectivo — corrects one currency's current balance from a
 * physical cash count, while a jornada is open.
 * ---------------------------------------------------------------------- */

/** Exactly the four approved reasons — no more, no renaming (§14). */
export const CAJA_ADJUSTMENT_REASONS = [
  "Faltante detectado",
  "Sobrante detectado",
  "Error de registro",
  "Otro",
] as const;

export type CajaAdjustmentReason = (typeof CAJA_ADJUSTMENT_REASONS)[number];

/**
 * Whether `motivo` is semantically consistent with the sign of `diferencia`
 * (`efectivoContado - saldoRegistrado`). "Sobrante detectado" declares MORE
 * cash than registered, so it cannot pair with a negative difference; the
 * mirror is true for "Faltante detectado". The two generic reasons carry no
 * directional claim, so either sign is always valid for them.
 */
export function isReasonCompatibleWithDifference(
  motivo: CajaAdjustmentReason,
  diferencia: number,
): boolean {
  if (diferencia < 0 && motivo === "Sobrante detectado") return false;
  if (diferencia > 0 && motivo === "Faltante detectado") return false;
  return true;
}

/** The subset of `CAJA_ADJUSTMENT_REASONS` valid for the current difference's sign. */
export function getValidAdjustmentReasons(diferencia: number): readonly CajaAdjustmentReason[] {
  return CAJA_ADJUSTMENT_REASONS.filter((reason) => isReasonCompatibleWithDifference(reason, diferencia));
}

export interface AjustarEfectivoResult {
  currency: string;
  saldoAnterior: number;
  efectivoContado: number;
  diferencia: number;
  saldoActual: number;
  motivo: CajaAdjustmentReason;
  observaciones?: string;
  /** ISO datetime, captured only at the exact moment confirmation succeeds (§19). */
  timestamp: string;
  movement: CajaMovement;
}

export type AjustarEfectivoOutcome =
  | { ok: true; result: AjustarEfectivoResult }
  | { ok: false; reason: "motivo-incompatible" };

/**
 * Corrects the selected currency's CURRENT balance to exactly the counted
 * amount, and records exactly one explicit "Ajuste de efectivo" movement
 * linked to the running ledger (§20, §21). Does not touch any other
 * currency's balance, any historical movement, the jornada's `openedAt`, or
 * its status — the jornada stays open (§22, §28).
 *
 * Rejects a `motivo` that contradicts the computed difference's sign at the
 * domain boundary itself — not only through the UI's own filtering — the
 * same "return a result, don't throw" convention already used by
 * `habilitarMoneda` for a normal, anticipatable rejection.
 */
export function ajustarEfectivo(params: {
  currency: string;
  efectivoContado: number;
  motivo: CajaAdjustmentReason;
  observaciones?: string;
  timestamp: Date;
}): AjustarEfectivoOutcome {
  const balance = mutableBalances.find((b) => b.currency === params.currency);
  if (!balance) {
    throw new Error(`Ajustar efectivo: "${params.currency}" no está habilitada en esta caja.`);
  }

  const saldoAnterior = balance.amount;
  const diferencia = Math.round((params.efectivoContado - saldoAnterior) * 100) / 100;

  if (!isReasonCompatibleWithDifference(params.motivo, diferencia)) {
    return { ok: false, reason: "motivo-incompatible" };
  }

  balance.amount = params.efectivoContado;

  const timestampIso = params.timestamp.toISOString();
  const movement: CajaMovement = {
    id: nextMovementId(params.timestamp),
    fechaHora: timestampIso,
    tipo: diferencia < 0 ? "salida" : "entrada",
    concepto: "Ajuste de efectivo",
    currency: params.currency,
    amount: diferencia,
    saldoDespues: Math.round(params.efectivoContado * 100) / 100,
    motivo: params.motivo,
    observaciones: params.observaciones,
    saldoAntes: saldoAnterior,
    // The adjustment requires an open jornada (enforced by the UI); this
    // snapshots THAT jornada, not "whichever one happens to be open" when
    // the movement is looked up later.
    jornada: jornadaActual
      ? { register: jornadaActual.register, worker: jornadaActual.worker, openedAt: jornadaActual.openedAt }
      : undefined,
  };
  mutableMovements.unshift(movement);

  return {
    ok: true,
    result: {
      currency: params.currency,
      saldoAnterior,
      efectivoContado: params.efectivoContado,
      diferencia,
      saldoActual: balance.amount,
      motivo: params.motivo,
      observaciones: params.observaciones,
      timestamp: timestampIso,
      movement,
    },
  };
}

/**
 * Commercial cash movement recorded only after its external service
 * completed. Unlike internal Caja actions it keeps the PuntoCash operation
 * code, so the ledger routes the worker to that operation rather than an
 * internal detail. Shared by both cash-out (`registrarSalidaComercial`) and
 * cash-in (`registrarEntradaComercial`) commercial services.
 */
export type CommercialCashMovementOutcome =
  | { ok: true; movement: CajaMovement; saldoAntes: number; saldoDespues: number }
  | {
      ok: false;
      reason: "jornada-no-abierta" | "fondos-insuficientes" | "moneda-no-habilitada" | "monto-invalido";
    };

export function registrarSalidaComercial(params: {
  operationCode: string;
  concepto: string;
  currency: string;
  amount: number;
  timestamp: Date;
}): CommercialCashMovementOutcome {
  if (!hasOpenJornada()) return { ok: false, reason: "jornada-no-abierta" };
  const balance = mutableBalances.find((item) => item.currency === params.currency);
  if (!balance) return { ok: false, reason: "moneda-no-habilitada" };
  if (!(params.amount > 0) || balance.amount < params.amount) return { ok: false, reason: "fondos-insuficientes" };

  const saldoAntes = balance.amount;
  const saldoDespues = Math.round((saldoAntes - params.amount) * 100) / 100;
  balance.amount = saldoDespues;
  const movement: CajaMovement = {
    id: nextMovementId(params.timestamp), fechaHora: params.timestamp.toISOString(),
    operationCode: params.operationCode, tipo: "salida", concepto: params.concepto,
    currency: params.currency, amount: -params.amount, saldoAntes, saldoDespues,
    jornada: currentJornadaSnapshot(),
  };
  mutableMovements.unshift(movement);
  return { ok: true, movement, saldoAntes, saldoDespues };
}

/**
 * Commercial cash-in — the mirror of `registrarSalidaComercial` for a
 * service that RECEIVES cash from the client instead of paying it out (e.g.
 * "Giros" · Enviar giro). No funds check: adding cash to
 * the register is always possible once a jornada is open and the currency is
 * enabled, even at a 0,00 balance.
 */
export function registrarEntradaComercial(params: {
  operationCode: string;
  concepto: string;
  currency: string;
  amount: number;
  timestamp: Date;
}): CommercialCashMovementOutcome {
  if (!hasOpenJornada()) return { ok: false, reason: "jornada-no-abierta" };
  const balance = mutableBalances.find((item) => item.currency === params.currency);
  if (!balance) return { ok: false, reason: "moneda-no-habilitada" };
  if (!(params.amount > 0)) return { ok: false, reason: "monto-invalido" };

  const saldoAntes = balance.amount;
  const saldoDespues = Math.round((saldoAntes + params.amount) * 100) / 100;
  balance.amount = saldoDespues;
  const movement: CajaMovement = {
    id: nextMovementId(params.timestamp), fechaHora: params.timestamp.toISOString(),
    operationCode: params.operationCode, tipo: "entrada", concepto: params.concepto,
    currency: params.currency, amount: params.amount, saldoAntes, saldoDespues,
    jornada: currentJornadaSnapshot(),
  };
  mutableMovements.unshift(movement);
  return { ok: true, movement, saldoAntes, saldoDespues };
}

/**
 * Cambio de moneda's cash effect: the register RECEIVES the source currency
 * (entrada) and PAYS OUT the destination currency (salida). Both are
 * commercial movements sharing the operation's code and stamped with the open
 * jornada — no exchange exists outside a jornada.
 *
 * All-or-nothing: every check (jornada open → both currencies enabled →
 * destination funds sufficient) finishes before any balance or ledger mutation,
 * so a rejection leaves the register untouched. This is also the
 * confirmation-time revalidation of the same conditions the flow showed
 * during review.
 */
export type CambioMonedaCashOutcome =
  | {
      ok: true;
      entrada: CajaMovement;
      salida: CajaMovement;
      source: { saldoAntes: number; saldoDespues: number };
      destination: { saldoAntes: number; saldoDespues: number };
    }
  | {
      ok: false;
      reason: "jornada-no-abierta" | "moneda-no-habilitada" | "fondos-insuficientes" | "monto-invalido";
      /** Currency the rejection refers to, when it is currency-specific. */
      currency?: string;
    };

export function registrarCambioMoneda(params: {
  operationCode: string;
  sourceCurrency: string;
  sourceAmount: number;
  destinationCurrency: string;
  destinationAmount: number;
  timestamp: Date;
}): CambioMonedaCashOutcome {
  if (!hasOpenJornada()) return { ok: false, reason: "jornada-no-abierta" };
  if (!(params.sourceAmount > 0) || !(params.destinationAmount > 0)) {
    return { ok: false, reason: "monto-invalido" };
  }

  const sourceBalance = mutableBalances.find((item) => item.currency === params.sourceCurrency);
  if (!sourceBalance) return { ok: false, reason: "moneda-no-habilitada", currency: params.sourceCurrency };
  const destinationBalance = mutableBalances.find((item) => item.currency === params.destinationCurrency);
  if (!destinationBalance) {
    return { ok: false, reason: "moneda-no-habilitada", currency: params.destinationCurrency };
  }
  if (destinationBalance.amount < params.destinationAmount) {
    return { ok: false, reason: "fondos-insuficientes", currency: params.destinationCurrency };
  }

  const round = (value: number) => Math.round(value * 100) / 100;
  const sourceAntes = sourceBalance.amount;
  const sourceDespues = round(sourceAntes + params.sourceAmount);
  const destinationAntes = destinationBalance.amount;
  const destinationDespues = round(destinationAntes - params.destinationAmount);
  sourceBalance.amount = sourceDespues;
  destinationBalance.amount = destinationDespues;

  const fechaHora = params.timestamp.toISOString();
  const jornada = currentJornadaSnapshot();
  const entrada: CajaMovement = {
    id: nextMovementId(params.timestamp), fechaHora,
    operationCode: params.operationCode, tipo: "entrada", concepto: "Cambio de moneda",
    currency: params.sourceCurrency, amount: params.sourceAmount,
    saldoAntes: sourceAntes, saldoDespues: sourceDespues, jornada,
  };
  const salida: CajaMovement = {
    id: nextMovementId(params.timestamp), fechaHora,
    operationCode: params.operationCode, tipo: "salida", concepto: "Cambio de moneda",
    currency: params.destinationCurrency, amount: -params.destinationAmount,
    saldoAntes: destinationAntes, saldoDespues: destinationDespues, jornada,
  };
  mutableMovements.unshift(salida, entrada);

  return {
    ok: true,
    entrada,
    salida,
    source: { saldoAntes: sourceAntes, saldoDespues: sourceDespues },
    destination: { saldoAntes: destinationAntes, saldoDespues: destinationDespues },
  };
}

/* -------------------------------------------------------------------------
 * Arqueo y cierre — final count of every enabled currency in an OPEN jornada.
 * ---------------------------------------------------------------------- */

/**
 * Confirms one complete closing audit. Validation deliberately finishes before
 * any balance, ledger or jornada mutation begins, so this mock has the same
 * all-or-nothing shape expected from the eventual backend transaction.
 */
export function cerrarJornada(params: {
  worker: string;
  timestamp: Date;
  currencies: readonly {
    currency: string;
    counted: number;
    motivo?: CajaAdjustmentReason;
    observaciones?: string;
  }[];
}): CerrarJornadaOutcome {
  if (!jornadaActual || !hasOpenJornada()) return { ok: false, reason: "jornada-no-abierta" };

  const byCurrency = new Map(params.currencies.map((entry) => [entry.currency, entry]));
  if (byCurrency.size !== mutableBalances.length || mutableBalances.some((balance) => !byCurrency.has(balance.currency))) {
    return { ok: false, reason: "arqueo-invalido" };
  }

  const auditCurrencies: CajaClosingAuditCurrency[] = [];
  for (const balance of mutableBalances) {
    const entry = byCurrency.get(balance.currency)!;
    if (!Number.isFinite(entry.counted) || entry.counted < 0) return { ok: false, reason: "arqueo-invalido" };

    const difference = Math.round((entry.counted - balance.amount) * 100) / 100;
    if (difference === 0) {
      auditCurrencies.push({ currency: balance.currency, expected: balance.amount, counted: entry.counted, difference });
      continue;
    }

    if (!entry.motivo || !isReasonCompatibleWithDifference(entry.motivo, difference)) {
      return { ok: false, reason: "motivo-incompatible" };
    }
    if (entry.motivo === "Otro" && !entry.observaciones?.trim()) {
      return { ok: false, reason: "arqueo-invalido" };
    }
    auditCurrencies.push({
      currency: balance.currency,
      expected: balance.amount,
      counted: entry.counted,
      difference,
      motivo: entry.motivo,
      observaciones: entry.observaciones?.trim() || undefined,
    });
  }

  const confirmedAt = params.timestamp.toISOString();
  const snapshot: CajaMovementJornadaSnapshot = {
    register: jornadaActual.register,
    worker: jornadaActual.worker,
    openedAt: jornadaActual.openedAt,
    closedAt: confirmedAt,
    status: "CLOSED",
  };
  const movements: CajaMovement[] = [];

  for (const record of auditCurrencies) {
    const balance = mutableBalances.find((item) => item.currency === record.currency)!;
    balance.amount = record.counted;
    if (record.difference === 0) continue;

    const movement: CajaMovement = {
      id: nextMovementId(params.timestamp),
      fechaHora: confirmedAt,
      tipo: record.difference < 0 ? "salida" : "entrada",
      concepto: "Ajuste de cierre",
      currency: record.currency,
      amount: record.difference,
      saldoAntes: record.expected,
      saldoDespues: record.counted,
      motivo: record.motivo,
      observaciones: record.observaciones,
      jornada: snapshot,
    };
    movements.push(movement);
  }

  const audit: CajaClosingAudit = {
    worker: params.worker,
    confirmedAt,
    currencies: auditCurrencies,
    result: {
      audited: auditCurrencies.length,
      balanced: auditCurrencies.filter((record) => record.difference === 0).length,
      withDifferences: auditCurrencies.filter((record) => record.difference !== 0).length,
    },
  };

  jornadaActual = { ...jornadaActual, closedAt: confirmedAt, status: "CLOSED", closingAudit: audit };
  mutableMovements.unshift(...movements);

  return { ok: true, result: { jornada: jornadaActual, audit, movements } };
}

/* -------------------------------------------------------------------------
 * Fondeo inicial draft handoff (for the "Añádela a la caja" quick link)
 * ---------------------------------------------------------------------- */

/** The in-progress amounts a worker had typed on Fondeo inicial before leaving for Añadir moneda. */
export interface FondeoInicialDraft {
  amounts: Readonly<Record<string, string>>;
}

// A single mutable slot, not a stack or a route param: only one Fondeo
// inicial flow can be mid-draft at a time in this mock, and the value never
// needs to survive a hard reload — this is a same-session handoff between two
// screens, not persisted state.
let fondeoInicialDraft: FondeoInicialDraft | null = null;

/** Called by Fondeo inicial right before navigating to Añadir moneda. */
export function saveFondeoInicialDraft(draft: FondeoInicialDraft): void {
  fondeoInicialDraft = draft;
}

/**
 * Called by Fondeo inicial on mount to restore what the worker had already
 * typed. Consumes the draft (clears the slot) so a later, unrelated visit to
 * Fondeo inicial starts clean rather than resurrecting a stale draft.
 */
export function consumeFondeoInicialDraft(): FondeoInicialDraft | null {
  const draft = fondeoInicialDraft;
  fondeoInicialDraft = null;
  return draft;
}

/* -------------------------------------------------------------------------
 * Actions — current phase + prepared future capabilities
 * ---------------------------------------------------------------------- */

export type CajaActionAvailability = "available" | "coming-soon";

export interface CajaAction {
  id: string;
  label: string;
  description: string;
  availability: CajaActionAvailability;
  /** Present only for `"available"` actions that navigate rather than act inline (e.g. print). */
  href?: string;
  /**
   * Overrides the disabled badge's text for a `"coming-soon"` action that is
   * disabled for a reason OTHER than "not built yet" — e.g. "Registrar
   * fondeo inicial" once a jornada is already open. Defaults to
   * "Próximamente" when absent, which stays correct for every action that
   * genuinely has no flow behind it yet.
   */
  disabledLabel?: string;
}

/**
 * The full capability set the Caja module will grow into. Only the entries
 * marked `"available"` do anything in this phase — the rest render as
 * disabled tiles carrying an "Próximamente" badge (the same neutral,
 * development-state language already established by `ServiceCard`), so the
 * screen visibly signals its own growth path without pretending those flows
 * exist yet.
 */
export const CAJA_ACTIONS: readonly CajaAction[] = [
  {
    id: "imprimir-resumen",
    label: "Imprimir resumen",
    description: "Genera una copia impresa del estado actual de la caja.",
    availability: "available",
  },
  {
    id: "fondeo-inicial",
    label: "Registrar fondeo inicial",
    description: "Añade el efectivo con el que la caja inicia su jornada.",
    availability: "available",
    href: "/worker/caja/fondeo-inicial",
  },
  {
    id: "anadir-moneda",
    label: "Añadir moneda",
    description: "Incorpora una nueva divisa a los saldos de la caja.",
    availability: "available",
    href: "/worker/caja/anadir-moneda",
  },
  {
    id: "ajustar-efectivo",
    label: "Ajustar efectivo",
    description: "Corrige un saldo tras un conteo físico.",
    availability: "coming-soon",
    disabledLabel: "Requiere jornada abierta",
  },
  {
    id: "arqueo",
    label: "Arqueo y cierre",
    description: "Concilia y cierra la caja al final de la jornada.",
    availability: "coming-soon",
  },
];

/**
 * `CAJA_ACTIONS` as it should actually render right now: once a jornada is
 * open, "Registrar fondeo inicial" reuses the same disabled-tile geometry
 * every other action already has, but NOT its "Próximamente" text — that
 * label means "not built yet", which would misreport a flow that just ran
 * successfully. The badge instead says "Jornada abierta", the true reason
 * it is disabled right now.
 */
export function getCajaActions(): readonly CajaAction[] {
  const open = hasOpenJornada();

  return CAJA_ACTIONS.map((action) => {
    if (action.id === "fondeo-inicial") {
      return open
        ? { ...action, availability: "coming-soon" as const, href: undefined, disabledLabel: "Jornada abierta" }
        : action;
    }
    if (action.id === "ajustar-efectivo") {
      return open
        ? { ...action, availability: "available" as const, href: "/worker/caja/ajustar-efectivo" }
        : action;
    }
    if (action.id === "arqueo") {
      return open
        ? { ...action, availability: "available" as const, href: "/worker/caja/arqueo-cierre", disabledLabel: undefined }
        : { ...action, availability: "coming-soon" as const, href: undefined, disabledLabel: "Requiere jornada abierta" };
    }
    return action;
  });
}
