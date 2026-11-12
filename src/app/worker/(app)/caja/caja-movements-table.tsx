import * as React from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ListChecks } from "lucide-react";

import { Badge, Button } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { formatDateTime, formatSignedAmount } from "@/lib/format";
import type { CajaMovement } from "@/features/caja/caja-data";

/** "Entrada"/"Salida" as text plus a directional glyph — never colour alone (§20). */
export function MovementTypeBadge({ tipo }: { tipo: CajaMovement["tipo"] }) {
  if (tipo === "cambio") {
    return (
      <Badge variant="neutral" icon={<ArrowLeftRight aria-hidden="true" />}>
        Cambio
      </Badge>
    );
  }
  return tipo === "entrada" ? (
    <Badge variant="success" icon={<ArrowDownLeft aria-hidden="true" />}>
      Entrada
    </Badge>
  ) : (
    <Badge variant="error" icon={<ArrowUpRight aria-hidden="true" />}>
      Salida
    </Badge>
  );
}

function claseImporte(tipo: CajaMovement["tipo"]): string {
  return tipo === "entrada"
    ? "whitespace-nowrap text-success-foreground"
    : tipo === "cambio"
      ? "whitespace-nowrap text-text-secondary"
      : "whitespace-nowrap text-error-foreground";
}

const COLUMNAS: readonly ResponsiveColumn<CajaMovement>[] = [
  {
    key: "fecha",
    header: "Fecha y hora",
    cell: (m) => <span className="pc-numeric whitespace-nowrap text-text-secondary">{formatDateTime(new Date(m.fechaHora))}</span>,
  },
  {
    key: "operacion",
    header: "Operación",
    cell: (m) =>
      m.operationCode ? (
        <span className="pc-numeric whitespace-nowrap font-medium">{m.operationCode}</span>
      ) : (
        <span className="text-text-secondary">—</span>
      ),
  },
  { key: "tipo", header: "Tipo", cell: (m) => <MovementTypeBadge tipo={m.tipo} />, hiddenOnCard: true },
  { key: "concepto", header: "Concepto", cell: (m) => <span className="whitespace-nowrap text-text-secondary">{m.concepto}</span>, hiddenOnCard: true },
  {
    key: "moneda",
    header: "Moneda",
    cell: (m) => (
      <span className="flex items-center gap-2 whitespace-nowrap">
        <CurrencyFlag currency={m.currency} />
        {m.currency}
      </span>
    ),
  },
  {
    key: "importe",
    header: "Importe",
    numeric: true,
    cell: (m) => <span className={claseImporte(m.tipo)}>{formatSignedAmount(m.amount)}</span>,
  },
];

/**
 * Los movimientos de la caja. La fila entera abre su detalle (regla de tablas,
 * 12/11/2026): el de la operación si la generó una, y si no el del movimiento.
 * El detalle de un movimiento de operación es la operación misma.
 */
export function CajaMovementsTable({
  movements,
  onClearFilters,
}: {
  movements: readonly CajaMovement[];
  onClearFilters: () => void;
}): React.JSX.Element {
  return (
    <ResponsiveTable
      rows={movements}
      columns={COLUMNAS}
      rowKey={(m) => m.id}
      tablaDesde="xl"
      tarjetasEnDosColumnas
      cardTitle={(m) => m.concepto}
      cardBadge={(m) => <MovementTypeBadge tipo={m.tipo} />}
      rowLink={(m) =>
        m.operationCode
          ? { href: `/worker/operaciones/${m.operationCode}`, label: `Ver la operación ${m.operationCode}` }
          : { href: `/worker/caja/movimientos/${m.id}`, label: `Ver el movimiento: ${m.concepto}` }
      }
      empty={
        <div className="flex flex-col items-center gap-3">
          <ListChecks aria-hidden="true" className="size-8 text-text-secondary" />
          <p className="text-body font-semibold text-text-primary">No encontramos movimientos</p>
          <p className="text-body-sm text-text-secondary">Prueba ajustando los filtros o el término de búsqueda.</p>
          <Button variant="secondary" size="sm" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        </div>
      }
    />
  );
}
