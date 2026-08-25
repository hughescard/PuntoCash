import * as React from "react";

import { Alert } from "@/components/ui";
import { WORKER_ALERTS } from "@/features/worker/home-data";

/**
 * Reuses Home's own `WORKER_ALERTS` rather than a second, Caja-scoped copy —
 * both screens describe the same register at the same moment, and duplicating
 * the data would risk the two silently disagreeing. Renders nothing at all
 * when there are no alerts, never an empty card (§8).
 */
export function CajaAlerts(): React.JSX.Element | null {
  if (!WORKER_ALERTS.length) return null;

  return (
    <div className="flex flex-col gap-3">
      {WORKER_ALERTS.map((alert) => (
        <Alert key={alert.id} variant={alert.variant} title={alert.title}>
          {alert.description}
        </Alert>
      ))}
    </div>
  );
}
