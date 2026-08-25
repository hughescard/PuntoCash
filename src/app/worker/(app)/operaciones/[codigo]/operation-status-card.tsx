import * as React from "react";
import { Ban, CircleCheck, CircleSlash, Clock, ShieldCheck, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { OperationStatus } from "@/components/patterns/operation-status-badge";
import { cn } from "@/lib/utils";
import { DetailCard, DetailList, DetailRow } from "./detail-parts";

/**
 * "Estado de la operación" — the status panel of the detail screen.
 *
 * Every one of the five approved statuses has an entry here, so the card is
 * complete the day a Rechazada or Fallida operation reaches this screen; none
 * of them is redesigned in this task. The badge stays the authoritative status
 * marker, and the sentence below it explains the outcome in words, so the
 * meaning never rests on the panel's tint (§20).
 */

interface StatusPresentation {
  icon: LucideIcon;
  message: string;
  /** Tint family of the panel, matching the badge's own semantic variant. */
  tone: "success" | "warning" | "error" | "neutral";
}

const STATUS_PRESENTATION = {
  Completada: {
    icon: CircleCheck,
    message: "La operación se procesó correctamente.",
    tone: "success",
  },
  "En proceso": {
    icon: Clock,
    message: "La operación está en curso y aún no tiene un resultado final.",
    tone: "warning",
  },
  Rechazada: {
    icon: CircleSlash,
    message: "La operación no fue autorizada a continuar.",
    tone: "error",
  },
  Fallida: {
    icon: TriangleAlert,
    message: "Se intentó procesar la operación, pero no pudo completarse.",
    tone: "error",
  },
  Cancelada: {
    icon: Ban,
    message: "La operación se interrumpió antes de completarse.",
    tone: "neutral",
  },
} as const satisfies Record<OperationStatus, StatusPresentation>;

const TONE_PANEL = {
  success: "border-success-border bg-success-subtle text-success-foreground",
  warning: "border-warning-border bg-warning-subtle text-warning-foreground",
  error: "border-error-border bg-error-subtle text-error-foreground",
  neutral: "border-border bg-surface-subtle text-text-secondary",
} as const;

/** The glyph's ring picks up the same semantic colour as the panel it sits in. */
const TONE_RING = {
  success: "border-success text-success",
  warning: "border-warning text-warning",
  error: "border-error text-error",
  neutral: "border-border-strong text-text-secondary",
} as const;

/**
 * Explanations a rejected or failed operation carries. Deliberately optional
 * and never fabricated: the current mock has no such data, so nothing renders.
 * Once the backend supplies them, passing them here is the whole integration.
 */
export interface OperationStatusExplanation {
  /** Why the operation was rejected or how it failed, in plain language. */
  motivo?: string;
  /** Support reference for the failure, e.g. an error or incident code. */
  referencia?: string;
}

export function OperationStatusCard({
  status,
  explanation,
}: {
  status: OperationStatus;
  explanation?: OperationStatusExplanation;
}): React.JSX.Element {
  const { icon: Icon, message, tone } = STATUS_PRESENTATION[status];
  const hasExplanation = Boolean(explanation?.motivo || explanation?.referencia);

  return (
    <DetailCard title="Estado de la operación" icon={ShieldCheck} contentClassName="gap-4">
      <div
        className={cn(
          "flex flex-col items-center gap-3 rounded-control border px-4 py-6 text-center",
          TONE_PANEL[tone],
        )}
      >
        {/* Ringed glyph, matching the weight the approved reference gives the
            outcome — the same treatment the Cambio de moneda result screen
            already uses for a finished operation. */}
        <span
          aria-hidden="true"
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-pill border-2",
            TONE_RING[tone],
          )}
        >
          <Icon className="size-6" />
        </span>
        {/* The sentence states the outcome in words, so the panel's tint is
            reinforcement and never the carrier of meaning (§20). The status
            term itself is already a badge in the page header, so repeating it
            here would only duplicate it a few pixels below. */}
        <p className="text-body-sm font-medium text-text-primary">{message}</p>
      </div>

      {hasExplanation ? (
        <DetailList>
          {explanation?.motivo ? <DetailRow label="Motivo" value={explanation.motivo} /> : null}
          {explanation?.referencia ? (
            <DetailRow label="Referencia" value={explanation.referencia} numeric />
          ) : null}
        </DetailList>
      ) : null}
    </DetailCard>
  );
}
