/**
 * El panorama de la red — lo que el Inicio de PuntoCash cuenta y señala.
 *
 * Vive aquí, y no en la pantalla, porque lo leen dos sitios (Inicio y la tabla
 * de estado de la red) y porque separa dos cosas que el producto no debe
 * mezclar:
 *
 *   · **Decisiones de PuntoCash**: lo que solo PuntoCash puede resolver —una
 *     sede sin operador, una moneda que las sedes tienen y nadie puede cotizar
 *     porque no tiene rango, una suspensión que sigue en pie—.
 *   · **Lo que resuelve cada operador**: lo que pasa dentro de una sede.
 *     PuntoCash lo ve y no lo toca [A14]; lo que puede hacer es saber a quién
 *     pedírselo. Por eso se agrupa por operador: una llamada a un mercante
 *     cubre todo lo suyo.
 */

import { GLOBAL_SCOPE } from "@/features/network/scope";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { SEDES, type Sede } from "@/features/network/sedes";
import { OPERATORS, type Operator } from "@/features/network/operators";
import {
  asignacionVigente,
  estadoDeSede,
  historialDeSede,
  sedesDeOperador,
  type EstadoDeSede,
} from "@/features/network/assignments";
import { CATALOGO_MONEDAS, monedasDeSede } from "@/features/network/currencies";
import { MONEDA_LOCAL, rangoDe } from "@/features/network/rates";
import { enHorario } from "@/features/network/horario";
import { diaEnCuba, type DiaDeSede, type Jornada } from "@/features/network/jornadas";
import type { Solicitud } from "@/features/network/aprobaciones";

/** Días que una sede puede llevar asignada sin ninguna caja antes de que sea un aviso. */
export const DIAS_SIN_MONTAR = 7;
/** Horas que una solicitud puede esperar antes de que PuntoCash la vea como atascada. */
export const HORAS_SOLICITUD_ATASCADA = 24;

const DIA_MS = 24 * 60 * 60 * 1000;

/* -------------------------------------------------------------------------
 * Lo que solo resuelve PuntoCash
 * ---------------------------------------------------------------------- */

export type DecisionDePuntoCash =
  | { kind: "sede-sin-asignar"; sede: Sede; desde: string }
  | { kind: "moneda-sin-rango"; code: string; nombre: string; sedes: readonly Sede[] }
  | { kind: "sede-suspendida"; sede: Sede; operador: Operator | null }
  | { kind: "operador-suspendido"; operador: Operator; sedes: number }
  | { kind: "operador-sin-sedes"; operador: Operator };

/* -------------------------------------------------------------------------
 * Lo que resuelve cada operador
 * ---------------------------------------------------------------------- */

export type AvisoDeSede =
  | { kind: "sin-cajas"; sede: Sede; dias: number }
  | { kind: "cajas-sin-equipo"; sede: Sede; cajas: number }
  | { kind: "sin-abrir-en-horario"; sede: Sede }
  | { kind: "abierta-de-dia-anterior"; sede: Sede; jornada: Jornada }
  | { kind: "solicitudes-atascadas"; sede: Sede; solicitudes: readonly Solicitud[] }
  | { kind: "tasa-ajustada"; sede: Sede; code: string; at: string }
  | { kind: "cambio-sin-tasas"; sede: Sede }
  | { kind: "sin-monedas"; sede: Sede };

export interface AvisosDeOperador {
  operador: Operator;
  /** Sus sedes con algo que atender, cada una con sus avisos. */
  sedes: readonly { sede: Sede; avisos: readonly AvisoDeSede[] }[];
  total: number;
}

export interface FilaDeRed {
  sede: Sede;
  estado: EstadoDeSede;
  operador: Operator | null;
  cajas: number;
  sinEquipo: number;
  kioscos: number;
  trabajadores: number;
  dia: DiaDeSede;
  avisos: number;
}

