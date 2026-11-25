import { monedaDelCatalogo } from "@/features/network/currencies";
import type { RedEnAlcance } from "@/features/network/scoped-reads";
import type { Sede } from "@/features/network/sedes";
import {
  avisosDeTarifa,
  inicioDeTramo,
  resumenDeTarifa,
  SERVICIO_GIROS,
  tarifaDeGiro,
  type TarifaDeGiro,
  type TipoDeAvisoDeTarifa,
} from "@/features/network/tarifas";
import type { TramoMostrado } from "@/components/patterns/tarifa-de-giro";
import { importe } from "@/lib/formato-de-tarifa";
import { fechaYHora } from "../jornadas/formato";
import type { AvisoMostrado } from "./avisos-de-tarifa";

/**
 * Lo que Tarifas e Inicio leen de las tarifas, en el alcance del selector.
 *
 * Las tarifas son de toda la red, pero al administrador solo le sirven las de
 * las monedas en que **sus** sedes envían giros (decisión del 24/11/2026): las
 * demás no las va a cobrar nunca.
 */

export interface SedeBreve {
  id: string;
  name: string;
}

export interface TarifaVigente {
  minimo: number;
  tramos: readonly TramoMostrado[];
  /** Desde cuándo rige: lo último que hizo PuntoCash con ella. */
  desde: string;
}

export interface MonedaDeGiros {
  code: string;
  nombre: string;
  /** Las sedes del alcance que envían giros en ella. */
  sedes: readonly SedeBreve[];
  /** `null`: PuntoCash no le ha definido tarifa y en ella no se envían giros. */
  tarifa: TarifaVigente | null;
}

export function tramosMostrados(t: Pick<TarifaDeGiro, "minimo" | "tramos">): readonly TramoMostrado[] {
  return t.tramos.map((x, i) => ({ ...x, ...inicioDeTramo(t, i) }));
}

/** Las sedes del alcance que ofrecen Giros. Una cerrada ya no envía nada. */
export function sedesConGiros(sedes: readonly Sede[]): readonly Sede[] {
  return sedes.filter((s) => s.status !== "cerrada" && s.services.includes(SERVICIO_GIROS));
}

/** Las monedas en que las sedes del alcance envían giros, con tarifa o sin ella. */
export function monedasDeGiros(red: RedEnAlcance, sedes: readonly Sede[]): readonly MonedaDeGiros[] {
  const porMoneda = new Map<string, SedeBreve[]>();
  for (const sede of sedesConGiros(sedes)) {
    for (const m of red.monedas(sede.id)) {
      const lista = porMoneda.get(m.code) ?? [];
      lista.push({ id: sede.id, name: sede.name });
      porMoneda.set(m.code, lista);
    }
  }
  return [...porMoneda.entries()].map(([code, lista]) => {
    const t = tarifaDeGiro(code);
    return {
      code,
      nombre: monedaDelCatalogo(code)?.name ?? code,
      sedes: lista,
      tarifa: t ? { minimo: t.minimo, tramos: tramosMostrados(t), desde: t.updatedAt } : null,
    };
  });
}

/**
 * Un aviso de tarifa, agrupado por moneda: PuntoCash cambia la tarifa de una
 * moneda para toda la red, así que se cuenta una vez con las sedes a las que
 * afecta, y no una vez por sede.
 */
export interface AvisoAgrupado {
  moneda: string;
  nombre: string;
  tipo: TipoDeAvisoDeTarifa;
  at: string;
  sedes: readonly SedeBreve[];
  /** La tarifa que la sede conocía; `null` si no tenía. */
  anterior: TarifaDeGiro | null;
}

export function avisosAgrupados(sedes: readonly Sede[]): readonly AvisoAgrupado[] {
  const grupos = new Map<string, AvisoAgrupado & { sedes: SedeBreve[] }>();
  for (const sede of sedes) {
    for (const a of avisosDeTarifa(sede.id)) {
      const clave = `${a.moneda}|${a.tipo}`;
      const g = grupos.get(clave);
      if (g) {
        g.sedes.push({ id: sede.id, name: sede.name });
        if (a.at > g.at) g.at = a.at;
      } else {
        grupos.set(clave, {
          moneda: a.moneda,
          nombre: monedaDelCatalogo(a.moneda)?.name ?? a.moneda,
          tipo: a.tipo,
          at: a.at,
          sedes: [{ id: sede.id, name: sede.name }],
          anterior: a.anterior,
        });
      }
    }
  }
  return [...grupos.values()].sort((x, y) => y.at.localeCompare(x.at));
}

/** «Sede A», «Sede A y Sede B», «Sede A, Sede B y Sede C». */
export function enumerar(nombres: readonly string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

/** El título de un aviso, igual en Inicio y en Tarifas. */
export function tituloDeAviso(a: Pick<AvisoAgrupado, "tipo" | "moneda">): string {
  switch (a.tipo) {
    case "definida":
      return `PuntoCash definió la tarifa de giros en ${a.moneda}`;
    case "cambiada":
      return `PuntoCash cambió la tarifa de giros en ${a.moneda}`;
    case "retirada":
      return `PuntoCash retiró la tarifa de giros en ${a.moneda}`;
  }
}

/** Qué significa para las sedes, y desde cuándo. */
export function detalleDeAviso(a: Pick<AvisoAgrupado, "tipo" | "moneda" | "sedes" | "at">): string {
  const donde = enumerar(a.sedes.map((s) => s.name));
  const puede = a.sedes.length === 1 ? "puede" : "pueden";
  const desde = `Desde el ${fechaYHora(a.at)}`;
  switch (a.tipo) {
    case "definida":
      return `${desde}, ${donde} ya ${puede} enviar giros en ${a.moneda}.`;
    case "cambiada":
      return `${desde}, los giros en ${a.moneda} que se envían en ${donde} pagan la tarifa nueva. Los ya enviados no cambian.`;
    case "retirada":
      return `${desde}, ${donde} ya no ${puede} enviar giros en ${a.moneda}, hasta que PuntoCash la defina de nuevo.`;
  }
}

/** Los avisos, con sus textos ya escritos, para la pantalla. */
export function avisosMostrados(sedes: readonly Sede[]): readonly AvisoMostrado[] {
  return avisosAgrupados(sedes).map((a) => ({
    moneda: a.moneda,
    sedeIds: a.sedes.map((s) => s.id),
    titulo: tituloDeAviso(a),
    detalle: detalleDeAviso(a),
    antes: a.tipo === "cambiada" && a.anterior ? `${resumenDeTarifa(a.anterior, importe)} (${a.moneda})` : null,
  }));
}
