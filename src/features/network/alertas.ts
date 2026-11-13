/**
 * ALERTAS DE CAJA — bloque 6 del rediseño de Caja (decisión del 12/11/2026).
 *
 * Una alerta avisa de que una caja con la jornada abierta se está quedando
 * sin con qué operar, o acumula más efectivo del que conviene tener a mano:
 *
 *   · **efectivo bajo** o **alto** de una moneda: el saldo sale de los límites
 *     que fijó la sede;
 *   · **pocos billetes** de una denominación: quedan menos que el mínimo.
 *
 * Las define **el administrador de la sede, para su sede**, y valen para todas
 * sus cajas.
 *
 * ── Es un estado, no una tarea ───────────────────────────────────────────
 * Una alerta está activa mientras la condición se cumple y se apaga sola
 * cuando deja de cumplirse. No hay «marcar como atendida»: lo único que la
 * apaga es arreglar la caja (una reposición, un retiro, un cambio de billetes).
 *
 * El historial **no se guarda aparte**: se recalcula repasando los movimientos
 * de cada jornada con las reglas que estaban en vigor en cada momento. Así no
 * hay un segundo registro que pueda contradecir al de movimientos, y cambiar
 * una regla no reescribe lo que pasó antes de cambiarla (cada cambio abre una
 * versión nueva de las reglas).
 *
 * ── Solo con la jornada abierta ──────────────────────────────────────────
 * Una caja cerrada no opera: sus alertas se apagan al cerrar y, si sigue
 * baja o alta, se vuelven a encender al abrir. Avisar de madrugada de algo que
 * nadie puede arreglar es ruido.
 *
 * ── Lo que ve cada uno ───────────────────────────────────────────────────
 * El trabajador las ve **sin cifras** («Efectivo bajo en USD»): Worker es a
 * ciegas y la alerta solo le dice a quién llamar. La administración ve las
 * cifras y los límites.
 */

import { almacen } from "./almacen";
import { estaEnAlcance } from "./assignments";
import { monedasDeSede } from "./currencies";
import { denominacionesDe, todasLasDenominaciones } from "./denominaciones";
import { inventarioDeJornada, saldosDe, type Jornada } from "./jornadas";
import { requireOperatorScope, type Scope, type ScopeDenial } from "./scope";
import { findSedeById } from "./sedes";
import { clave, formatoDeDenominacion, valorDeClave, type Billetes } from "@/features/caja/billetes";

export interface ReglaDeMoneda {
  currency: string;
  /** Por debajo de este saldo, alerta de efectivo bajo. `null`: sin límite. */
  minimo: number | null;
  /** Por encima de este saldo, alerta de efectivo alto. `null`: sin límite. */
  maximo: number | null;
  /** Por denominación (clave en céntimos): menos billetes que esto, alerta. */
  billetesMinimos: Readonly<Record<string, number>>;
}

interface VersionDeReglas {
  /** Desde cuándo rige. */
  desde: string;
  monedas: readonly ReglaDeMoneda[];
}

const EPOCA = "2026-01-01T00:00:00.000Z";

/** Las reglas con que arranca la demostración: lo justo para que se vean alertas. */
const SEMILLA: Readonly<Record<string, readonly ReglaDeMoneda[]>> = {
  "sede-vedado": [
    { currency: "CUP", minimo: 20_000, maximo: 900_000, billetesMinimos: {} },
    { currency: "USD", minimo: 50, maximo: 6_000, billetesMinimos: { "1000": 5 } },
    { currency: "EUR", minimo: 100, maximo: 5_000, billetesMinimos: {} },
  ],
  "sede-habana-vieja": [
    { currency: "CUP", minimo: 5_000, maximo: 800_000, billetesMinimos: {} },
    { currency: "USD", minimo: 200, maximo: 5_000, billetesMinimos: {} },
  ],
};

const versiones = almacen("alertas-reglas", () => {
  const m = new Map<string, VersionDeReglas[]>();
  for (const [sedeId, monedas] of Object.entries(SEMILLA)) m.set(sedeId, [{ desde: EPOCA, monedas }]);
  return m;
});

