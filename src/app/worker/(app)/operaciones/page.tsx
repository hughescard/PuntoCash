import type { Metadata } from "next";

import { OperationsList } from "./operations-list";

export const metadata: Metadata = {
  title: "Operaciones",
  description: "Consulta las operaciones realizadas desde tu caja.",
  robots: { index: false, follow: false },
};

/**
 * Worker operational list — find operations, filter them, inspect status,
 * open detail. Not an analytics dashboard: no charts, no KPIs, no summary
 * cards, matching Inicio's own restraint (§21 "Patrón Worker").
 */
export default function OperacionesPage() {
  return <OperationsList />;
}
