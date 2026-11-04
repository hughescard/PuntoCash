import * as React from "react";

import { Badge } from "@/components/ui";
import type { MotivoSinAcceso } from "@/features/super-admin/trabajadores";
import type { WorkerStatus } from "@/features/network/workers";

/**
 * Por qué un trabajador no puede entrar, dicho en una etiqueta.
 *
 * Las tres razones se arreglan en sitios distintos y por eso no comparten
 * etiqueta: si lo desactivó su administrador, PuntoCash no puede hacer nada;
 * si lo que está suspendido es la sede o el operador, lo revierte esta
 * consola.
 */
export const MOTIVO_SIN_ACCESO: Readonly<Record<MotivoSinAcceso, string>> = {
  "operador-suspendido": "Operador suspendido",
  "sede-suspendida": "Sede suspendida",
  "sede-cerrada": "Sede cerrada",
  "sin-operador": "Sede sin operador",
  desactivado: "Desactivado",
};

export const EXPLICACION_SIN_ACCESO: Readonly<Record<MotivoSinAcceso, string>> = {
  "operador-suspendido":
    "Su operador está suspendido por PuntoCash, y la suspensión alcanza a los trabajadores de todas sus sedes. Lo revierte esta consola, desde la ficha del operador.",
  "sede-suspendida":
    "Su sede está suspendida por PuntoCash. Lo revierte esta consola, desde la ficha de la sede.",
  "sede-cerrada": "Su sede está cerrada. El cierre es definitivo y no se revierte.",
  "sin-operador":
    "Su sede no tiene operador asignado, así que nadie la administra. Se resuelve asignándole uno desde su ficha.",
  desactivado:
    "Lo desactivó su administrador. Solo él puede reactivarlo: PuntoCash no gobierna a los trabajadores de una sede.",
};

export function EstadoDeAcceso({
  estado,
  bloqueo,
}: {
  estado: WorkerStatus;
  bloqueo: MotivoSinAcceso | null;
}): React.JSX.Element {
  if (!bloqueo) return <Badge variant="success">Activo</Badge>;
  if (bloqueo === "desactivado") return <Badge variant="neutral">Desactivado</Badge>;
  /* La persona sigue activa para su administrador: lo que la bloquea es una
     decisión de PuntoCash sobre su sede o su operador, y conviene que se lea
     distinto de una baja. */
  return (
    <span className="flex flex-col items-start gap-1">
      <Badge variant="warning">{MOTIVO_SIN_ACCESO[bloqueo]}</Badge>
      {estado !== "activo" ? <span className="text-caption text-text-secondary">y desactivado</span> : null}
    </span>
  );
}
