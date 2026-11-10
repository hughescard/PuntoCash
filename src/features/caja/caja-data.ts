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
  /** Diferencias de apertura o de cierre: el motivo declarado. Sin él, «Sin explicar». */
  motivo?: string;
  observaciones?: string;
  /** Los billetes que movió, por denominación (clave en céntimos, cantidad con signo). */
  billetes?: Readonly<Record<string, number>>;
  /** Reposición, retiro o cambio con supervisor: quién entregó o recibió el efectivo. */
  supervisor?: string;
  /** La jornada a la que pertenece, como era al registrarse. */
  jornada?: CajaMovementJornadaSnapshot;
  /**
   * Solo el «Fondeo inicial» de una caja que ya había cerrado antes: cómo
   * quedó lo recibido frente a lo que declaró quien cerró, y lo que dijo el
   * trabajador si no coincidía. Lo entregado lo vio al abrir; no es un saldo.
   */
  apertura?: AperturaDelMovimiento;
}

export interface AperturaDelMovimiento {
  cierreAnterior: { workerName: string; closedAt: string; sinArqueo: boolean };
  /** Lo que declaró quien cerró (o lo que había en libros, si se forzó el cierre). */
  entregado: number;
  recibido: number;
  /** `recibido − entregado`. */
  diferencia: number;
  /** El total cuadra pero los billetes no: recibido menos entregado, por denominación. */
  composicion?: Readonly<Record<string, number>>;
  motivo?: string;
  supervisor?: string;
  observaciones?: string;
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

export function getCajaMovementCurrencyFilters(monedas: readonly string[]): readonly { value: string; label: string }[] {
  return [{ value: "todas", label: "Todas" }, ...monedas.map((c) => ({ value: c, label: c }))];
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

/**
 * Una diferencia de importe, al abrir o al cerrar: los mismos motivos en los
 * dos momentos (decisión del 9/11/2026). Reposición y retiro son dinero que
 * trajo o se llevó un supervisor.
 */
export const CAJA_DIFFERENCE_REASONS = [
  "Faltante detectado",
  "Sobrante detectado",
  "Reposición de fondos",
  "Retiro de fondos",
  "Otro",
] as const;
export type CajaDifferenceReason = (typeof CAJA_DIFFERENCE_REASONS)[number];
/** @deprecated nombre anterior; es la misma lista. */
export const CAJA_OPENING_REASONS = CAJA_DIFFERENCE_REASONS;
export type CajaOpeningReason = CajaDifferenceReason;

/** El total cuadra pero los billetes no, al cerrar. */
export const CAJA_COMPOSITION_REASONS_CLOSE = [
  "Entregué o recibí billetes distintos de los registrados",
  "Hice un cambio de billetes sin registrarlo",
  "Otro",
] as const;

/** El total cuadra pero los billetes no, al abrir. */
export const CAJA_COMPOSITION_REASONS_OPEN = ["El supervisor cambió billetes", "Otro"] as const;

/** Los motivos que piden elegir al supervisor de la lista. */
export function pideSupervisor(motivo: string): boolean {
  return motivo === "Reposición de fondos" || motivo === "Retiro de fondos" || motivo === "El supervisor cambió billetes";
}

const SOLO_POSITIVA = new Set<string>(["Sobrante detectado", "Reposición de fondos"]);
const SOLO_NEGATIVA = new Set<string>(["Faltante detectado", "Retiro de fondos"]);

/** Un motivo direccional solo explica una diferencia de su signo; «Otro», cualquiera. */
export function isReasonCompatibleWithDifference(motivo: string, diferencia: number): boolean {
  if (diferencia < 0 && SOLO_POSITIVA.has(motivo)) return false;
  if (diferencia > 0 && SOLO_NEGATIVA.has(motivo)) return false;
  return true;
}

/** Los motivos que puede tener una diferencia de importe de ese signo. */
export function getValidDifferenceReasons(diferencia: number): readonly CajaDifferenceReason[] {
  return CAJA_DIFFERENCE_REASONS.filter((r) => isReasonCompatibleWithDifference(r, diferencia));
}

export const getValidOpeningReasons = getValidDifferenceReasons;

/* -------------------------------------------------------------------------
 * Cierre
 * ---------------------------------------------------------------------- */

/** Sin «esperado»: Worker no ve el saldo en libros (decisión del 6/11/2026). */
export interface CajaClosingAuditCurrency {
  currency: string;
  counted: number;
  difference: number;
  motivo?: string;
  observaciones?: string;
}

/* -------------------------------------------------------------------------
 * Apertura: lo escrito antes de salir a añadir una moneda
 * ---------------------------------------------------------------------- */

export interface FondeoInicialDraft {
  /** Lo escrito en cada fila del conteo, por moneda y denominación (clave en céntimos). */
  unidades: Readonly<Record<string, Record<string, string>>>;
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
      ...(deOtro ? no("Jornada de otro trabajador") : e.bloqueada ? no("Sede sin operar") : {}),
    },
    {
      id: "arqueo",
      label: "Arqueo y cierre",
      description: "Cuenta billete a billete y cierra la caja al final de la jornada.",
      availability: "available",
      href: "/worker/caja/arqueo-cierre",
      ...(!e.propia ? no("Requiere jornada abierta") : {}),
    },
  ];
}
