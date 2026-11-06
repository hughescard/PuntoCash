import * as React from "react";

import { formatDateTime } from "@/lib/format";
import type { CajaSummary } from "@/features/caja/caja-data";

/**
 * Print-only summary for "Imprimir resumen" — the same mechanism already used
 * for operation comprobantes: a `hidden print:block` section plus the global
 * print rules in `globals.css`, which hide the app chrome. No PDF pipeline.
 */
export function CajaPrintableSummary({
  summary,
  monedas,
}: {
  summary: CajaSummary;
  /** Sin importes: Worker no ve los saldos de su caja. */
  monedas: readonly string[];
}): React.JSX.Element {
  return (
    <section className="hidden print:block" aria-hidden="true">
      <h1 style={{ fontSize: "18px", fontWeight: 700 }}>PuntoCash · Resumen de caja</h1>
      <p style={{ marginTop: 4 }}>{summary.register}</p>

      <dl style={{ marginTop: 16, lineHeight: 1.7 }}>
        <ReceiptLine label="Trabajador" value={summary.worker} />
        <ReceiptLine label="Estado" value={summary.status === "operativa" ? "Operativa" : "Cerrada"} />
        <ReceiptLine label="Última actualización" value={formatDateTime(new Date(summary.lastUpdated))} />
        <ReceiptLine label="Monedas" value={monedas.join(", ") || "—"} />
      </dl>
    </section>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
      <dt style={{ color: "#6B7280" }}>{label}</dt>
      <dd style={{ fontWeight: 600 }}>{value}</dd>
    </div>
  );
}