/** Las reglas que rigen en `en` (por defecto, ahora). Sin reglas, ninguna alerta. */
export function reglasVigentes(sedeId: string, en: Date | string = new Date()): readonly ReglaDeMoneda[] {
  const t = typeof en === "string" ? en : en.toISOString();
  const lista = versiones.get(sedeId) ?? [];
  let vigente: VersionDeReglas | null = null;
  for (const v of lista) if (v.desde <= t) vigente = v;
  return vigente?.monedas ?? [];
}

function cambiosDeReglas(sedeId: string): readonly string[] {
  return (versiones.get(sedeId) ?? []).map((v) => v.desde);
}

// ── Qué alertas hay ──────────────────────────────────────────────────────

export type TipoDeAlerta = "efectivo-bajo" | "efectivo-alto" | "billetes-pocos";

export interface AlertaDeCaja {
  /** Identifica la alerta dentro de una caja: tipo, moneda y, si procede, denominación. */
  clave: string;
  tipo: TipoDeAlerta;
  currency: string;
  /** La denominación, solo en `billetes-pocos`. */
  valor?: number;
  /** Lo que hay: el saldo, o los billetes de esa denominación. */
  actual: number;
  /** El límite que se cruzó. */
  limite: number;
}

const claveDe = (tipo: TipoDeAlerta, currency: string, valor?: number) =>
  valor === undefined ? `${tipo}:${currency}` : `${tipo}:${currency}:${clave(valor)}`;

function evaluar(
  reglas: readonly ReglaDeMoneda[],
  saldos: ReadonlyMap<string, number>,
  inventario: ReadonlyMap<string, Billetes>,
): AlertaDeCaja[] {
  const out: AlertaDeCaja[] = [];
  for (const r of reglas) {
    if (!saldos.has(r.currency)) continue;
    const saldo = saldos.get(r.currency) ?? 0;
    if (r.minimo !== null && saldo < r.minimo) {
      out.push({ clave: claveDe("efectivo-bajo", r.currency), tipo: "efectivo-bajo", currency: r.currency, actual: saldo, limite: r.minimo });
    }
    if (r.maximo !== null && saldo > r.maximo) {
      out.push({ clave: claveDe("efectivo-alto", r.currency), tipo: "efectivo-alto", currency: r.currency, actual: saldo, limite: r.maximo });
    }
    const billetes = inventario.get(r.currency) ?? {};
    for (const [k, minimo] of Object.entries(r.billetesMinimos)) {
      const cantidad = billetes[k] ?? 0;
      if (cantidad < minimo) {
        const valor = valorDeClave(k);
        out.push({ clave: claveDe("billetes-pocos", r.currency, valor), tipo: "billetes-pocos", currency: r.currency, valor, actual: cantidad, limite: minimo });
      }
    }
  }
  return out;
}

/** Lo que dice la alerta, sin una sola cifra de la caja: es lo que ve el trabajador. */
export function tituloDeAlerta(a: Pick<AlertaDeCaja, "tipo" | "currency" | "valor">): string {
  switch (a.tipo) {
    case "efectivo-bajo":
      return `Efectivo bajo en ${a.currency}`;
    case "efectivo-alto":
      return `Efectivo alto en ${a.currency}`;
    case "billetes-pocos": {
      const esMoneda = todasLasDenominaciones(a.currency).find((d) => d.valor === a.valor)?.tipo === "moneda";
      const valor = formatoDeDenominacion(a.valor ?? 0);
      return esMoneda ? `Quedan pocas monedas de ${valor} ${a.currency}` : `Quedan pocos billetes de ${valor} ${a.currency}`;
    }
  }
}

/** Las alertas que tiene ahora una jornada abierta; una cerrada no tiene ninguna. */
export function alertasActivas(j: Jornada, ahora: Date = new Date()): readonly AlertaDeCaja[] {
  if (j.estado !== "abierta") return [];
  const saldos = new Map(saldosDe(j).map((s) => [s.currency, s.amount]));
  return evaluar(reglasVigentes(j.sedeId, ahora), saldos, inventarioDeJornada(j));
}

