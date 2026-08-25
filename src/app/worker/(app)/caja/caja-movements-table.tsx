import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowDownLeft, ArrowUpRight, ListChecks } from "lucide-react";

import {
  Badge,
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
import { formatAmount, formatDateTime, formatSignedAmount } from "@/lib/format";
import type { CajaMovement } from "@/features/caja/caja-data";

/** "Entrada"/"Salida" as text plus a directional glyph — never colour alone (§20). */
export function MovementTypeBadge({ tipo }: { tipo: CajaMovement["tipo"] }) {
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

export function CajaMovementsTable({
  movements,
  onClearFilters,
}: {
  movements: readonly CajaMovement[];
  onClearFilters: () => void;
}): React.JSX.Element {
  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6 whitespace-nowrap">Fecha y hora</TableHead>
            <TableHead className="whitespace-nowrap">Operación</TableHead>
            <TableHead className="whitespace-nowrap">Tipo</TableHead>
            <TableHead className="whitespace-nowrap">Concepto</TableHead>
            <TableHead className="whitespace-nowrap">Moneda</TableHead>
            <TableHead numeric className="whitespace-nowrap">
              Importe
            </TableHead>
            <TableHead numeric className="whitespace-nowrap">
              Saldo después
            </TableHead>
            <TableHead className="pr-6 whitespace-nowrap">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {movements.length === 0 ? (
            <TableEmptyState
              colSpan={8}
              icon={<ListChecks aria-hidden="true" />}
              title="No encontramos movimientos"
              description="Prueba ajustando los filtros o el término de búsqueda."
              action={
                <Button variant="secondary" size="sm" onClick={onClearFilters}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            movements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell className="pc-numeric pl-6 whitespace-nowrap text-text-secondary">
                  {formatDateTime(new Date(movement.fechaHora))}
                </TableCell>
                <TableCell className="pc-numeric whitespace-nowrap">
                  {movement.operationCode ? (
                    <Button variant="tertiary" size="sm" asChild className="-ml-3 font-medium">
                      <Link href={`/worker/operaciones/${movement.operationCode}` as Route}>
                        {movement.operationCode}
                      </Link>
                    </Button>
                  ) : (
                    <span className="pl-3 text-text-secondary">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <MovementTypeBadge tipo={movement.tipo} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-text-secondary">
                  {movement.concepto}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    <CurrencyFlag currency={movement.currency} />
                    {movement.currency}
                  </span>
                </TableCell>
                <TableCell
                  numeric
                  className={
                    movement.tipo === "entrada"
                      ? "pc-numeric whitespace-nowrap font-medium text-success-foreground"
                      : "pc-numeric whitespace-nowrap font-medium text-error-foreground"
                  }
                >
                  {formatSignedAmount(movement.amount)}
                </TableCell>
                <TableCell numeric className="pc-numeric whitespace-nowrap text-text-secondary">
                  {movement.saldoDespues !== undefined ? formatAmount(movement.saldoDespues) : "—"}
                </TableCell>
                <TableCell className="pr-6 whitespace-nowrap">
                  {/* An operation-generated row already links out via its
                      operation code above — a second "Ver detalle" here
                      would duplicate that navigation target (§18). */}
                  {!movement.operationCode ? (
                    <Button variant="tertiary" size="sm" asChild className="-ml-3 font-medium">
                      <Link href={`/worker/caja/movimientos/${movement.id}` as Route}>Ver detalle</Link>
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
