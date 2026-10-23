import * as React from "react";

import { Badge } from "@/components/ui";
import type { EstadoSolicitud } from "@/features/network/aprobaciones";

/** «hace 25 min», «hace 5 h», «hace 3 días»: lo que vuelve urgente una pendiente (**FR-AD-APR-3**). */
export function antiguedad(iso: string, ahora: Date): string {
  const min = Math.max(0, Math.floor((ahora.getTime() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}

export function EstadoSolicitudBadge({ estado }: { estado: EstadoSolicitud }): React.JSX.Element {
  if (estado === "pendiente") return <Badge variant="warning">Pendiente</Badge>;
  if (estado === "aprobada") return <Badge variant="success">Aprobada</Badge>;
  return <Badge variant="error">Rechazada</Badge>;
}
