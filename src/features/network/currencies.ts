/**
 * MONEDAS — el catálogo de la plataforma y la lista de cada sede.
 *
 * Dos cosas distintas, de dos dueños distintos:
 *
 *  · El **catálogo** son las monedas que PuntoCash soporta en toda la red
 *    (**FR-SA-MON-1**). El mercante no inventa monedas: elige de aquí.
 *  · La **lista de una sede** son las monedas que esa sucursal maneja, y la
 *    decide su mercante (**FR-AD-MON-1**, **A4**). Es exactamente lo que un
 *    trabajador puede habilitar en su caja (**FR-AD-MON-2**).
 *
 * **La lista no depende del servicio de Cambio de moneda** (decisión del
 * 15/10/2026, **FR-AD-MON-5**): una sede que solo paga remesas o giros también
 * maneja efectivo en varias monedas. Lo que sí depende de ese servicio son las
 * **tasas** que la sede publica (§10 Tasas).
 *
 * ── Monedas y saldos por caja: solo en la demostración ────────────────────
 * Qué monedas tiene habilitadas cada caja, y con cuánto, lo sabe la caja del
 * trabajador, que en esta demo vive en el navegador (`caja-data.ts`) y este
 * servidor no ve. Para que la pantalla pueda decir «en N cajas» y para que el
 * bloqueo de retirada (**FR-AD-MON-7**) se vea, aquí se **siembran** monedas y
 * saldos por caja. No reflejan nada de lo que se haga en `/worker`
 * (nota de entrega, §8.3). En producción es el mismo registro que mueve la caja.
 */

import { estaEnAlcance } from "./assignments";
import { allRegistersOf, findRegisterById } from "./registers";
import type { Register } from "./registers";
import { findSedeById } from "./sedes";
import { requireOperatorScope, type Scope } from "./scope";

/* -------------------------------------------------------------------------
 * Catálogo de la plataforma — de PuntoCash (regla A3)
 * ---------------------------------------------------------------------- */

export interface MonedaCatalogo {
  code: string;
  name: string;
}

/**
 * Las mismas once que ofrece hoy «Añadir moneda» en Worker
 * (`CAJA_CURRENCY_CATALOG`). Cuando el terminal se recablee contra este
 * dominio, aquella constante desaparece y la caja lee la lista de su sede.
 */
export const CATALOGO_MONEDAS: readonly MonedaCatalogo[] = [
  { code: "CUP", name: "Peso cubano" },
  { code: "USD", name: "Dólar estadounidense" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "Libra esterlina" },
  { code: "CAD", name: "Dólar canadiense" },
  { code: "CHF", name: "Franco suizo" },
  { code: "MXN", name: "Peso mexicano" },
  { code: "JPY", name: "Yen japonés" },
  { code: "AUD", name: "Dólar australiano" },
  { code: "COP", name: "Peso colombiano" },
  { code: "CLP", name: "Peso chileno" },
];

export function monedaDelCatalogo(code: string): MonedaCatalogo | null {
  return CATALOGO_MONEDAS.find((m) => m.code === code) ?? null;
}

/* -------------------------------------------------------------------------
 * La lista de cada sede — del mercante (regla A4)
 * ---------------------------------------------------------------------- */

export interface MonedaDeSede {
  code: string;
  addedAt: string;
}

const ALTA = "2026-01-15T09:00:00.000Z";
const lista = (...codes: string[]): MonedaDeSede[] =>
  codes.map((code) => ({ code, addedAt: ALTA }));

/**
 * Siembra. Matanzas no tiene Cambio de moneda habilitado y aun así tiene su
 * lista: es el caso que la decisión del 15/10 vino a permitir. Cerro, recién
 * asignada y sin cajas, arranca con lo mínimo.
 */
const listas = new Map<string, MonedaDeSede[]>([
  ["sede-vedado", lista("CUP", "USD", "EUR", "GBP")],
  ["sede-habana-vieja", lista("CUP", "USD", "EUR", "CAD")],
  ["sede-cerro", lista("CUP", "USD")],
  ["sede-miramar", lista("CUP", "USD", "EUR")],
  ["sede-matanzas", lista("CUP", "USD")],
  ["sede-santa-clara", lista("CUP", "USD", "EUR")],
  ["sede-camaguey", lista("CUP", "USD", "EUR")],
  ["sede-centro-habana", lista("CUP", "USD", "EUR")],
  ["sede-holguin", lista("CUP", "USD")],
  ["sede-santiago", lista("CUP", "USD")],
  ["sede-trinidad", lista("CUP", "USD", "CAD")],
  /* Pinar del Río no tiene ninguna: el aviso de Inicio de sede sin monedas. */
  ["sede-pinar", []],
]);

