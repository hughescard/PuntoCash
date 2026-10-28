/**
 * LOS TRABAJADORES DE LA RED, vistos por PuntoCash.
 *
 * Enteramente de consulta: PuntoCash no crea, no edita, no desactiva y no
 * reactiva a nadie, ni presta asistencia de acceso. Quien hace todo eso es el
 * administrador de la sede, que es quien conoce a la persona.
 *
 * Lo que esta lectura sí resuelve es **por qué alguien no puede entrar**, que
 * es lo único que PuntoCash necesita decidir sobre un trabajador. Hay tres
 * razones y se arreglan en sitios distintos: lo desactivó su administrador
 * —y entonces PuntoCash no puede hacer nada—, su sede está suspendida, o lo
 * está su operador. Las dos últimas las revierte esta consola.
 */

import { GLOBAL_SCOPE } from "@/features/network/scope";
import { redEnAlcance } from "@/features/network/scoped-reads";
import { SEDES, type Sede } from "@/features/network/sedes";
import { OPERATORS, type Operator } from "@/features/network/operators";
import { asignacionVigente } from "@/features/network/assignments";
import type { NetworkWorker } from "@/features/network/workers";
import type { Jornada } from "@/features/network/jornadas";

/**
 * Por qué no puede entrar, o `null` si puede.
 *
 * El orden importa: si su operador está suspendido da igual el estado de la
 * sede, porque la suspensión del operador alcanza a todas sus sedes.
 */
export type MotivoSinAcceso = "operador-suspendido" | "sede-suspendida" | "sede-cerrada" | "sin-operador" | "desactivado";

export interface TrabajadorDeRed {
  trabajador: NetworkWorker;
  sede: Sede;
  operador: Operator | null;
  /** `null` si puede entrar hoy. */
  bloqueo: MotivoSinAcceso | null;
  ultimaJornada: Jornada | null;
}

export function trabajadoresDeRed(): readonly TrabajadorDeRed[] {
  const red = redEnAlcance(GLOBAL_SCOPE);
  const filas: TrabajadorDeRed[] = [];

  for (const sede of SEDES) {
    const tramo = asignacionVigente(sede.id);
    const operador = tramo ? OPERATORS.find((o) => o.id === tramo.operatorId) ?? null : null;
    for (const trabajador of red.trabajadores(sede.id)) {
      filas.push({
        trabajador,
        sede,
        operador,
        bloqueo: motivoSinAcceso(sede, operador, trabajador),
        ultimaJornada: red.jornadasDeTrabajador(trabajador.id)[0] ?? null,
      });
    }
  }

  filas.sort(
    (a, b) =>
      a.sede.name.localeCompare(b.sede.name, "es") ||
      a.trabajador.fullName.localeCompare(b.trabajador.fullName, "es"),
  );
  return filas;
}

export function trabajadorDeRed(workerId: string): TrabajadorDeRed | null {
  return trabajadoresDeRed().find((f) => f.trabajador.id === workerId) ?? null;
}

function motivoSinAcceso(sede: Sede, operador: Operator | null, trabajador: NetworkWorker): MotivoSinAcceso | null {
  if (sede.status === "cerrada") return "sede-cerrada";
  if (!operador) return "sin-operador";
  if (operador.status !== "activo") return "operador-suspendido";
  if (sede.status === "suspendida") return "sede-suspendida";
  if (trabajador.status !== "activo") return "desactivado";
  return null;
}

/** Las sedes en las que ha abierto alguna jornada, de la más reciente a la más antigua. */
export function sedesDondeHaTrabajado(workerId: string): readonly { sede: Sede; jornadas: number; ultima: string }[] {
  const red = redEnAlcance(GLOBAL_SCOPE);
  const porSede = new Map<string, { jornadas: number; ultima: string }>();
  for (const j of red.jornadasDeTrabajador(workerId)) {
    const previo = porSede.get(j.sedeId);
    porSede.set(j.sedeId, {
      jornadas: (previo?.jornadas ?? 0) + 1,
      ultima: previo && previo.ultima > j.openedAt ? previo.ultima : j.openedAt,
    });
  }
  return [...porSede]
    .map(([sedeId, datos]) => ({ sede: SEDES.find((s) => s.id === sedeId)!, ...datos }))
    .filter((f) => f.sede)
    .sort((a, b) => b.ultima.localeCompare(a.ultima));
}
