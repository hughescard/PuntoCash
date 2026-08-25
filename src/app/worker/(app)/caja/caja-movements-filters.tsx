"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import {
  Button,
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
  CAJA_MOVEMENT_DATE_FILTERS,
  CAJA_MOVEMENT_TYPE_FILTERS,
  getCajaMovementCurrencyFilters,
  type CajaMovementDateFilter,
} from "@/features/caja/caja-data";

const SEARCH_FIELD: FieldSpec = { id: "caja-buscar", label: "Buscar" };
const TYPE_FIELD: FieldSpec = { id: "caja-tipo", label: "Tipo" };
const CURRENCY_FIELD: FieldSpec = { id: "caja-moneda", label: "Moneda" };
const DATE_FIELD: FieldSpec = { id: "caja-fecha", label: "Fecha" };

export interface CajaMovementsFiltersValue {
  query: string;
  tipo: string;
  moneda: string;
  fecha: CajaMovementDateFilter;
}

/** Same compact filter-row language as the Operaciones list: search first, then the selects, then clear. */
export function CajaMovementsFilters({
  value,
  onChange,
  onClear,
  hasActiveFilters,
}: {
  value: CajaMovementsFiltersValue;
  onChange: (next: CajaMovementsFiltersValue) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}): React.JSX.Element {
  const searchRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-end gap-4">
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
          placeholder="Buscar por operación o concepto"
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

      <Field {...TYPE_FIELD} className="w-40 shrink-0">
        <Select value={value.tipo} onValueChange={(tipo) => onChange({ ...value, tipo })}>
          <SelectTrigger {...fieldAria(TYPE_FIELD)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CAJA_MOVEMENT_TYPE_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field {...CURRENCY_FIELD} className="w-36 shrink-0">
        <Select value={value.moneda} onValueChange={(moneda) => onChange({ ...value, moneda })}>
          <SelectTrigger {...fieldAria(CURRENCY_FIELD)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getCajaMovementCurrencyFilters().map((option) => (
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
          onValueChange={(fecha) => onChange({ ...value, fecha: fecha as CajaMovementDateFilter })}
        >
          <SelectTrigger {...fieldAria(DATE_FIELD)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CAJA_MOVEMENT_DATE_FILTERS.map((option) => (
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
  );
}
