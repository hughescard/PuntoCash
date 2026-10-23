import * as React from "react";

import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatSignedAmount } from "@/lib/format";
import type { EstadoJornada, Jornada } from "@/features/network/jornadas";

/**
 * Formatos de Jornadas. Las horas son las de **Cuba**, sea cual sea la zona
 * del equipo desde el que se mira: una apertura a las 8:30 en la sucursal se
 * lee 8:30 también desde fuera.
 */

const ZONA = "America/Havana";

export function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function hora(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

export function fechaYHora(iso: string): string {
  return `${fechaCorta(iso)} · ${hora(iso)}`;
}

/** «AAAA-MM-DD» de un instante, en Cuba. */
export function diaEnCuba(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/**
 * **FR-AD-JOR-14**: un cierre forzado no se confunde con el cierre que
 * hace el trabajador, en ningún listado ni detalle.
 */
export function EstadoBadge({ estado }: { estado: EstadoJornada }): React.JSX.Element {
  if (estado === "abierta") return <Badge variant="info">Abierta</Badge>;
  if (estado === "forzada") return <Badge variant="warning">Cierre forzado</Badge>;
  return <Badge variant="neutral">Cerrada</Badge>;
}

/**
 * **FR-AD-JOR-3**: la diferencia con el mismo tratamiento que en Worker —
 * signo, color y palabra—, y por moneda.
 */
export function Diferencia({ currency, diferencia }: { currency: string; diferencia: number }): React.JSX.Element {
  const palabra = diferencia === 0 ? "Cuadrada" : diferencia < 0 ? "Faltante" : "Sobrante";
  return (
    <span
      className={cn(
        "pc-numeric font-semibold",
        diferencia === 0 ? "text-text-primary" : diferencia > 0 ? "text-success-foreground" : "text-error-foreground",
      )}
    >
      {diferencia === 0 ? palabra : `${palabra} ${formatSignedAmount(diferencia)} ${currency}`}
    </span>
  );
}

/**
 * **FR-AD-JOR-19**: una diferencia de apertura se nombra por su motivo. Una
 * reposición o un retiro de fondos no son un descuadre —alguien metió o sacó
 * dinero y lo dijo—, así que no llevan el rojo ni el verde del cierre; un
 * faltante o un sobrante, sí.
 */
export function DiferenciaDeApertura({
  currency,
  diferencia,
  motivo,
}: {
  currency: string;
  diferencia: number;
  motivo?: string;
}): React.JSX.Element {
  const palabra =
    motivo === "Reposición de fondos"
      ? "Reposición"
      : motivo === "Retiro de fondos"
        ? "Retiro"
        : motivo === "Faltante detectado"
          ? "Faltante"
          : motivo === "Sobrante detectado"
            ? "Sobrante"
            : "Diferencia";
  const descuadre = palabra === "Faltante" || palabra === "Sobrante" || palabra === "Diferencia";
  return (
    <span
      className={cn(
        "pc-numeric font-semibold",
        !descuadre ? "text-text-primary" : diferencia > 0 ? "text-success-foreground" : "text-error-foreground",
      )}
    >
      {`${palabra} ${formatSignedAmount(diferencia)} ${currency}`}
    </span>
  );
}

/** «desde las 08:49», o «desde el 18 oct 2026 · 08:35» si no es de hoy. */
export function desde(iso: string, hoy: string): string {
  return diaEnCuba(iso) === hoy ? `desde las ${hora(iso)}` : `desde el ${fechaYHora(iso)}`;
}

/** La jornada abierta de una caja, como la muestran Cajas y Equipos (**FR-AD-CAJA-1**, **FR-AD-EQ-5**). */
export interface JornadaDeCaja {
  id: string;
  trabajador: string;
  /** «desde las 08:49», ya formateado por el servidor. */
  desde: string;
  /** El trabajador tiene ahora la caja abierta en su equipo. */
  enSesion: boolean;
}

export function jornadaDeCaja(j: Jornada | null, hoy: string): JornadaDeCaja | null {
  return j ? { id: j.id, trabajador: j.workerName, desde: desde(j.openedAt, hoy), enSesion: j.sesionActiva } : null;
}

/**
 * Cómo se nombra una jornada en toda la consola: su caja, su trabajador y el
 * día en que se abrió, que es lo que la identifica — «Caja 01 · Lidia Gómez ·
 * 20 oct 2026».
 */
export function nombreDeJornada(j: { cajaNombre: string; workerName: string; openedAt: string }): string {
  return `${j.cajaNombre} · ${j.workerName} · ${fechaCorta(j.openedAt)}`;
}
