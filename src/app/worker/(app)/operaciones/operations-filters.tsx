"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  fieldAria,
  type FieldSpec,
} from "@/components/ui";
import {
  OPERATION_DATE_FILTERS,
  OPERATION_SERVICE_FILTERS,
  OPERATION_STATUS_FILTERS,
  isValidDateRange,
  type OperationDateFilter,
} from "@/features/operations/operations-history";

const SEARCH_FIELD: FieldSpec = { id: "operaciones-buscar", label: "Buscar" };
const SERVICE_FIELD: FieldSpec = { id: "operaciones-servicio", label: "Servicio" };
const STATUS_FIELD: FieldSpec = { id: "operaciones-estado", label: "Estado" };
const DATE_FIELD: FieldSpec = { id: "operaciones-fecha", label: "Fecha" };
const DESDE_FIELD: FieldSpec = { id: "operaciones-desde", label: "Desde" };
const HASTA_FIELD: FieldSpec = { id: "operaciones-hasta", label: "Hasta" };

export interface OperationsFiltersValue {
  query: string;
  servicio: string;
  estado: string;
  fecha: OperationDateFilter;
  /** Both yyyy-mm-dd, only read while `fecha === "personalizado"`. */
  desde: string;
  hasta: string;
}

/**
 * Compact filter row — search first, then the three compact selects, then
 * clear. A `Card` matches the container language every other functional group
 * in the product already uses.
 */
export function OperationsFilters({
  value,
  onChange,
  onClear,
  hasActiveFilters,
}: {
  value: OperationsFiltersValue;
  onChange: (next: OperationsFiltersValue) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}): React.JSX.Element {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const isCustomRange = value.fecha === "personalizado";
  const rangeInvalid = isCustomRange && !isValidDateRange(value.desde, value.hasta);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="flex flex-wrap items-end gap-4">
          {/* No `Field` wrapper here: `Field` always renders a visible label,
              and the icon + placeholder already communicate this field's
              purpose — the same convention already used on Nueva operación's
              search bar. The label still exists, just visually hidden (§20). */}
          <div className="min-w-[16rem] flex-1 basis-64">
            <label htmlFor={SEARCH_FIELD.id} className="sr-only">
              {SEARCH_FIELD.label}
            </label>
            <Input
              ref={searchRef}
              id={SEARCH_FIELD.id}
              type="search"
              value={value.query}
              onChange={(event) => onChange({ ...value, query: event.target.value })}
              placeholder="Buscar por código, cliente o documento"
              autoComplete="off"
              prefix={<Search className="size-[18px]" aria-hidden="true" />}
              suffix={
                value.query ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...value, query: "" });
                      searchRef.current?.focus();
                    }}
                    aria-label="Limpiar búsqueda"
                    className="-mr-2 grid size-11 shrink-0 place-items-center rounded-control text-text-secondary transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:bg-primary-subtle hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <X className="size-[18px]" aria-hidden="true" />
                  </button>
                ) : undefined
              }
            />
          </div>

          {/* Visible label above a persistently short label (never hidden behind
              a placeholder alone) — §15. */}
          <Field {...SERVICE_FIELD} className="w-52 shrink-0">
            <Select
              value={value.servicio}
              onValueChange={(servicio) => onChange({ ...value, servicio })}
            >
              <SelectTrigger {...fieldAria(SERVICE_FIELD)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATION_SERVICE_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field {...STATUS_FIELD} className="w-44 shrink-0">
            <Select value={value.estado} onValueChange={(estado) => onChange({ ...value, estado })}>
              <SelectTrigger {...fieldAria(STATUS_FIELD)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATION_STATUS_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field {...DATE_FIELD} className="w-44 shrink-0">
            <Select
              value={value.fecha}
              onValueChange={(fecha) =>
                onChange({ ...value, fecha: fecha as OperationDateFilter })
              }
            >
              <SelectTrigger {...fieldAria(DATE_FIELD)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATION_DATE_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Button
            type="button"
            variant="tertiary"
            onClick={onClear}
            disabled={!hasActiveFilters}
            className="shrink-0"
          >
            Limpiar filtros
          </Button>
        </div>

        {/* A compact second row, only while Personalizado is active — keeps
            the approved main row's density untouched rather than squeezing
            two more controls into it. */}
        {isCustomRange
          ? (() => {
              const rangeError = rangeInvalid ? "Desde no puede ser posterior a Hasta." : undefined;
              const desdeField: FieldSpec = { ...DESDE_FIELD, error: rangeError };
              const hastaField: FieldSpec = { ...HASTA_FIELD, error: rangeError };

              return (
                <div className="flex flex-wrap items-start gap-4 border-t border-border pt-4">
                  <Field {...desdeField} className="w-44 shrink-0">
                    <Input
                      {...fieldAria(desdeField)}
                      type="date"
                      value={value.desde}
                      max={value.hasta || undefined}
                      invalid={rangeInvalid}
                      onChange={(event) => onChange({ ...value, desde: event.target.value })}
                    />
                  </Field>

                  <Field {...hastaField} className="w-44 shrink-0">
                    <Input
                      {...fieldAria(hastaField)}
                      type="date"
                      value={value.hasta}
                      min={value.desde || undefined}
                      invalid={rangeInvalid}
                      onChange={(event) => onChange({ ...value, hasta: event.target.value })}
                    />
                  </Field>
                </div>
              );
            })()
          : null}
      </CardContent>
    </Card>
  );
}
