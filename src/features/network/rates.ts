/**
 * TASAS — el rango de PuntoCash y la tasa de cada sede.
 *
 * ── Qué es una tasa aquí (decisión del 15/10/2026) ────────────────────────
 * **Siempre una moneda contra el peso cubano.** Cada moneda de la lista de la
 * sede, salvo el propio CUP, puede tener su **compra** (lo que la casa paga al
 * cliente por una unidad) y su **venta** (lo que le cobra), en CUP. Es lo que
 * el cliente lee en el tablero. No hay pares cruzados (USD/EUR).
 *
 * Dos dueños, como en Monedas:
 *
 *  · **PuntoCash** fija, por moneda, un **rango** de compra y otro de venta
 *    para toda la red (**FR-SA-TASA-***). Sin rango, nadie cotiza esa moneda.
 *  · **El mercante** fija la tasa de cada sede **dentro** de ese rango
 *    (**FR-AD-TASA-***, **A5**).
 *
 * Esa tasa es a la vez la que la sede cotiza y la que su tablero exhibe —el
 * del kiosco y el de la pantalla informativa— (**A12**): `tableroPublico` es
 * el único sitio del que la leen.
 *
 * ── Cuándo una tasa está «en vigor» ───────────────────────────────────────
 * Una tasa definida no se borra porque cambie algo a su alrededor; deja de
 * estar en vigor, y vuelve sola si la causa desaparece (**FR-AD-TASA-14**,
 * **FR-AD-TASA-15**). Está en vigor cuando se cumplen las cuatro condiciones
 * de `motivoFueraDeVigor`.
 */

import { estaEnAlcance } from "./assignments";
import { monedaDelCatalogo, monedasDeSede, sedeManejaMoneda } from "./currencies";
import { findSedeById } from "./sedes";
import { requireOperatorScope, type Scope } from "./scope";

/** La moneda contra la que se cotiza todo. */
export const MONEDA_LOCAL = "CUP";

/** El servicio sin el cual una sede no cotiza (**A5**). */
export const SERVICIO_CAMBIO = "cambio-moneda";

/* -------------------------------------------------------------------------
 * Rangos de PuntoCash — por moneda, contra CUP (regla A3)
 * ---------------------------------------------------------------------- */

export interface Intervalo {
  min: number;
  max: number;
}

export interface RangoDeTasa {
  code: string;
  compra: Intervalo;
  venta: Intervalo;
  /** Cambia cada vez que PuntoCash lo mueve: es lo que permite FR-AD-TASA-11. */
  version: string;
}

/**
 * Siembra. El dólar canadiense **no tiene rango**: Obispo lo maneja y no puede
 * cotizarlo, que es el caso de **FR-AD-TASA-3**. Lo mismo yen, dólar
 * australiano y los pesos colombiano y chileno.
 */
const rangos = new Map<string, RangoDeTasa>(
  (
    [
      ["USD", [300, 330], [310, 340]],
      ["EUR", [325, 355], [335, 365]],
      ["GBP", [380, 410], [390, 420]],
      ["CHF", [345, 370], [355, 380]],
      ["MXN", [14, 18], [15, 20]],
    ] as const
  ).map(([code, compra, venta]) => [
    code,
    {
      code,
      compra: { min: compra[0], max: compra[1] },
      venta: { min: venta[0], max: venta[1] },
      version: "2026-10-01",
    },
  ]),
);

export function rangoDe(code: string): RangoDeTasa | null {
  return rangos.get(code) ?? null;
}

export function dentroDe(valor: number, intervalo: Intervalo): boolean {
  return valor >= intervalo.min && valor <= intervalo.max;
}

/* -------------------------------------------------------------------------
 * Tasas de cada sede — del mercante (regla A4)
 * ---------------------------------------------------------------------- */

export interface FijacionAutomatica {
  at: string;
  anterior: { compra: number; venta: number };
}

