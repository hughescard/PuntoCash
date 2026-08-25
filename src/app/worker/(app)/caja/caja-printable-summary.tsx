import * as React from "react";

import { formatAmount, formatDateTime } from "@/lib/format";
import type { CajaBalance, CajaSummary } from "@/features/caja/caja-data";

/**
 * Print-only summary for "Imprimir resumen" — the same mechanism already used
 * for operation comprobantes: a `hidden print:block` section plus the global
 * print rules in `globals.css`, which hide the app chrome. No PDF pipeline.
 */
export function CajaPrintableSummary({
  summary,
  balances,
}: {
  summary: CajaSummary;
  balances: readonly CajaBalance[];
}): React.JSX.Element {
  return (
    <section className="hidden print:block" aria-hidden="true">
      <h1 style={{ fontSize: "18px", fontWeight: 700 }}>PuntoCash · Resumen de caja</h1>
      <p style={{ marginTop: 4 }}>{summary.register}</p>

      <dl style={{ marginTop: 16, lineHeight: 1.7 }}>
        <ReceiptLine label="Trabajador" value={summary.worker} />
        <ReceiptLine label="Estado" value={summary.status === "operativa" ? "Operativa" : "Cerrada"} />
        <ReceiptLine label="Última actualización" value={formatDateTime(new Date(summary.lastUpdated))} />
      </dl>

      <h2 style={{ marginTop: 20, fontSize: "15px", fontWeight: 700 }}>Saldos por moneda</h2>
      <dl style={{ marginTop: 8, lineHeight: 1.7 }}>
        {balances.map((balance) => (
          <ReceiptLine
            key={balance.currency}
            label={balance.currency}
            value={formatAmount(balance.amount)}
          />
        ))}
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
