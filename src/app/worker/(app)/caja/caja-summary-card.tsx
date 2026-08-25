import * as React from "react";
import { Wallet } from "lucide-react";

import { Badge, Card, CardContent } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { CajaSummary } from "@/features/caja/caja-data";

/**
 * The register's own identity card — who holds it, whether it is operating,
 * and how fresh the numbers below are. This is the one place the screen
 * states "this is Caja 03, right now", so every other card can stay focused
 * on its own figures.
 */
export function CajaSummaryCard({ summary }: { summary: CajaSummary }): React.JSX.Element {
  const isOperativa = summary.status === "operativa";

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-6 py-6">
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
          >
            <Wallet className="size-6" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-section-title text-text-primary">{summary.register}</p>
              <Badge variant={isOperativa ? "success" : "neutral"}>
                {isOperativa ? "Operativa" : "Cerrada"}
              </Badge>
            </div>
            <p className="mt-1 text-body-sm text-text-secondary">
              Trabajador asignado: <span className="font-medium text-text-primary">{summary.worker}</span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-caption text-text-secondary">Última actualización</p>
          <p className="pc-numeric text-body-sm font-medium text-text-primary">
            {formatDateTime(new Date(summary.lastUpdated))}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
