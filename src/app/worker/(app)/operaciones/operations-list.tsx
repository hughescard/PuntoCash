"use client";

import * as React from "react";

import { PageHeader } from "@/components/shell/app-shell";
import { Pagination } from "@/components/patterns/pagination";
import {
  OPERATIONS,
  operationMatchesDateFilter,
  operationMatchesDateRange,
  operationMatchesQuery,
  type OperationDateFilter,
} from "@/features/operations/operations-history";
import { OperationsFilters, type OperationsFiltersValue } from "./operations-filters";
import { OperationsTable } from "./operations-table";

const PAGE_SIZE = 20;

const INITIAL_FILTERS: OperationsFiltersValue = {
  query: "",
  servicio: "todos",
  estado: "todos",
  fecha: "todos",
  desde: "",
  hasta: "",
};

function isDefaultFilters(value: OperationsFiltersValue): boolean {
  return (
    value.query.trim() === "" &&
    value.servicio === "todos" &&
    value.estado === "todos" &&
    value.fecha === "todos" &&
    value.desde === "" &&
    value.hasta === ""
  );
}

/**
 * The Worker operational list: find, filter and open an operation. Filtering
 * and pagination run entirely client-side over the mock dataset — the shape
 * a real paginated query should return, so wiring the backend later means
 * replacing `OPERATIONS` and this component's local state with a fetch.
 */
export function OperationsList(): React.JSX.Element {
  const [filters, setFilters] = React.useState<OperationsFiltersValue>(INITIAL_FILTERS);
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(
    () =>
      OPERATIONS.filter(
        (op) =>
          operationMatchesQuery(op, filters.query) &&
          (filters.servicio === "todos" || op.servicio === filters.servicio) &&
          (filters.estado === "todos" || op.estado === filters.estado) &&
          operationMatchesDateFilter(op, filters.fecha as OperationDateFilter) &&
          (filters.fecha !== "personalizado" ||
            operationMatchesDateRange(op, filters.desde, filters.hasta)),
      ),
    [filters],
  );

  // Any filter change can invalidate the current page (e.g. page 3 of a list
  // that just shrank to one page), so filtering always returns to page 1.
  function updateFilters(next: OperationsFiltersValue) {
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
        title="Operaciones"
        description="Consulta las operaciones realizadas desde tu caja."
      />

      <div className="flex flex-col gap-6">
        <OperationsFilters
          value={filters}
          onChange={updateFilters}
          onClear={clearFilters}
          hasActiveFilters={!isDefaultFilters(filters)}
        />

        <OperationsTable operations={pageItems} onClearFilters={clearFilters} />

        {filtered.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-body-sm text-text-secondary">
              Mostrando{" "}
              <span className="pc-numeric font-medium text-text-primary">
                {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)}
              </span>{" "}
              de{" "}
              <span className="pc-numeric font-medium text-text-primary">{filtered.length}</span>{" "}
              operaciones
            </p>

            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </div>
    </>
  );
}