export interface TasaDeSede {
  code: string;
  compra: number;
  venta: number;
  updatedAt: string;
  updatedBy: string;
  /**
   * PuntoCash movió el rango y esta tasa quedó fuera: el sistema la llevó al
   * límite más cercano (**FR-AD-TASA-12**, **FR-SA-TASA-8**). Se quita en
   * cuanto el mercante fija un valor él mismo.
   */
  fijadaAlLimite?: FijacionAutomatica;
}

const tasa = (
  code: string,
  compra: number,
  venta: number,
  extra: Partial<TasaDeSede> = {},
): TasaDeSede => ({
  code,
  compra,
  venta,
  updatedAt: "2026-10-14T13:30:00.000Z",
  updatedBy: "Marta Sánchez",
  ...extra,
});

/**
 * Siembra. En **Obispo** el euro está fijado al límite: PuntoCash bajó el
 * máximo de venta a 365 y la sede vendía a 368. **Matanzas** conserva una tasa
 * del dólar de cuando tenía Cambio de moneda: no se exhibe ni se cotiza, y
 * volvería sola si PuntoCash se lo habilita (**FR-AD-TASA-14**). **Cerro**,
 * recién asignada, no tiene ninguna.
 */
const tasas = new Map<string, TasaDeSede[]>([
  ["sede-vedado", [tasa("USD", 318, 326), tasa("EUR", 342, 354), tasa("GBP", 398, 410)]],
  [
    "sede-habana-vieja",
    [
      tasa("USD", 316, 325),
      tasa("EUR", 341, 365, {
        updatedAt: "2026-10-15T08:00:00.000Z",
        updatedBy: "PuntoCash",
        fijadaAlLimite: {
          at: "2026-10-15T08:00:00.000Z",
          anterior: { compra: 341, venta: 368 },
        },
      }),
    ],
  ],
  [
    "sede-miramar",
    [
      tasa("USD", 319, 328, { updatedBy: "Reinaldo Ortega" }),
      tasa("EUR", 343, 355, { updatedBy: "Reinaldo Ortega" }),
    ],
  ],
  ["sede-matanzas", [tasa("USD", 317, 327, { updatedBy: "Reinaldo Ortega" })]],
  ["sede-santa-clara", [tasa("USD", 315, 324, { updatedBy: "Reinaldo Ortega" })]],
  ["sede-camaguey", [tasa("USD", 314, 323), tasa("EUR", 338, 350)]],
  ["sede-centro-habana", [tasa("USD", 317, 326), tasa("EUR", 341, 353)]],
  ["sede-holguin", [tasa("USD", 313, 322)]],
  /* El dólar canadiense no tiene rango de PuntoCash: la tasa queda sin cotizar,
     con su razón (FR-AD-TASA-15). */
  [
    "sede-trinidad",
    [tasa("USD", 315, 325, { updatedBy: "Ana Barrios" }), tasa("CAD", 228, 236, { updatedBy: "Ana Barrios" })],
  ],
]);

/** Todas las tasas definidas de la sede, en vigor o no, en el orden de su lista de monedas. */
export function tasasDeSede(sedeId: string): readonly TasaDeSede[] {
  const definidas = tasas.get(sedeId) ?? [];
  const orden = monedasDeSede(sedeId).map((m) => m.code);
  const pos = (code: string) => {
    const i = orden.indexOf(code);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...definidas].sort((a, b) => pos(a.code) - pos(b.code));
}

export function tasaDe(sedeId: string, code: string): TasaDeSede | null {
  return (tasas.get(sedeId) ?? []).find((t) => t.code === code) ?? null;
}

/**
 * Por qué una moneda **no puede cotizarse** en una sede, o `null` si puede.
 * Son las condiciones de **FR-AD-TASA-2**, en el orden en que se resuelven:
 * no tiene sentido pedir un rango para una moneda que la sede no maneja.
 */
export type MotivoSinCotizacion =
  | "sin-servicio"
  | "moneda-local"
  | "fuera-de-la-lista"
  | "sin-moneda-local"
  | "sin-rango";