/** Lo que llega al navegador del trabajador: título y nada más. */
export interface AlertaParaElTrabajador {
  clave: string;
  texto: string;
}

export function alertasParaElTrabajador(j: Jornada | null, ahora: Date = new Date()): readonly AlertaParaElTrabajador[] {
  if (!j) return [];
  return alertasActivas(j, ahora).map((a) => ({ clave: a.clave, texto: tituloDeAlerta(a) }));
}

// ── Historial ────────────────────────────────────────────────────────────

export interface TramoDeAlerta {
  clave: string;
  tipo: TipoDeAlerta;
  currency: string;
  valor?: number;
  desde: string;
  /** `null`: sigue activa. */
  hasta: string | null;
  jornadaId: string;
}

/**
 * Cuándo estuvo activa cada alerta durante una jornada: se repasan sus
 * movimientos y, en cada uno (y en cada cambio de reglas), se mira qué
 * alertas había. Un tramo se cierra al apagarse la alerta o al cerrar la
 * jornada.
 */
export function historialDeJornada(j: Jornada): readonly TramoDeAlerta[] {
  type Punto = { t: string; mov?: Jornada["movimientos"][number] };
  const fin = j.closedAt;
  const puntos: Punto[] = [
    ...j.movimientos.map((mov) => ({ t: mov.fechaHora, mov })),
    ...cambiosDeReglas(j.sedeId)
      .filter((t) => t > j.openedAt && (!fin || t < fin))
      .map((t) => ({ t })),
  ].sort((a, b) => a.t.localeCompare(b.t));

  const saldos = new Map<string, number>();
  const inventario = new Map<string, Record<string, number>>();
  const abiertos = new Map<string, TramoDeAlerta>();
  const out: TramoDeAlerta[] = [];

  for (const p of puntos) {
    if (p.mov) {
      saldos.set(p.mov.currency, p.mov.saldoDespues);
      if (p.mov.billetes) {
        const inv = inventario.get(p.mov.currency) ?? {};
        for (const [k, n] of Object.entries(p.mov.billetes)) inv[k] = (inv[k] ?? 0) + n;
        inventario.set(p.mov.currency, inv);
      }
    }
    const ahora = new Map(evaluar(reglasVigentes(j.sedeId, p.t), saldos, inventario).map((a) => [a.clave, a]));
    for (const [k, tramo] of abiertos) {
      if (!ahora.has(k)) {
        out.push({ ...tramo, hasta: p.t });
        abiertos.delete(k);
      }
    }
    for (const [k, a] of ahora) {
      if (!abiertos.has(k)) {
        abiertos.set(k, { clave: k, tipo: a.tipo, currency: a.currency, valor: a.valor, desde: p.t, hasta: null, jornadaId: j.id });
      }
    }
  }
  for (const tramo of abiertos.values()) out.push({ ...tramo, hasta: fin });
  return out.sort((a, b) => b.desde.localeCompare(a.desde));
}

/** El historial de varias jornadas, lo más reciente primero. */
export function historialDeAlertas(jornadas: readonly Jornada[]): readonly TramoDeAlerta[] {
  return jornadas.flatMap(historialDeJornada).sort((a, b) => b.desde.localeCompare(a.desde));
}

/** Desde cuándo está activa cada alerta de una jornada abierta. */
export function desdeDeAlertas(j: Jornada): ReadonlyMap<string, string> {
  return new Map(historialDeJornada(j).filter((t) => t.hasta === null).map((t) => [t.clave, t.desde]));
}

// ── Definir las reglas ───────────────────────────────────────────────────

export type ReglasDenial =
  | ScopeDenial
  | "fuera-de-alcance"
  | "sede-no-encontrada"
  | "sede-cerrada"
  | "importe-invalido"
  | "minimo-mayor-que-maximo"
  | "cantidad-invalida";

export type ReglasResult =
  | { ok: true; value: { cambiaron: boolean; antes: readonly ReglaDeMoneda[]; despues: readonly ReglaDeMoneda[] } }
  | { ok: false; reason: ReglasDenial; currency?: string };

