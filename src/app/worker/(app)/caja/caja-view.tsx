"use client";

import * as React from "react";
import { History } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { PageHeader } from "@/components/shell/app-shell";
import { Pagination } from "@/components/patterns/pagination";
import {
  CAJA_BALANCES,
  CAJA_METRICS,
  CAJA_MOVEMENTS,
  CAJA_SUMMARY,
  getCajaActions,
  movementMatchesDateFilter,
  movementMatchesQuery,
  type CajaMovementDateFilter,
} from "@/features/caja/caja-data";
import { CajaAlerts } from "./caja-alerts";
import { CajaActionsCard } from "./caja-actions-card";
import { CajaBalancesCard } from "./caja-balances-card";
import { CajaMetrics } from "./caja-metrics";
import { CajaMovementsFilters, type CajaMovementsFiltersValue } from "./caja-movements-filters";
import { CajaMovementsTable } from "./caja-movements-table";
import { CajaPrintableSummary } from "./caja-printable-summary";
import { CajaSummaryCard } from "./caja-summary-card";

const PAGE_SIZE = 20;

const INITIAL_FILTERS: CajaMovementsFiltersValue = {
  query: "",
  tipo: "todos",
  moneda: "todas",
  fecha: "todos",
};

function isDefaultFilters(value: CajaMovementsFiltersValue): boolean {
  return (
    value.query.trim() === "" &&
    value.tipo === "todos" &&
    value.moneda === "todas" &&
    value.fecha === "todos"
  );
}

/**
 * The Worker Caja screen: an operational, read-only view of the register —
 * balances, today's metrics, a movement ledger and an alerts panel — plus an
 * actions area that visibly prepares the fund/adjust/transfer/close flows
 * this first phase does not implement yet (see `CAJA_ACTIONS`).
 */
export function CajaView(): React.JSX.Element {
  const [filters, setFilters] = React.useState<CajaMovementsFiltersValue>(INITIAL_FILTERS);
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(
    () =>
      CAJA_MOVEMENTS.filter(
        (movement) =>
          movementMatchesQuery(movement, filters.query) &&
          (filters.tipo === "todos" || movement.tipo === filters.tipo) &&
          (filters.moneda === "todas" || movement.currency === filters.moneda) &&
          movementMatchesDateFilter(movement, filters.fecha as CajaMovementDateFilter),
      ),
    [filters],
  );

  function updateFilters(next: CajaMovementsFiltersValue) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Caja"
        description="Consulta el estado operativo y financiero de tu caja asignada."
      />

      <div className="flex flex-col gap-6 print:hidden">
        <CajaSummaryCard summary={CAJA_SUMMARY} />

        <CajaAlerts />

        <CajaBalancesCard balances={CAJA_BALANCES} />

        <CajaMetrics metrics={CAJA_METRICS} />

        <Card>
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
              >
                <History className="size-[18px]" />
              </span>
              <CardTitle>Movimientos de caja</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 px-0 pb-6">
            <div className="px-6">
              <CajaMovementsFilters
                value={filters}
                onChange={updateFilters}
                onClear={clearFilters}
                hasActiveFilters={!isDefaultFilters(filters)}
              />
            </div>

            <CajaMovementsTable movements={pageItems} onClearFilters={clearFilters} />

            {filtered.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-4 px-6">
                <p className="text-body-sm text-text-secondary">
                  Mostrando{" "}
                  <span className="pc-numeric font-medium text-text-primary">
                    {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)}
                  </span>{" "}
                  de{" "}
                  <span className="pc-numeric font-medium text-text-primary">
                    {filtered.length}
                  </span>{" "}
                  movimientos
                </p>

                <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <CajaActionsCard actions={getCajaActions()} onPrint={() => window.print()} />
      </div>

      <CajaPrintableSummary summary={CAJA_SUMMARY} balances={CAJA_BALANCES} />
    </>
  );
}