export function motivoFueraDeVigor(sedeId: string, code: string): MotivoSinCotizacion | null {
  if (code === MONEDA_LOCAL) return "moneda-local";
  const sede = findSedeById(sedeId);
  if (!sede || !sede.services.includes(SERVICIO_CAMBIO)) return "sin-servicio";
  if (!sedeManejaMoneda(sedeId, code)) return "fuera-de-la-lista";
  if (!sedeManejaMoneda(sedeId, MONEDA_LOCAL)) return "sin-moneda-local";
  if (!rangoDe(code)) return "sin-rango";
  return null;
}

/* -------------------------------------------------------------------------
 * El tablero público — la única lectura que hacen el kiosco y la pantalla
 * ---------------------------------------------------------------------- */

export interface TasaPublica {
  currency: string;
  name: string;
  /** CUP que la sede paga por una unidad (la sede compra). */
  buy: number;
  /** CUP que la sede cobra por una unidad (la sede vende). */
  sell: number;
}

/**
 * Lo que el tablero de una sede exhibe: **solo las tasas en vigor**. Una sede
 * cerrada, sin Cambio de moneda o sin ninguna tasa devuelve una lista vacía, y
 * es la pantalla la que decide cómo decirlo.
 */
export function tableroPublico(sedeId: string): readonly TasaPublica[] {
  const sede = findSedeById(sedeId);
  if (!sede || sede.status === "cerrada") return [];
  return tasasDeSede(sedeId)
    .filter((t) => motivoFueraDeVigor(sedeId, t.code) === null)
    .map((t) => ({
      currency: t.code,
      name: monedaDelCatalogo(t.code)?.name ?? t.code,
      buy: t.compra,
      sell: t.venta,
    }));
}

/* -------------------------------------------------------------------------
 * Escrituras — del mercante, nunca de PuntoCash (reglas A4 y A14)
 * ---------------------------------------------------------------------- */

export type TasaWriteDenial =
  | "alcance-global-prohibido"
  | "fuera-de-alcance"
  | "sede-no-encontrada"
  | "sede-cerrada"
  | MotivoSinCotizacion
  | "compra-fuera-de-rango"
  | "venta-fuera-de-rango"
  | "compra-mayor-que-venta"
  /** PuntoCash movió el rango mientras la pantalla estaba abierta (**FR-AD-TASA-11**). */
  | "rango-cambiado"
  | "sin-tasa";

export type TasaWriteResult<T> = { ok: true; value: T } | { ok: false; reason: TasaWriteDenial };

function guardar(scope: Scope, sedeId: string): TasaWriteDenial | null {
  const operator = requireOperatorScope(scope);
  if (!operator.ok) return operator.reason;
  if (!estaEnAlcance(scope, sedeId)) return "fuera-de-alcance";
  const sede = findSedeById(sedeId);
  if (!sede) return "sede-no-encontrada";
  if (sede.status === "cerrada") return "sede-cerrada";
  return null;
}

export interface FijarTasaInput {
  sedeId: string;
  code: string;
  compra: number;
  venta: number;
  /** La versión del rango que la pantalla enseñó. Si ya no es la vigente, se rechaza. */
  versionDelRango: string;
  autor: string;
}

/**
 * Define la tasa de una moneda o la cambia — es el mismo acto: **no existe
 * una moneda cotizada sin tasa** (**FR-AD-TASA-5**). Revalida las condiciones
 * y el rango vigente aunque la pantalla ya lo haya hecho (**FR-AD-TASA-11**).
 */
