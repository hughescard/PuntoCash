import type { Money } from "@/lib/format";
import { monedaIso } from "@/features/network/iso-monedas";
import { normalizeForSearch } from "@/features/operations/services";

/**
 * LA CAJA DE WORKER — formas y utilidades de pantalla.
 *
 * Hasta la segunda iteración, este módulo **era** la caja: una caja simulada
 * en memoria del navegador, con su jornada, sus saldos y su libro. Desde el
 * recableado, la caja vive en la red (`features/network/caja-operativa.ts`),
 * la misma que consultan Admin y Super Admin, y la pantalla recibe su foto del
 * servidor (`features/worker/vista.ts`). Aquí quedan las formas que pintan
 * las pantallas y las reglas de presentación que no necesitan el servidor.
 */

/* -------------------------------------------------------------------------
 * Formas
 * ---------------------------------------------------------------------- */

export type CajaBalance = Money;

export interface CajaCurrencyCatalogEntry {
  code: string;
  name: string;
  symbol: string;
}

export type CajaOperationalStatus = "operativa" | "cerrada";

export interface CajaSummary {
  register: string;
  worker: string;
  status: CajaOperationalStatus;
  /** ISO datetime de la foto. */
  lastUpdated: string;
}

export interface CajaMetric {
  id: string;
  label: string;
  value: string;
}

export type CajaMovementType = "entrada" | "salida";

export interface CajaMovement {
  id: string;
  fechaHora: string;
  /** Solo los que nacen de una operación con cliente. */
  operationCode?: string;
  tipo: CajaMovementType;
  concepto: string;
  currency: string;
  /** Positivo en una entrada, negativo en una salida. */
  amount: number;
  saldoDespues?: number;
  /** Ajustes y diferencias: el motivo declarado. */
  motivo?: string;
  observaciones?: string;
  saldoAntes?: number;
  /** La jornada a la que pertenece, como era al registrarse. */
  jornada?: CajaMovementJornadaSnapshot;
}

export type CajaJornadaStatus = "OPEN" | "CLOSED";

export interface CajaMovementJornadaSnapshot {
  register: string;
  worker: string;
  openedAt: string;
  closedAt?: string | null;
  status?: CajaJornadaStatus;
}

export interface CajaJornada {
  register: string;
  worker: string;
  openedAt: string;
  closedAt: string | null;
  status: CajaJornadaStatus;
}

/* -------------------------------------------------------------------------
 * Monedas
 * ---------------------------------------------------------------------- */

/** Nombre y símbolo de cualquier moneda, de la tabla ISO 4217 de la plataforma. */
export function findCajaCurrency(code: string): CajaCurrencyCatalogEntry | undefined {
  return monedaIso(code) ?? undefined;
}

/* -------------------------------------------------------------------------
 * Libro de movimientos: filtros
 * ---------------------------------------------------------------------- */

export const CAJA_MOVEMENT_TYPE_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "entrada", label: "Entrada" },
  { value: "salida", label: "Salida" },
] as const satisfies readonly { value: string; label: string }[];

export function getCajaMovementCurrencyFilters(
  balances: readonly CajaBalance[],
): readonly { value: string; label: string }[] {
  return [{ value: "todas", label: "Todas" }, ...balances.map((b) => ({ value: b.currency, label: b.currency }))];
}

export const CAJA_MOVEMENT_DATE_FILTERS = [
  { value: "todos", label: "Todos", hours: Infinity },
  { value: "hoy", label: "Hoy", hours: 24 },
  { value: "7d", label: "Últimos 7 días", hours: 24 * 7 },
  { value: "30d", label: "Últimos 30 días", hours: 24 * 30 },
] as const satisfies readonly { value: string; label: string; hours: number }[];

export type CajaMovementDateFilter = (typeof CAJA_MOVEMENT_DATE_FILTERS)[number]["value"];

export function movementMatchesQuery(movement: CajaMovement, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  return normalizeForSearch(`${movement.operationCode ?? ""} ${movement.concepto}`).includes(q);
}

