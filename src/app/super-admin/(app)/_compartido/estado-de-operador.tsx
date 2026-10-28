import * as React from "react";

import { Badge } from "@/components/ui";
import type { OperatorStatus } from "@/features/network/operators";

export const ETIQUETA_DE_OPERADOR: Readonly<Record<OperatorStatus, string>> = {
  activo: "Activo",
  suspendido: "Suspendido",
  baja: "Dado de baja",
};

export function EstadoDeOperadorBadge({ estado }: { estado: OperatorStatus }): React.JSX.Element {
  if (estado === "activo") return <Badge variant="success">Activo</Badge>;
  if (estado === "suspendido") return <Badge variant="warning">Suspendido</Badge>;
  return <Badge variant="neutral">Dado de baja</Badge>;
}
