import * as React from "react";

import { Card, CardContent } from "@/components/ui";
import type { CajaMetric } from "@/features/caja/caja-data";

/**
 * Compact metric tiles — today's operational read at a glance. Deliberately
 * plain figures with a label, no charts or trend graphics: this is an
 * operational terminal, not an analytics dashboard.
 */
export function CajaMetrics({ metrics }: { metrics: readonly CajaMetric[] }): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4 wide:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.id}>
          <CardContent className="py-5">
            <p className="text-caption text-text-secondary">{metric.label}</p>
            <p className="pc-numeric mt-1 text-amount text-text-primary">{metric.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
