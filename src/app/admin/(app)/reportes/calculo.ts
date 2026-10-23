import type { AdminSession } from "@/features/admin/session";
import { sedesVisibles } from "@/features/admin/session";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { hoyEnCuba, sumarDias } from "@/features/network/promotions";
import {
  ORDEN_DE_LINEAS,
  lineaDeServicio,
  ordenarMonedas,
  volumenDeOperacion,
  type Volumen,
} from "@/features/network/volumen";
import type { OperacionDeRed } from "@/features/network/operaciones";
import type { NetworkWorker } from "@/features/network/workers";
import type { Sede } from "@/features/network/sedes";
import { diaEnCuba } from "../jornadas/formato";

/**
 * El cálculo de un reporte — **FR-AD-REP-1** a **FR-AD-REP-12**.
 *
 * Una sola función para la pantalla y para la exportación: el archivo que se
 * descarga tiene que decir exactamente lo mismo que la pantalla desde la que
 * se pidió, y la única forma de garantizarlo es que salgan del mismo cálculo.
 * Calcula los cuatro cortes a la vez; la pantalla enseña uno y el archivo
 * lleva todos.
 */

export type Corte = "sede" | "servicio" | "trabajador" | "dia";
export const CORTES_VALIDOS: readonly Corte[] = ["sede", "servicio", "trabajador", "dia"];

export interface FilaReporte {
  key: string;
  titulo: string;
  subtitulo?: string | undefined;
  href?: string;
  operaciones: number;
  volumen: Record<string, number>;
}

export interface DivisaDeCambio {
  currency: string;
  comprado: number;
  vendido: number;
  operaciones: number;
}

