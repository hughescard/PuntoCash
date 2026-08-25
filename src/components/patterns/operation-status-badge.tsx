import * as React from "react";

import { Badge } from "@/components/ui";

/**
 * Operation status as a compact tag — manual §17 and §18.
 *
 *   · "Estados: usar badges; no colorear filas completas."
 *   · "El fondo debe ser tenue y el texto suficientemente contrastado."
 *
 * Follows the approved wireframe: a small dot plus the label on a soft tint.
 * The dot is reinforcement only — the written label is what carries the state,
 * so meaning never rests on colour (§20). Circled glyphs are reserved for
 * full-width alerts, where there is room for them.
 *
 * Shared across Worker, Admin and Super Admin so a status looks identical
 * wherever it appears.
 */
/**
 * The five states an operation can reach. Two of them — Rechazada and
 * Fallida — are both negative terminal outcomes but are never interchangeable:
 * Rechazada is a business/authorization decision (the operation was not
 * allowed to proceed), Fallida is a technical/processing failure (the
 * operation was attempted and broke). This is the one authoritative status
 * list — filters, badges, mocks and detail views all derive from it rather
 * than keeping their own copy.
 */
export const OPERATION_STATUSES = [
  "Completada",
  "En proceso",
  "Rechazada",
  "Fallida",
  "Cancelada",
] as const;

export type OperationStatus = (typeof OPERATION_STATUSES)[number];

type StatusVariant = "success" | "warning" | "error" | "neutral";

/**
 * "En proceso" is amber, not blue: it is a state to keep an eye on. Rechazada
 * and Fallida deliberately share the same red/error tint — they are both
 * negative terminal outcomes — but their text labels always stay distinct, so
 * meaning never rests on colour alone (§20).
 */
const STATUS_VARIANT = {
  Completada: "success",
  "En proceso": "warning",
  Rechazada: "error",
  Fallida: "error",
  Cancelada: "neutral",
} as const satisfies Record<OperationStatus, StatusVariant>;

export function OperationStatusBadge({
  status,
}: {
  status: OperationStatus;
}): React.JSX.Element {
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      icon={
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-pill bg-current" />
      }
    >
      {status}
    </Badge>
  );
}
