import * as React from "react";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { OperationStatusBadge } from "@/components/patterns/operation-status-badge";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { OperationRecord } from "@/features/operations/operations-history";

/**
 * The Importe cell. Cambio de moneda shows the full pair inline — flag,
 * amount, arrow, flag, amount — reusing the exact composition already
 * approved for the completed-operation result screen, so a pair reads
 * identically everywhere it appears. Every other service shows one figure.
 * `whitespace-nowrap` keeps every row at the same height regardless of shape.
 */
function ImporteCell({ record }: { record: OperationRecord }) {
  if (record.amount.kind === "exchange") {
    const { source, destination } = record.amount;
    return (
      <span className="flex items-center gap-1 whitespace-nowrap">
        <CurrencyFlag currency={source.currency} />
        <span className="pc-numeric font-medium">{formatMoney(source)}</span>
        <span aria-hidden="true" className="text-text-secondary">
          →
        </span>
        <CurrencyFlag currency={destination.currency} />
        <span className="pc-numeric font-medium">{formatMoney(destination)}</span>
      </span>
    );
  }

  const { money } = record.amount;
  return (
    <span className="flex items-center gap-1 whitespace-nowrap">
      <CurrencyFlag currency={money.currency} />
      <span className="pc-numeric font-medium">{formatMoney(money)}</span>
    </span>
  );
}

const COLUMNAS: readonly ResponsiveColumn<OperationRecord>[] = [
  {
    key: "codigo",
    header: "Código",
    cell: (r) => <span className="pc-numeric font-medium whitespace-nowrap">{r.codigo}</span>,
    hiddenOnCard: true,
  },
  {
    key: "fecha",
    header: "Fecha y hora",
    cell: (r) => <span className="pc-numeric whitespace-nowrap text-text-secondary">{formatDateTime(new Date(r.fechaHora))}</span>,
  },
  /* Solo texto, sin avatar ni iniciales (§7). */
  { key: "cliente", header: "Cliente", cell: (r) => <span className="whitespace-nowrap">{r.cliente.nombre}</span> },
  { key: "servicio", header: "Servicio", cell: (r) => <span className="whitespace-nowrap text-text-secondary">{r.servicio}</span> },
  { key: "importe", header: "Importe", cell: (r) => <ImporteCell record={r} /> },
  { key: "estado", header: "Estado", cell: (r) => <OperationStatusBadge status={r.estado} />, hiddenOnCard: true },
];

/**
 * El historial de operaciones. La fila entera abre el detalle de la operación
 * (regla de tablas, 12/11/2026): no hay columna de acciones.
 */
export function OperationsTable({
  operations,
  onClearFilters,
}: {
  operations: readonly OperationRecord[];
  /** Shown in the empty state's way back to the full list (§6). */
  onClearFilters: () => void;
}): React.JSX.Element {
  return (
    <ResponsiveTable
      rows={operations}
      columns={COLUMNAS}
      rowKey={(r) => r.codigo}
      tablaDesde="xl"
      tarjetasEnDosColumnas
      cardTitle={(r) => <span className="pc-numeric">{r.codigo}</span>}
      cardBadge={(r) => <OperationStatusBadge status={r.estado} />}
      rowLink={(r) => ({ href: `/worker/operaciones/${r.codigo}`, label: `Ver la operación ${r.codigo}` })}
      empty={
        <div className="flex flex-col items-center gap-3">
          <FileText aria-hidden="true" className="size-8 text-text-secondary" />
          <p className="text-body font-semibold text-text-primary">No encontramos operaciones</p>
          <p className="text-body-sm text-text-secondary">Prueba ajustando los filtros o el término de búsqueda.</p>
          <Button variant="secondary" size="sm" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        </div>
      }
    />
  );
}