export interface Reporte {
  corte: Corte;
  hoy: string;
  desde: string;
  hasta: string;
  /** Si el periodo pedido pasaba de un año y se recortó. */
  recortado: boolean;
  sedes: readonly Sede[];
  varias: boolean;
  trabajadores: readonly { w: NetworkWorker; sede: Sede }[];
  trabajador: NetworkWorker | null;
  monedas: string[];
  total: { operaciones: number; volumen: Record<string, number> };
  cortes: Record<Corte, FilaReporte[]>;
  divisas: DivisaDeCambio[];
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Una fecha del calendario que existe: «2026-13-45» tiene la forma pero no lo es. */
function fechaValida(d: string | undefined): d is string {
  if (!d || !FECHA.test(d)) return false;
  const t = new Date(`${d}T12:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
}

export function calcularReporte(
  session: AdminSession,
  params: { corte?: string | undefined; desde?: string | undefined; hasta?: string | undefined; trabajador?: string | undefined },
  now = new Date(),
): Reporte {
  const corte: Corte = (CORTES_VALIDOS as readonly string[]).includes(params.corte ?? "") ? (params.corte as Corte) : "sede";
  const hoy = hoyEnCuba(now);
  let desde = fechaValida(params.desde) ? params.desde : sumarDias(hoy, -6);
  let hasta = fechaValida(params.hasta) ? params.hasta : hoy;
  if (desde > hasta) [desde, hasta] = [hasta, desde];
  /* Un año como mucho —365 días, los dos extremos incluidos—: más allá, el
     corte por día deja de leerse. */
  const recortado = desde < sumarDias(hasta, -364);
  if (recortado) desde = sumarDias(hasta, -364);

  const sedes = sedesVisibles(session);
  const red = redEnAlcance(session.scope);
  const varias = sedes.length > 1;

  /* Los trabajadores que se pueden elegir: los de las sedes a la vista. Un
     identificador que no está entre ellos se ignora, igual que una sede ajena. */
  const trabajadores = sedes
    .flatMap((sede) => red.trabajadores(sede.id).map((w) => ({ w, sede })))
    .sort((a, b) => a.w.fullName.localeCompare(b.w.fullName, "es"));
  /* Agrupando por trabajador no hay filtro de trabajador: la tabla ya los
     compara a todos, y con uno elegido se quedaría en una sola fila. */
  const trabajador =
    corte === "trabajador" ? null : (trabajadores.find(({ w }) => w.id === params.trabajador)?.w ?? null);

  /* Las operaciones que cuentan: completadas, en el rango y, si se eligió, de ese trabajador. */
  const contadas: { o: OperacionDeRed; v: Volumen; dia: string; sedeId: string }[] = [];
  for (const sede of sedes) {
    for (const o of red.operaciones(sede.id)) {
      const dia = diaEnCuba(o.fechaHora);
      if (dia < desde || dia > hasta) continue;
      if (trabajador && o.workerId !== trabajador.id) continue;
      const v = volumenDeOperacion(o);
      if (v) contadas.push({ o, v, dia, sedeId: sede.id });
    }
  }

  const monedas = ordenarMonedas(contadas.map((c) => c.v.currency));
  const total = acumular(contadas.map((c) => c.v));

  /* ── Por sede: todas las sedes a la vista, también la que no operó. ── */
  const porSede: FilaReporte[] = sedes.map((sede) => ({
    key: sede.id,
    titulo: sede.name,
    subtitulo: sede.code,
    href: `/admin/sedes/${sede.id}`,
    ...acumular(contadas.filter((c) => c.sedeId === sede.id).map((c) => c.v)),
  }));

  /* ── Por servicio: una línea por servicio y sentido. ── */
  const lineas = new Map<string, Volumen[]>();
  for (const c of contadas) {
    const linea = lineaDeServicio(c.v);
    lineas.set(linea, [...(lineas.get(linea) ?? []), c.v]);
  }
  const orden = (l: string) => {
    const i = (ORDEN_DE_LINEAS as readonly string[]).indexOf(l);
    return i === -1 ? ORDEN_DE_LINEAS.length : i;
  };
  const porServicio: FilaReporte[] = [...lineas.keys()]
    .sort((a, b) => orden(a) - orden(b) || a.localeCompare(b, "es"))
    .map((linea) => ({ key: linea, titulo: linea, ...acumular(lineas.get(linea)!) }));

  /* ── Por trabajador: los activos aunque no operaran; los desactivados, solo si operaron. ── */
  const porTrabajador: FilaReporte[] = trabajadores
    .filter(({ w }) => !trabajador || w.id === trabajador.id)
    .map(({ w, sede }) => ({
      w,
      fila: {
        key: w.id,
        titulo: w.fullName,
        subtitulo: varias ? sede.name : undefined,
        href: `/admin/trabajadores/${w.id}`,
        ...acumular(contadas.filter((c) => c.o.workerId === w.id).map((c) => c.v)),
      },
    }))
    .filter(({ w, fila }) => w.status === "activo" || fila.operaciones > 0)
    .map(({ fila }) => fila);

  /* ── Por día: todos los días del periodo, también los vacíos. ── */
  const porDia: FilaReporte[] = [];
  for (let dia = desde; dia <= hasta; dia = sumarDias(dia, 1)) {
    porDia.push({ key: dia, titulo: diaLargo(dia), ...acumular(contadas.filter((c) => c.dia === dia).map((c) => c.v)) });
  }

  /* ── El cambio por divisa: comprado, vendido y la posición neta. ── */
  const deCambio = contadas.filter((c) => c.v.sentido === "compra" || c.v.sentido === "venta");
  const divisas = ordenarMonedas(deCambio.map((c) => c.v.currency)).map((currency) => {
    const de = deCambio.filter((c) => c.v.currency === currency);
    return {
      currency,
      comprado: de.filter((c) => c.v.sentido === "compra").reduce((s, c) => s + c.v.amount, 0),
      vendido: de.filter((c) => c.v.sentido === "venta").reduce((s, c) => s + c.v.amount, 0),
      operaciones: de.length,
    };
  });

  return {
    corte,
    hoy,
    desde,
    hasta,
    recortado,
    sedes,
    varias,
    trabajadores,
    trabajador,
    monedas,
    total,
    cortes: { sede: porSede, servicio: porServicio, trabajador: porTrabajador, dia: porDia },
    divisas,
  };
}

function acumular(vs: readonly Volumen[]): { operaciones: number; volumen: Record<string, number> } {
  const volumen: Record<string, number> = {};
  for (const v of vs) volumen[v.currency] = (volumen[v.currency] ?? 0) + v.amount;
  return { operaciones: vs.length, volumen };
}

const DIA_LARGO = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** «lun 19 oct 2026», a partir de un día del calendario de Cuba. */
export function diaLargo(dia: string): string {
  return DIA_LARGO.format(new Date(`${dia}T12:00:00Z`)).replaceAll(".", "").replace(",", "");
}

/** «19 oct 2026», para el periodo en una línea. */
export function diaCorto(dia: string): string {
  return diaLargo(dia).split(" ").slice(1).join(" ");
}

/** Cómo se titula cada corte, en la pantalla y en el archivo. */
export const NOMBRE_DE_CORTE: Readonly<Record<Corte, string>> = {
  sede: "Por sede",
  servicio: "Por servicio",
  trabajador: "Por trabajador",
  dia: "Por día",
};

/** La primera columna de cada corte. */
export const PRIMERA_COLUMNA: Readonly<Record<Corte, string>> = {
  sede: "Sede",
  servicio: "Servicio",
  trabajador: "Trabajador",
  dia: "Día",
};