const aDosDecimales = (n: number) => Math.round(n * 100) / 100;

/**
 * Fija las reglas de una sede. Sustituye a las anteriores —lo que no venga
 * queda sin límite— y, si algo cambió, abre una versión nueva: lo ocurrido
 * antes se sigue leyendo con las reglas de entonces.
 */
export function definirReglas(
  scope: Scope,
  sedeId: string,
  entrada: readonly ReglaDeMoneda[],
  now: Date = new Date(),
): ReglasResult {
  const operador = requireOperatorScope(scope);
  if (!operador.ok) return { ok: false, reason: operador.reason };
  if (!estaEnAlcance(scope, sedeId)) return { ok: false, reason: "fuera-de-alcance" };
  const sede = findSedeById(sedeId);
  if (!sede) return { ok: false, reason: "sede-no-encontrada" };
  if (sede.status === "cerrada") return { ok: false, reason: "sede-cerrada" };

  const monedas = new Set(monedasDeSede(sedeId).map((m) => m.code));
  const nuevas: ReglaDeMoneda[] = [];
  for (const r of entrada) {
    if (!monedas.has(r.currency)) continue;
    for (const v of [r.minimo, r.maximo]) {
      if (v !== null && (!Number.isFinite(v) || v < 0)) return { ok: false, reason: "importe-invalido", currency: r.currency };
    }
    const minimo = r.minimo === null ? null : aDosDecimales(r.minimo);
    const maximo = r.maximo === null ? null : aDosDecimales(r.maximo);
    if (minimo !== null && maximo !== null && minimo > maximo) {
      return { ok: false, reason: "minimo-mayor-que-maximo", currency: r.currency };
    }
    const vigentes = new Set(denominacionesDe(r.currency).map((d) => clave(d.valor)));
    const billetesMinimos: Record<string, number> = {};
    for (const [k, n] of Object.entries(r.billetesMinimos)) {
      if (!Number.isInteger(n) || n < 0) return { ok: false, reason: "cantidad-invalida", currency: r.currency };
      if (n > 0 && vigentes.has(k)) billetesMinimos[k] = n;
    }
    if (minimo === null && maximo === null && Object.keys(billetesMinimos).length === 0) continue;
    nuevas.push({ currency: r.currency, minimo, maximo, billetesMinimos });
  }
  nuevas.sort((a, b) => a.currency.localeCompare(b.currency));

  const antes = reglasVigentes(sedeId, now);
  const cambiaron = JSON.stringify(ordenadas(antes)) !== JSON.stringify(ordenadas(nuevas));
  if (cambiaron) {
    const lista = versiones.get(sedeId) ?? [];
    lista.push({ desde: now.toISOString(), monedas: nuevas });
    versiones.set(sedeId, lista);
  }
  return { ok: true, value: { cambiaron, antes, despues: nuevas } };
}

function ordenadas(l: readonly ReglaDeMoneda[]) {
  return [...l]
    .sort((a, b) => a.currency.localeCompare(b.currency))
    .map((r) => ({ ...r, billetesMinimos: Object.fromEntries(Object.entries(r.billetesMinimos).sort(([a], [b]) => a.localeCompare(b))) }));
}

/** Una línea por regla, para el registro de auditoría. */
export function resumenDeReglas(reglas: readonly ReglaDeMoneda[]): string {
  if (reglas.length === 0) return "sin alertas";
  return reglas
    .map((r) => {
      const partes: string[] = [];
      if (r.minimo !== null) partes.push(`mín. ${r.minimo}`);
      if (r.maximo !== null) partes.push(`máx. ${r.maximo}`);
      const b = Object.entries(r.billetesMinimos);
      if (b.length > 0) partes.push(`billetes: ${b.map(([k, n]) => `${formatoDeDenominacion(valorDeClave(k))}≥${n}`).join(", ")}`);
      return `${r.currency} ${partes.join(" · ")}`;
    })
    .join(" | ");
}
