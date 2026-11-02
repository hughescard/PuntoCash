/**
 * LAS PROMOCIONES desde la consola de PuntoCash.
 *
 * PuntoCash **gestiona** las de red y **ve** las de los operadores: no las
 * toca, pero cuenta con ellas, porque lo que un cliente ve en una sala es la
 * suma de las dos (**FR-SA-PROM-5**). Esta lectura reúne lo que las pantallas
 * necesitan para eso, sin repetir en cada una cómo se decide qué se exhibe
 * dónde.
 */

import { operadorVigente } from "@/features/network/assignments";
import { OPERATORS } from "@/features/network/operators";
import {
  estadoDe,
  hoyEnCuba,
  MAX_EN_ROTACION,
  seExhibeEn,
  todasLasPromociones,
  type Promocion,
} from "@/features/network/promotions";
import { SEDES } from "@/features/network/sedes";
import { composicionDe } from "@/features/network/promotion-coincidence";
import { provinciaDeLocalidad } from "@/features/geography/provincias-de-cuba";

const PUNTOCASH = "PuntoCash";

/** Las sedes que pueden recibir una promoción: las cerradas no admiten ninguna. */
function sedesAbiertas() {
  return SEDES.filter((s) => s.status !== "cerrada");
}

/** El nombre público de una sede, o su id si ya no existe. */
export function nombreDeSede(id: string): string {
  return SEDES.find((s) => s.id === id)?.name ?? id;
}

/** Las promociones que PuntoCash publica. Las de los operadores no están aquí. */
export function promocionesDeRed(): readonly Promocion[] {
  return todasLasPromociones().filter((p) => p.origen === "red");
}

export interface SedeParaElegir {
  id: string;
  nombre: string;
  provincia: string;
  operadorId: string | null;
  operador: string | null;
  suspendida: boolean;
}

/**
 * Las sedes que el formulario ofrece marcar, con su provincia y su operador
 * de hoy para que los atajos y la lista digan lo mismo.
 */
export function sedesParaElegir(): readonly SedeParaElegir[] {
  return sedesAbiertas().map((s) => {
    const operadorId = operadorVigente(s.id);
    return {
      id: s.id,
      nombre: s.name,
      provincia: provinciaDeLocalidad(s.locality),
      operadorId,
      operador: operadorId ? (OPERATORS.find((o) => o.id === operadorId)?.name ?? null) : null,
      suspendida: s.status === "suspendida",
    };
  });
}

export interface OtraPromocion {
  id: string;
  /** Las sedes donde de verdad se exhibiría: «toda la red» ya resuelta, y sin las cerradas. */
  sedes: readonly string[];
  desde: string;
  hasta: string;
  /** Quién la publica: «PuntoCash» o el nombre del operador. */
  de: string;
  deRed: boolean;
}

/**
 * Las promociones que cuentan para la saturación: las no vencidas, de red o de
 * operador, resueltas a las sedes donde se exhibirían. `exceptoId` deja fuera
 * la que se está editando.
 */
export function promocionesQueCuentan(exceptoId?: string): readonly OtraPromocion[] {
  const hoy = hoyEnCuba();
  const abiertas = sedesAbiertas();
  return todasLasPromociones()
    .filter((p) => p.id !== exceptoId && estadoDe(p, hoy) !== "vencida")
    .map((p) => ({
      id: p.id,
      sedes: abiertas.filter((s) => seExhibeEn(p, s.id)).map((s) => s.id),
      desde: p.desde,
      hasta: p.hasta,
      de: p.origen === "red" ? PUNTOCASH : (OPERATORS.find((o) => o.id === p.operatorId)?.name ?? "Un operador"),
      deRed: p.origen === "red",
    }))
    .filter((p) => p.sedes.length > 0);
}

export interface SedeSaturada {
  id: string;
  nombre: string;
  total: number;
  composicion: string;
}

/** Las sedes que hoy tienen más de {@link MAX_EN_ROTACION} promociones a la vez (**FR-SA-PROM-5**). */
export function sedesSaturadasHoy(): readonly SedeSaturada[] {
  const hoy = hoyEnCuba();
  const vigentes = promocionesQueCuentan().filter((p) => p.desde <= hoy && hoy <= p.hasta);
  return sedesAbiertas()
    .map((s) => {
      const aqui = vigentes.filter((p) => p.sedes.includes(s.id));
      return { id: s.id, nombre: s.name, total: aqui.length, composicion: composicionDe(aqui) };
    })
    .filter((s) => s.total > MAX_EN_ROTACION);
}

/** Dónde llega una promoción, con los nombres: «Toda la red» o las sedes. */
export function sedesDePromocion(p: Promocion): string {
  return p.sedes === "red" ? "Toda la red" : p.sedes.map(nombreDeSede).join(", ");
}

/**
 * Dónde llega, para una lista: «Toda la red», o las sedes sin repetir la
 * marca en cada una —«Santiago, Holguín, Camagüey»—, porque en una tabla
 * estrecha «PuntoCash» tres veces es lo que se lleva el sitio de los nombres.
 * Con una sola sede se dice entera.
 */
export function sedesParaLista(p: Promocion): string {
  if (p.sedes === "red") return "Toda la red";
  const nombres = p.sedes.map(nombreDeSede);
  const MARCA = `${PUNTOCASH} `;
  if (nombres.length > 1 && nombres.every((n) => n.startsWith(MARCA))) {
    return nombres.map((n) => n.slice(MARCA.length)).join(", ");
  }
  return nombres.join(", ");
}

/** Dónde llega, en pocas palabras: «Toda la red», «1 sede», «3 sedes». */
export function resumenDeSedes(p: Promocion): string {
  if (p.sedes === "red") return "Toda la red";
  return `${p.sedes.length} ${p.sedes.length === 1 ? "sede" : "sedes"}`;
}

/** Quién publica una promoción, por su nombre: «PuntoCash» o el operador. */
export function quienPublica(p: Promocion): { texto: string; operatorId: string | null } {
  if (p.origen === "red") return { texto: PUNTOCASH, operatorId: null };
  return { texto: OPERATORS.find((o) => o.id === p.operatorId)?.name ?? "Un operador", operatorId: p.operatorId ?? null };
}