export function fijarTasa(
  scope: Scope,
  input: FijarTasaInput,
  now = new Date(),
): TasaWriteResult<{ tasa: TasaDeSede; anterior: TasaDeSede | null }> {
  const denial = guardar(scope, input.sedeId);
  if (denial) return { ok: false, reason: denial };

  const motivo = motivoFueraDeVigor(input.sedeId, input.code);
  if (motivo) return { ok: false, reason: motivo };

  const rango = rangoDe(input.code)!;
  if (rango.version !== input.versionDelRango) return { ok: false, reason: "rango-cambiado" };
  if (!Number.isFinite(input.compra) || !dentroDe(input.compra, rango.compra)) {
    return { ok: false, reason: "compra-fuera-de-rango" };
  }
  if (!Number.isFinite(input.venta) || !dentroDe(input.venta, rango.venta)) {
    return { ok: false, reason: "venta-fuera-de-rango" };
  }
  if (input.compra > input.venta) return { ok: false, reason: "compra-mayor-que-venta" };

  const lista = tasas.get(input.sedeId) ?? [];
  const actual = lista.find((t) => t.code === input.code) ?? null;
  const anterior = actual ? { ...actual } : null;

  const nueva: TasaDeSede = {
    code: input.code,
    compra: input.compra,
    venta: input.venta,
    updatedAt: now.toISOString(),
    updatedBy: input.autor,
  };
  tasas.set(input.sedeId, [...lista.filter((t) => t.code !== input.code), nueva]);
  return { ok: true, value: { tasa: nueva, anterior } };
}

/**
 * Da por buena una tasa que **ajustó PuntoCash** al mover un rango
 * (**FR-AD-TASA-12**): las cifras no cambian, pero desde ahora son una
 * decisión del mercante y dejan de marcarse. Sin esto, quien estuviera
 * conforme con el ajuste no tendría forma de quitar el aviso salvo moviendo
 * la tasa sin querer.
 */
export function confirmarTasaAjustada(
  scope: Scope,
  sedeId: string,
  code: string,
  autor: string,
  now = new Date(),
): TasaWriteResult<TasaDeSede> {
  const denial = guardar(scope, sedeId);
  if (denial) return { ok: false, reason: denial };
  const actual = (tasas.get(sedeId) ?? []).find((t) => t.code === code);
  if (!actual) return { ok: false, reason: "sin-tasa" };
  if (!actual.fijadaAlLimite) return { ok: true, value: actual };
  delete actual.fijadaAlLimite;
  actual.updatedAt = now.toISOString();
  actual.updatedBy = autor;
  return { ok: true, value: actual };
}

/**
 * Retira la tasa de una moneda: la sede deja de cotizarla y desaparece de su
 * tablero. **No** retira la moneda de la lista: la sede puede seguir
 * manejándola en caja (**FR-AD-TASA-13**).
 */
export function retirarTasa(
  scope: Scope,
  sedeId: string,
  code: string,
): TasaWriteResult<TasaDeSede> {
  const denial = guardar(scope, sedeId);
  if (denial) return { ok: false, reason: denial };
  const lista = tasas.get(sedeId) ?? [];
  const actual = lista.find((t) => t.code === code);
  if (!actual) return { ok: false, reason: "sin-tasa" };
  tasas.set(
    sedeId,
    lista.filter((t) => t.code !== code),
  );
  return { ok: true, value: actual };
}

/* -------------------------------------------------------------------------
 * Lo que retirar una moneda arrastra — FR-AD-MON-8
 * ---------------------------------------------------------------------- */

/**
 * Los efectos de retirar una moneda sobre las tasas, inyectados en
 * `retirarMonedaDeSede` igual que las guardas de una caja se inyectan en
 * `retirarCaja`: así `currencies.ts` no depende de este módulo, que ya
 * depende de él.
 *
 * Retirar el **CUP** arrastra todas las tasas de la sede, porque sin moneda
 * local ninguna puede cotizarse.
 */
export const EFECTOS_EN_TASAS = {
  tasasQueArrastra(sedeId: string, code: string): readonly string[] {
    const definidas = tasas.get(sedeId) ?? [];
    return code === MONEDA_LOCAL
      ? definidas.map((t) => t.code)
      : definidas.filter((t) => t.code === code).map((t) => t.code);
  },
  retirar(sedeId: string, codes: readonly string[]): void {
    tasas.set(
      sedeId,
      (tasas.get(sedeId) ?? []).filter((t) => !codes.includes(t.code)),
    );
  },
};
