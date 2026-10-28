/**
 * El panorama de la red: lo que cuenta y señala el Inicio de Super administración.
 *
 * PuntoCash da de alta a los operadores, les entrega las sedes y, desde ese
 * momento, **registra lo que pasa en ellas** para poder conciliar y responder
 * en una auditoría: qué sedes operan, cuántas operaciones hace cada una, cuándo
 * fue la última y quién la hizo.
 *
 * Lo que pasa **dentro** de una sede —cajas sin montar, equipos sin vincular,
 * solicitudes sin resolver— es la gestión del operador y no aparece aquí.
 *
 * Lo único que el Inicio señala son los asuntos que **solo PuntoCash** puede
 * resolver, y todos tienen que ver con entregar la red y fijar sus límites:
 * una sede sin operador, un operador al que no se le ha entregado ninguna sede
 * y una moneda que las sedes tienen y nadie puede cotizar porque falta su rango.
 * Las suspensiones no están: son un estado, no algo pendiente, y se ven en la
 * tabla.
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
import { diaEnCuba } from "@/features/network/jornadas";

/* -------------------------------------------------------------------------
 * Lo que solo resuelve PuntoCash
 * ---------------------------------------------------------------------- */

export type PendienteDePuntoCash =
  | { kind: "sede-sin-asignar"; sede: Sede; desde: string }
  | { kind: "operador-sin-sedes"; operador: Operator }
  | { kind: "moneda-sin-rango"; code: string; nombre: string; sedes: readonly Sede[] };

/* -------------------------------------------------------------------------
 * La actividad de cada sede
 * ---------------------------------------------------------------------- */

export interface UltimaOperacion {
  fechaHora: string;
  trabajador: string;
  servicio: string;
}

export interface FilaDeRed {
  sede: Sede;
  estado: EstadoDeSede;
  operador: Operator | null;
  /** Mismo recuento que el Inicio de Admin de sede, para que las dos consolas digan lo mismo. */
  operacionesHoy: number;
  /** Personas distintas que han registrado alguna operación hoy en la sede. */
  trabajadoresHoy: number;
  ultimaOperacion: UltimaOperacion | null;
}

export interface PanoramaDeRed {
  metricas: {
    /** Sedes activas que han registrado al menos una operación hoy. */
    sedesConActividad: number;
    sedesActivas: number;
    operacionesHoy: number;
    trabajadoresHoy: number;
  };
  /** La forma de la red: sedes no cerradas por estado, y operadores activos. */
  red: {
    sedes: number;
    porEstado: Readonly<Record<Exclude<EstadoDeSede, "cerrada">, number>>;
    operadoresActivos: number;
  };
  pendientes: readonly PendienteDePuntoCash[];
  filas: readonly FilaDeRed[];
}

export function panoramaDeRed(ahora: Date = new Date()): PanoramaDeRed {
  const red = redEnAlcance(GLOBAL_SCOPE);
  const hoy = diaEnCuba(ahora);
  const vivas = SEDES.filter((s) => s.status !== "cerrada");

  /* ---- Pendiente de PuntoCash: entregar la red y fijar sus límites */
  const pendientes: PendienteDePuntoCash[] = [];
  for (const sede of vivas) {
    if (estadoDeSede(sede) === "sin-asignar") {
      pendientes.push({ kind: "sede-sin-asignar", sede, desde: ultimoFinDeTramo(sede) ?? sede.createdAt });
    }
  }
  for (const operador of OPERATORS) {
    if (operador.status === "activo" && sedesDeOperador(operador.id).length === 0) {
      pendientes.push({ kind: "operador-sin-sedes", operador });
    }
  }
  for (const m of CATALOGO_MONEDAS) {
    if (m.code === MONEDA_LOCAL || rangoDe(m.code)) continue;
    const sedes = vivas.filter(
      (s) =>
        estadoDeSede(s) !== "sin-asignar" &&
        s.services.includes("cambio-moneda") &&
        monedasDeSede(s.id).some((x) => x.code === m.code),
    );
    if (sedes.length > 0) pendientes.push({ kind: "moneda-sin-rango", code: m.code, nombre: m.name, sedes });
  }

  /* ---- Actividad por sede */
  const trabajadoresDeHoy = new Set<string>();
  const filas: FilaDeRed[] = vivas.map((sede) => {
    const opId = asignacionVigente(sede.id)?.operatorId;
    const operaciones = red.operaciones(sede.id);
    const trabajadores = new Set(operaciones.filter((o) => diaEnCuba(o.fechaHora) === hoy).map((o) => o.workerId));
    for (const w of trabajadores) trabajadoresDeHoy.add(w);

    const ultima = operaciones.reduce<(typeof operaciones)[number] | null>(
      (max, o) => (max === null || o.fechaHora > max.fechaHora ? o : max),
      null,
    );

    return {
      sede,
      estado: estadoDeSede(sede),
      operador: OPERATORS.find((o) => o.id === opId) ?? null,
      operacionesHoy: red.diaDeSede(sede.id)?.operacionesHoy ?? 0,
      trabajadoresHoy: trabajadores.size,
      ultimaOperacion: ultima
        ? { fechaHora: ultima.fechaHora, trabajador: ultima.worker, servicio: ultima.servicio }
        : null,
    };
  });

  const activas = filas.filter((f) => f.estado === "activa");
  const cuenta = (e: EstadoDeSede) => filas.filter((f) => f.estado === e).length;

  return {
    metricas: {
      sedesConActividad: activas.filter((f) => f.operacionesHoy > 0).length,
      sedesActivas: activas.length,
      operacionesHoy: filas.reduce((n, f) => n + f.operacionesHoy, 0),
      trabajadoresHoy: trabajadoresDeHoy.size,
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
    pendientes,
    filas,
  };
}

/** Desde cuándo está sin operador: el fin de su último tramo, si lo tuvo. */
function ultimoFinDeTramo(sede: Sede): string | null {
  const ultimo = historialDeSede(sede.id).at(-1);
  return ultimo?.endedAt ?? null;
}
