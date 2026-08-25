import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { FileText } from "lucide-react";

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmptyState,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { OperationStatusBadge } from "@/components/patterns/operation-status-badge";
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

export function OperationsTable({
  operations,
  onClearFilters,
}: {
  operations: readonly OperationRecord[];
  /** Shown in the empty state's way back to the full list (§6). */
  onClearFilters: () => void;
}): React.JSX.Element {
  return (
    <TableContainer>
      {/*
       * Natural (non-fixed) column widths: every value stays fully readable,
       * with no per-row truncation. Seven dense financial columns — including
       * a dual-currency Importe pair — genuinely do not fit under ~1150px, so
       * rather than truncating Cliente/Servicio on nearly every row (which
       * actively hurts scanability, the opposite of the goal), the table
       * relies on `TableContainer`'s own `overflow-x-auto`. Estado/Acciones
       * are NOT pinned (`position: sticky`): a sticky trailing column still
       * reserves its own width at the table's true right edge *and* renders a
       * second, visually-stuck copy over the container's visible edge, and
       * since this table is genuinely wider than the container, that stuck
       * copy sits on top of Importe's true (unstuck) position — silently
       * clipping "1.000,00 USD" down to "1.000,0" mid-word. Plain flow avoids
       * that double-reservation entirely; the page itself never scrolls
       * horizontally, only this box does (confirmed at 1440 and 1280px).
       */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6 whitespace-nowrap">Código</TableHead>
            <TableHead className="whitespace-nowrap">Fecha y hora</TableHead>
            {/* Text-only, by design — no avatar or initials chip (§7). */}
            <TableHead className="whitespace-nowrap">Cliente</TableHead>
            <TableHead className="whitespace-nowrap">Servicio</TableHead>
            <TableHead className="whitespace-nowrap">Importe</TableHead>
            <TableHead className="whitespace-nowrap">Estado</TableHead>
            <TableHead className="pr-6 text-right whitespace-nowrap">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {operations.length === 0 ? (
            <TableEmptyState
              colSpan={7}
              icon={<FileText aria-hidden="true" />}
              title="No encontramos operaciones"
              description="Prueba ajustando los filtros o el término de búsqueda."
              action={
                <Button variant="secondary" size="sm" onClick={onClearFilters}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            operations.map((record) => (
              <TableRow key={record.codigo}>
                <TableCell className="pl-6 whitespace-nowrap">
                  <span className="pc-numeric font-medium">{record.codigo}</span>
                </TableCell>
                <TableCell className="pc-numeric whitespace-nowrap text-text-secondary">
                  {formatDateTime(new Date(record.fechaHora))}
                </TableCell>
                <TableCell className="whitespace-nowrap">{record.cliente.nombre}</TableCell>
                <TableCell className="whitespace-nowrap text-text-secondary">
                  {record.servicio}
                </TableCell>
                <TableCell>
                  <ImporteCell record={record} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <OperationStatusBadge status={record.estado} />
                </TableCell>
                <TableCell className="pr-6 text-right whitespace-nowrap">
                  <Button variant="tertiary" size="sm" asChild>
                    <Link href={`/worker/operaciones/${record.codigo}` as Route}>
                      Ver detalle
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