export function movementMatchesDateFilter(
  movement: CajaMovement,
  filter: CajaMovementDateFilter,
  now: Date = new Date(),
): boolean {
  const spec = CAJA_MOVEMENT_DATE_FILTERS.find((f) => f.value === filter);
  if (!spec || spec.hours === Infinity) return true;
  return (now.getTime() - new Date(movement.fechaHora).getTime()) / 3_600_000 <= spec.hours;
}

/**
 * Un movimiento **interno** por su `id` (**FR-CAJA-27**): uno comercial enlaza
 * a su operación y no tiene pantalla propia, aunque alguien escriba su URL.
 */
export function findInternalCajaMovement(
  movimientos: readonly CajaMovement[],
  movementId: string,
): CajaMovement | undefined {
  const m = movimientos.find((x) => x.id === movementId);
  return m && m.operationCode === undefined ? m : undefined;
}

/* -------------------------------------------------------------------------
 * Indicadores del día
 * ---------------------------------------------------------------------- */

const diaEnCuba = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Havana" }).format(d);

/** Los indicadores de hoy, calculados del libro de la caja. */
export function metricasDelDia(movimientos: readonly CajaMovement[], now: Date = new Date()): readonly CajaMetric[] {
  const hoy = diaEnCuba(now);
  const deHoy = movimientos.filter((m) => diaEnCuba(new Date(m.fechaHora)) === hoy);
  const operaciones = new Set(deHoy.filter((m) => m.operationCode).map((m) => m.operationCode)).size;
  const porMoneda = new Map<string, number>();
  for (const m of deHoy.filter((x) => x.operationCode)) porMoneda.set(m.currency, (porMoneda.get(m.currency) ?? 0) + 1);
  const top = [...porMoneda].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  return [
    { id: "operaciones", label: "Operaciones de hoy", value: String(operaciones) },
    { id: "entradas", label: "Entradas de hoy", value: String(deHoy.filter((m) => m.tipo === "entrada").length) },
    { id: "salidas", label: "Salidas de hoy", value: String(deHoy.filter((m) => m.tipo === "salida").length) },
    { id: "moneda-top", label: "Moneda con mayor movimiento", value: top },
  ];
}

/* -------------------------------------------------------------------------
 * Motivos de una diferencia [R8]
 * ---------------------------------------------------------------------- */

/** Durante la jornada y al cerrar. Los mismos que lee la administración. */
export const CAJA_ADJUSTMENT_REASONS = ["Faltante detectado", "Sobrante detectado", "Otro"] as const;
export type CajaAdjustmentReason = (typeof CAJA_ADJUSTMENT_REASONS)[number];

/** Al abrir: además, el dinero que alguien repuso o retiró entre jornadas. */
export const CAJA_OPENING_REASONS = [
  "Reposición de fondos",
  "Retiro de fondos",
  "Faltante detectado",
  "Sobrante detectado",
  "Otro",
] as const;
export type CajaOpeningReason = (typeof CAJA_OPENING_REASONS)[number];

const SOLO_POSITIVA = new Set<string>(["Sobrante detectado", "Reposición de fondos"]);
const SOLO_NEGATIVA = new Set<string>(["Faltante detectado", "Retiro de fondos"]);

/** Un motivo direccional solo explica una diferencia de su signo; «Otro», cualquiera. */
export function isReasonCompatibleWithDifference(motivo: string, diferencia: number): boolean {
  if (diferencia < 0 && SOLO_POSITIVA.has(motivo)) return false;
  if (diferencia > 0 && SOLO_NEGATIVA.has(motivo)) return false;
  return true;
}

export function getValidAdjustmentReasons(diferencia: number): readonly CajaAdjustmentReason[] {
  return CAJA_ADJUSTMENT_REASONS.filter((r) => isReasonCompatibleWithDifference(r, diferencia));
}

export function getValidOpeningReasons(diferencia: number): readonly CajaOpeningReason[] {
  return CAJA_OPENING_REASONS.filter((r) => isReasonCompatibleWithDifference(r, diferencia));
}