/** Las monedas de la sede, en el orden en que se añadieron. */
export function monedasDeSede(sedeId: string): readonly MonedaDeSede[] {
  return listas.get(sedeId) ?? [];
}

export function sedeManejaMoneda(sedeId: string, code: string): boolean {
  return monedasDeSede(sedeId).some((m) => m.code === code);
}

/* -------------------------------------------------------------------------
 * Monedas y saldos por caja — sembrados (nota de entrega, §8.3)
 * ---------------------------------------------------------------------- */

/** Saldo de cada moneda habilitada, por caja. Una moneda en 0 está habilitada. */
const saldos = new Map<string, Map<string, number>>();

function sembrarCaja(registerId: string, monedas: Record<string, number>): void {
  saldos.set(registerId, new Map(Object.entries(monedas)));
}

/* Vedado: la libra solo está en la Caja 03 y con saldo — retirarla se bloquea
   nombrando esa caja. */
sembrarCaja("sede-vedado:caja-01", { CUP: 184_500, USD: 2_350, EUR: 610 });
sembrarCaja("sede-vedado:caja-02", { CUP: 96_200, USD: 1_120 });
sembrarCaja("sede-vedado:caja-03", { CUP: 152_000, USD: 1_870, EUR: 420, GBP: 185 });
sembrarCaja("sede-vedado:caja-04", { CUP: 71_300, USD: 0 });
/* Obispo: el dólar canadiense está habilitado en una caja, en cero — retirarlo
   se permite y lo quita también de ella. */
sembrarCaja("sede-habana-vieja:caja-01", { CUP: 120_400, USD: 980, EUR: 210, CAD: 0 });
sembrarCaja("sede-habana-vieja:caja-02", { CUP: 88_000, USD: 640 });
sembrarCaja("sede-habana-vieja:caja-03", { CUP: 103_750, USD: 1_205, EUR: 0 });
sembrarCaja("sede-habana-vieja:caja-04", { CUP: 64_900 });
sembrarCaja("sede-miramar:caja-01", { CUP: 140_000, USD: 1_500, EUR: 300 });
sembrarCaja("sede-miramar:caja-02", { CUP: 90_000, USD: 700 });
sembrarCaja("sede-matanzas:caja-01", { CUP: 75_000, USD: 900 });
sembrarCaja("sede-matanzas:caja-02", { CUP: 52_000 });
sembrarCaja("sede-santa-clara:caja-01", { CUP: 98_000, USD: 1_050, EUR: 150 });

export interface MonedaEnCaja {
  register: Register;
  saldo: number;
}

/** Cajas **activas** de la sede que tienen la moneda habilitada, con su saldo. */
/**
 * Las cajas que tienen la moneda, **también las retiradas**: retirar una
 * moneda las revisa todas (**FR-AD-MON-6**, **FR-AD-MON-7**), y la pantalla
 * tiene que poder decirlo antes de confirmar.
 */
export function cajasConMoneda(sedeId: string, code: string): readonly MonedaEnCaja[] {
  return allRegistersOf(sedeId).flatMap((register) => {
    const saldo = saldos.get(register.id)?.get(code);
    return saldo === undefined ? [] : [{ register, saldo }];
  });
}

/** Monedas habilitadas en una caja. La consulta Worker cuando se recablee. */
export function monedasDeCaja(registerId: string): readonly string[] {
  return findRegisterById(registerId) ? [...(saldos.get(registerId)?.keys() ?? [])] : [];
}

/* -------------------------------------------------------------------------
 * Escrituras — del mercante, nunca de PuntoCash (reglas A4 y A14)
 * ---------------------------------------------------------------------- */

export type MonedaWriteDenial =
  | "alcance-global-prohibido"
  | "fuera-de-alcance"
  | "sede-no-encontrada"
  | "sede-cerrada"
  | "moneda-desconocida"
  | "ya-en-la-lista"
  | "no-en-la-lista"
  /** Alguna caja tiene saldo distinto de cero (**FR-AD-MON-7**). */
  | "con-saldo"
  /** Dejaría una sede activa sin ninguna moneda (**FR-AD-MON-9**). */
  | "ultima-moneda";

export type MonedaWriteResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: MonedaWriteDenial; cajas?: readonly string[] };