export interface PanoramaDeRed {
  /**
   * Lo que pasa **hoy**, como en el Inicio de Admin de sede: las cifras que
   * cambian a lo largo del día. El tamaño de la red —cuántas sedes hay y en
   * qué estado, cuántos operadores— no cambia de una hora a otra y va en la
   * línea de cabecera, no en tarjetas.
   */
  metricas: {
    sedesOperando: number;
    sedesActivas: number;
    cajasAbiertas: number;
    cajasActivas: number;
    enTurno: number;
    operacionesHoy: number;
  };
  /** La forma de la red: sedes no cerradas por estado, y operadores activos. */
  red: {
    sedes: number;
    porEstado: Readonly<Record<Exclude<EstadoDeSede, "cerrada">, number>>;
    operadoresActivos: number;
  };
  decisiones: readonly DecisionDePuntoCash[];
  porOperador: readonly AvisosDeOperador[];
  filas: readonly FilaDeRed[];
}

const DIA_VACIO: DiaDeSede = { cajas: [], abiertas: 0, enTurno: [], primeraApertura: null, operacionesHoy: 0 };

export function panoramaDeRed(ahora: Date = new Date()): PanoramaDeRed {
  const red = redEnAlcance(GLOBAL_SCOPE);
  const hoy = diaEnCuba(ahora);
  const vivas = SEDES.filter((s) => s.status !== "cerrada");

  /* ---- Avisos dentro de cada sede (solo las que tienen quien las resuelva) */
  const avisosDe = (sede: Sede): AvisoDeSede[] => {
    /* Solo las sedes con alguien que pueda resolver: sin operador, o con la
       sede o su operador suspendidos, lo que cuenta es la decisión de
       PuntoCash, que ya está arriba. */
    if (estadoDeSede(sede) !== "activa") return [];
    const tramo = asignacionVigente(sede.id);
    if (!tramo) return [];
    const avisos: AvisoDeSede[] = [];
    const cajas = red.cajasActivas(sede.id);
    const dia = red.diaDeSede(sede.id) ?? DIA_VACIO;

    if (cajas.length === 0) {
      const dias = Math.floor((ahora.getTime() - new Date(tramo.startedAt).getTime()) / DIA_MS);
      if (dias > DIAS_SIN_MONTAR) avisos.push({ kind: "sin-cajas", sede, dias });
    }
    const sinEquipo = cajas.filter((c) => !red.cajaTieneEquipo(c.id)).length;
    if (sinEquipo > 0) avisos.push({ kind: "cajas-sin-equipo", sede, cajas: sinEquipo });

    /* Solo la caja que sigue abierta de un día anterior. Una abierta a deshora
       el mismo día es asunto del administrador y de la próxima hora; la que
       pasó la noche abierta ya es un efectivo sin conciliar. */
    for (const c of dia.cajas) {
      if (c.abierta && diaEnCuba(c.abierta.openedAt) < hoy) {
        avisos.push({ kind: "abierta-de-dia-anterior", sede, jornada: c.abierta });
      }
    }
    if (cajas.length - sinEquipo > 0 && dia.abiertas === 0 && enHorario(sede.horario, ahora)) {
      avisos.push({ kind: "sin-abrir-en-horario", sede });
    }

    const atascadas = red
      .solicitudes(sede.id)
      .filter((x) => x.estado === "pendiente" && ahora.getTime() - new Date(x.fechaHora).getTime() > HORAS_SOLICITUD_ATASCADA * 3600 * 1000)
      .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
    if (atascadas.length > 0) avisos.push({ kind: "solicitudes-atascadas", sede, solicitudes: atascadas });

    for (const t of red.tasas(sede.id)) {
      if (t.fijadaAlLimite) avisos.push({ kind: "tasa-ajustada", sede, code: t.code, at: t.fijadaAlLimite.at });
    }
    const monedas = red.monedas(sede.id);
    if (monedas.length === 0) avisos.push({ kind: "sin-monedas", sede });
    else if (sede.services.includes("cambio-moneda") && red.tasas(sede.id).length === 0) {
      avisos.push({ kind: "cambio-sin-tasas", sede });
    }
    return avisos;
  };

  const avisosPorSede = new Map(vivas.map((s) => [s.id, avisosDe(s)]));

  const porOperador: AvisosDeOperador[] = OPERATORS.filter((o) => o.status === "activo")
    .map((operador) => {
      const sedes = sedesDeOperador(operador.id)
        .map((id) => vivas.find((s) => s.id === id))
        .filter((s): s is Sede => s !== undefined)
        .map((sede) => ({ sede, avisos: avisosPorSede.get(sede.id) ?? [] }))
        .filter((g) => g.avisos.length > 0)
        .sort((a, b) => a.sede.name.localeCompare(b.sede.name, "es"));
      return { operador, sedes, total: sedes.reduce((n, g) => n + g.avisos.length, 0) };
    })
    .filter((g) => g.total > 0)
    .sort((a, b) => b.total - a.total || a.operador.name.localeCompare(b.operador.name, "es"));

  /* ---- Decisiones de PuntoCash */
  const decisiones: DecisionDePuntoCash[] = [];
  for (const sede of vivas) {
    if (estadoDeSede(sede) === "sin-asignar") {
      decisiones.push({ kind: "sede-sin-asignar", sede, desde: ultimoFinDeTramo(sede) ?? sede.createdAt });
    }
  }
  for (const m of CATALOGO_MONEDAS) {
    if (m.code === MONEDA_LOCAL || rangoDe(m.code)) continue;
    const sedes = vivas.filter((s) => estadoDeSede(s) !== "sin-asignar" && monedasDeSede(s.id).some((x) => x.code === m.code) && s.services.includes("cambio-moneda"));
    if (sedes.length > 0) decisiones.push({ kind: "moneda-sin-rango", code: m.code, nombre: m.name, sedes });
  }
  for (const sede of vivas) {
    if (sede.status === "suspendida") {
      const op = asignacionVigente(sede.id)?.operatorId;
      decisiones.push({ kind: "sede-suspendida", sede, operador: OPERATORS.find((o) => o.id === op) ?? null });
    }
  }
  for (const operador of OPERATORS) {
    if (operador.status === "suspendido") {
      decisiones.push({ kind: "operador-suspendido", operador, sedes: sedesDeOperador(operador.id).length });
    } else if (operador.status === "activo" && sedesDeOperador(operador.id).length === 0) {
      decisiones.push({ kind: "operador-sin-sedes", operador });
    }
  }

  /* ---- Tabla y métricas */
  const filas: FilaDeRed[] = vivas.map((sede) => {
    const cajas = red.cajasActivas(sede.id);
    const opId = asignacionVigente(sede.id)?.operatorId;
    return {
      sede,
      estado: estadoDeSede(sede),
      operador: OPERATORS.find((o) => o.id === opId) ?? null,
      cajas: cajas.length,
      sinEquipo: cajas.filter((c) => !red.cajaTieneEquipo(c.id)).length,
      kioscos: red.kioscos(sede.id).length,
      trabajadores: red.trabajadores(sede.id).filter((w) => w.status === "activo").length,
      dia: red.diaDeSede(sede.id) ?? DIA_VACIO,
      avisos: avisosPorSede.get(sede.id)?.length ?? 0,
    };
  });

  const activas = filas.filter((f) => f.estado === "activa");
  const cuenta = (e: EstadoDeSede) => filas.filter((f) => f.estado === e).length;

  return {
    metricas: {
      sedesOperando: activas.filter((f) => f.dia.abiertas > 0).length,
      sedesActivas: activas.length,
      /* Las cajas abiertas se cuentan en toda sede no cerrada: una caja que
         quedó abierta en una sede suspendida también es efectivo en la calle. */
      cajasAbiertas: filas.reduce((n, f) => n + f.dia.abiertas, 0),
      cajasActivas: filas.reduce((n, f) => n + f.cajas, 0),
      enTurno: filas.reduce((n, f) => n + f.dia.enTurno.length, 0),
      operacionesHoy: filas.reduce((n, f) => n + f.dia.operacionesHoy, 0),
    },
    red: {
      sedes: filas.length,
      porEstado: {
        activa: cuenta("activa"),
        "sin-asignar": cuenta("sin-asignar"),
        suspendida: cuenta("suspendida"),
        "operador-suspendido": cuenta("operador-suspendido"),
      },
      operadoresActivos: OPERATORS.filter((o) => o.status === "activo").length,
    },
    decisiones,
    porOperador,
    filas,
  };
}

/** Desde cuándo está sin operador: el fin de su último tramo, si lo tuvo. */
function ultimoFinDeTramo(sede: Sede): string | null {
  const ultimo = historialDeSede(sede.id).at(-1);
  return ultimo?.endedAt ?? null;
}