/* -------------------------------------------------------------------------
 * Cierre
 * ---------------------------------------------------------------------- */

export interface CajaClosingAuditCurrency {
  currency: string;
  expected: number;
  counted: number;
  difference: number;
  motivo?: string;
  observaciones?: string;
}

/* -------------------------------------------------------------------------
 * Apertura: lo escrito antes de salir a añadir una moneda
 * ---------------------------------------------------------------------- */

export interface FondeoInicialDraft {
  amounts: Readonly<Record<string, string>>;
}

let fondeoInicialDraft: FondeoInicialDraft | null = null;

export function saveFondeoInicialDraft(draft: FondeoInicialDraft): void {
  fondeoInicialDraft = draft;
}

export function consumeFondeoInicialDraft(): FondeoInicialDraft | null {
  const draft = fondeoInicialDraft;
  fondeoInicialDraft = null;
  return draft;
}

/* -------------------------------------------------------------------------
 * Acciones de la pantalla de Caja
 * ---------------------------------------------------------------------- */

export type CajaActionAvailability = "available" | "coming-soon";

export interface CajaAction {
  id: string;
  label: string;
  description: string;
  availability: CajaActionAvailability;
  href?: string;
  /** Por qué está deshabilitada, cuando lo está. */
  disabledLabel?: string;
}

export interface EstadoParaAcciones {
  /** La caja tiene jornada abierta (de quien sea). */
  hayJornada: boolean;
  /** La jornada abierta es de quien opera. */
  propia: boolean;
  /** La sede no opera: solo se puede cerrar. */
  bloqueada: boolean;
  /** Quien opera tiene abierta una jornada en otra caja. */
  otraCaja?: boolean;
  /** El arqueo de cierre ya está declarado: la jornada solo puede cerrarse. */
  cierreDeclarado?: boolean;
}

/** Lo que la caja deja hacer ahora mismo, cada cosa con el motivo si no se puede. */
export function getCajaActions(e: EstadoParaAcciones): readonly CajaAction[] {
  const deOtro = e.hayJornada && !e.propia;
  const no = (label: string) => ({ availability: "coming-soon" as const, href: undefined, disabledLabel: label });
  return [
    {
      id: "imprimir-resumen",
      label: "Imprimir resumen",
      description: "Genera una copia impresa del estado actual de la caja.",
      availability: "available",
    },
    {
      id: "fondeo-inicial",
      label: "Abrir jornada",
      description: "Cuenta el efectivo de la caja y abre la jornada.",
      availability: "available",
      href: "/worker/caja/fondeo-inicial",
      ...(e.hayJornada ? no("Jornada abierta") : e.bloqueada ? no("Sede sin operar") : e.otraCaja ? no("Jornada abierta en otra caja") : {}),
    },
    {
      id: "anadir-moneda",
      label: "Añadir moneda",
      description: "Incorpora una nueva divisa a los saldos de la caja.",
      availability: "available",
      href: "/worker/caja/anadir-moneda",
      ...(deOtro ? no("Jornada de otro trabajador") : e.cierreDeclarado ? no("Arqueo de cierre declarado") : e.bloqueada ? no("Sede sin operar") : {}),
    },
    {
      id: "ajustar-efectivo",
      label: "Ajustar efectivo",
      description: "Corrige un saldo tras un conteo físico.",
      availability: "available",
      href: "/worker/caja/ajustar-efectivo",
      ...(!e.propia ? no("Requiere jornada abierta") : e.cierreDeclarado ? no("Arqueo de cierre declarado") : e.bloqueada ? no("Sede sin operar") : {}),
    },
    {
      id: "arqueo",
      label: "Arqueo y cierre",
      description: "Concilia y cierra la caja al final de la jornada.",
      availability: "available",
      href: "/worker/caja/arqueo-cierre",
      ...(!e.propia ? no("Requiere jornada abierta") : {}),
    },
  ];
}