function guardar(scope: Scope, sedeId: string): MonedaWriteDenial | null {
  const operator = requireOperatorScope(scope);
  if (!operator.ok) return operator.reason;
  if (!estaEnAlcance(scope, sedeId)) return "fuera-de-alcance";
  const sede = findSedeById(sedeId);
  if (!sede) return "sede-no-encontrada";
  if (sede.status === "cerrada") return "sede-cerrada";
  return null;
}

/**
 * Añade una moneda del catálogo a la lista de la sede (**FR-AD-MON-3**).
 *
 * **No la habilita en ninguna caja ni crea saldo** (**FR-AD-MON-4**): la pone a
 * disposición de los trabajadores, que la habilitan en su caja cuando la
 * necesiten.
 */
export function anadirMonedaASede(
  scope: Scope,
  sedeId: string,
  code: string,
  now = new Date(),
): MonedaWriteResult<MonedaDeSede> {
  const denial = guardar(scope, sedeId);
  if (denial) return { ok: false, reason: denial };
  if (!monedaDelCatalogo(code)) return { ok: false, reason: "moneda-desconocida" };
  if (sedeManejaMoneda(sedeId, code)) return { ok: false, reason: "ya-en-la-lista" };

  const entrada: MonedaDeSede = { code, addedAt: now.toISOString() };
  const actual = listas.get(sedeId);
  if (actual) actual.push(entrada);
  else listas.set(sedeId, [entrada]);
  return { ok: true, value: entrada };
}

export interface RetiradaDeMoneda {
  code: string;
  /** Las cajas de las que salió, todas en cero. */
  cajas: readonly string[];
  /** Las monedas cuya tasa se retiró con ella (**FR-AD-MON-8**). */
  tasas: readonly string[];
}

/**
 * Lo que retirar una moneda arrastra en Tasas. Se inyecta —lo da
 * `EFECTOS_EN_TASAS` de `rates.ts`— porque `rates.ts` ya depende de este
 * módulo, y es la misma forma en que `retirarCaja` recibe sus guardas.
 */
export interface EfectosDeRetirarMoneda {
  tasasQueArrastra(sedeId: string, code: string): readonly string[];
  retirar(sedeId: string, codes: readonly string[]): void;
}

const SIN_EFECTOS: EfectosDeRetirarMoneda = {
  tasasQueArrastra: () => [],
  retirar: () => {},
};

/**
 * Retira una moneda de la lista de la sede (decisión del 15/10/2026).
 *
 * **Exige saldo cero en todas las cajas de la sede** (**FR-AD-MON-7**) y, al
 * retirarla, **la quita también de las cajas que la tenían en cero**
 * (**FR-AD-MON-6**): «la sede ya no maneja esta moneda» significa eso en todas
 * partes, no solo que deje de poder añadirse. Ningún saldo se pierde —eran
 * cero— y ningún registro histórico se toca **[R9]**.
 *
 * Retira además las tasas que la usan (**FR-AD-MON-8**): la suya y, si es el
 * CUP, todas las de la sede, porque sin moneda local ninguna se cotiza.
 */
export function retirarMonedaDeSede(
  scope: Scope,
  sedeId: string,
  code: string,
  efectos: EfectosDeRetirarMoneda = SIN_EFECTOS,
): MonedaWriteResult<RetiradaDeMoneda> {
  const denial = guardar(scope, sedeId);
  if (denial) return { ok: false, reason: denial };

  const actual = listas.get(sedeId) ?? [];
  if (!actual.some((m) => m.code === code)) return { ok: false, reason: "no-en-la-lista" };

  const sede = findSedeById(sedeId);
  if (sede?.status === "activa" && actual.length <= 1) {
    return { ok: false, reason: "ultima-moneda" };
  }

  /* Todas las cajas, también las retiradas: una caja retirada con saldo es
     dinero que alguien tiene que ver antes de dar la moneda por cerrada. */
  const conMoneda = allRegistersOf(sedeId).filter((r) => saldos.get(r.id)?.has(code));
  const conSaldo = conMoneda.filter((r) => (saldos.get(r.id)?.get(code) ?? 0) !== 0);
  if (conSaldo.length > 0) {
    return { ok: false, reason: "con-saldo", cajas: conSaldo.map((r) => r.name) };
  }

  const arrastradas = efectos.tasasQueArrastra(sedeId, code);
  efectos.retirar(sedeId, arrastradas);
  for (const r of conMoneda) saldos.get(r.id)?.delete(code);
  listas.set(
    sedeId,
    actual.filter((m) => m.code !== code),
  );
  return {
    ok: true,
    value: { code, cajas: conMoneda.map((r) => r.name), tasas: arrastradas },
  };
}
