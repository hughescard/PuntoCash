import * as React from "react";

import { Badge } from "@/components/ui";
import type { EstadoDeSede } from "@/features/network/assignments";

/**
 * El estado de una sede en esta consola. «Sin asignar» se distingue de
 * «Suspendida»: lo primero es un hecho —no tiene operador—, lo segundo una
 * decisión de PuntoCash con motivo (decisión del 27/10/2026).
 */
export function EstadoDeSedeBadge({ estado }: { estado: EstadoDeSede }): React.JSX.Element {
  if (estado === "activa") return <Badge variant="success">Activa</Badge>;
  if (estado === "sin-asignar") return <Badge variant="info">Sin asignar</Badge>;
  if (estado === "suspendida") return <Badge variant="warning">Suspendida</Badge>;
  if (estado === "operador-suspendido") return <Badge variant="warning">Operador suspendido</Badge>;
  return <Badge variant="neutral">Cerrada</Badge>;
}

export const ETIQUETA_DE_ESTADO: Readonly<Record<EstadoDeSede, string>> = {
  "sin-asignar": "Sin asignar",
  activa: "Activa",
  suspendida: "Suspendida",
  "operador-suspendido": "Operador suspendido",
  cerrada: "Cerrada",
};
