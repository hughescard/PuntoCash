"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";

import { Badge, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import type { SedeStatus } from "@/features/network/sedes";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * El listado con su búsqueda y su filtro de estado (**FR-AD-SEDE-2**).
 *
 * Filtra en el cliente a propósito: el alcance de un mercante son unas pocas
 * sedes, ya vienen todas en la respuesta, y llevar el filtro al servidor
 * significaría meter estado de pantalla en la URL o en una cookie — con el
 * precio que ya conocemos, porque lo que vive arriba y lo que vive abajo
 * pueden acabar contando cosas distintas.
 *
 * Los dos vacíos no comparten mensaje (**FR-AD-STATE-1**): «no tienes sedes»
 * lo resuelve la pantalla de al lado; aquí solo puede ocurrir «tus filtros no
 * devuelven nada», y decir lo otro sería mentir sobre el estado del negocio.
 */

export interface SedeRow {
  id: string;
  /** Código de sede (**FR-AD-SEDE-1**), único en la red. */
  code: string;
  name: string;
  locality: string;
  status: SedeStatus;
  cajasActivas: number;
  cajasSinEquipo: number;
  kioscos: number;
  trabajadores: number;
}

const BUSQUEDA: FieldSpec = {
  id: "sedes-busqueda",
  label: "Buscar sede",
};

const ESTADO: FieldSpec = {
  id: "sedes-estado",
  label: "Estado",
};

const ESTADOS: readonly { value: SedeStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos los estados" },
  { value: "activa", label: "Activas" },
  { value: "suspendida", label: "Suspendidas" },
  { value: "cerrada", label: "Cerradas" },
];

export function SedesList({ rows }: { rows: readonly SedeRow[] }): React.JSX.Element {
  const [texto, setTexto] = React.useState("");
  const [estado, setEstado] = React.useState<SedeStatus | "todos">("todos");

  /* Los dos controles filtran en el cliente, así que antes de la hidratación
     no filtran nada: escribir en ellos entonces no tendría efecto y el
     listado seguiría completo sin explicación. Quedan cerrados hasta que
     React se engancha — un parpadeo, pero nunca un control que no cumple. */
  const hydrated = useHydrated();

  const busqueda = texto.trim().toLowerCase();
  const visibles = rows.filter((row) => {
    if (estado !== "todos" && row.status !== estado) return false;
    if (!busqueda) return true;
    /* **FR-AD-SEDE-2**: «búsqueda por código o nombre». La localidad se
       mantiene porque ya estaba y ayuda, pero el código es el que el requisito
       nombra primero. */
    return (
      row.code.toLowerCase().includes(busqueda) ||
      row.name.toLowerCase().includes(busqueda) ||
      row.locality.toLowerCase().includes(busqueda)
    );
  });

  const columnas: readonly ResponsiveColumn<SedeRow>[] = [
    {
      key: "codigo",
      header: "Código",
      cell: (row) => <span className="pc-numeric text-text-secondary">{row.code}</span>,
      hiddenOnCard: true,
    },
    {
      key: "sede",
      header: "Sede",
      cell: (row) => (
        <Link
          href={`/admin/sedes/${row.id}` as Route}
          className="font-medium text-text-primary underline-offset-4 hover:underline"
        >
          {row.name}
        </Link>
      ),
      hiddenOnCard: true,
    },
    { key: "localidad", header: "Localidad", cell: (row) => row.locality, hiddenOnCard: true },
    { key: "estado", header: "Estado", cell: (row) => <EstadoSede status={row.status} />, hiddenOnCard: true },
    { key: "cajas", header: "Cajas activas", cell: (row) => row.cajasActivas, numeric: true },
    {
      key: "sin-equipo",
      header: "Sin equipo",
      cell: (row) =>
        row.cajasSinEquipo > 0 ? (
          <span className="text-warning-foreground">{row.cajasSinEquipo}</span>
        ) : (
          row.cajasSinEquipo
        ),
      numeric: true,
    },
    { key: "kioscos", header: "Kioscos", cell: (row) => row.kioscos, numeric: true },
    { key: "personal", header: "Trabajadores", cell: (row) => row.trabajadores, numeric: true },
  ];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <Field {...BUSQUEDA} className="sm:max-w-sm sm:flex-1">
          <Input
            {...fieldAria(BUSQUEDA)}
            type="search"
            disabled={!hydrated}
            value={texto}
            onChange={(event) => setTexto(event.currentTarget.value)}
            placeholder="Código, nombre o localidad"
            prefix={<Search className="size-[18px]" aria-hidden="true" />}
          />
        </Field>

        <Field {...ESTADO} className="sm:w-56">
          <select
            {...fieldAria(ESTADO)}
            disabled={!hydrated}
            value={estado}
            onChange={(event) => setEstado(event.currentTarget.value as SedeStatus | "todos")}
            className="h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-secondary"
          >
            {ESTADOS.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <ResponsiveTable
        rows={visibles}
        columns={columnas}
        rowKey={(row) => row.id}
        cardTitle={(row) => (
          <Link href={`/admin/sedes/${row.id}` as Route} className="underline-offset-4 hover:underline">
            {row.name}
          </Link>
        )}
        cardSubtitle={(row) => `${row.code} · ${row.locality}`}
        cardBadge={(row) => <EstadoSede status={row.status} />}
        empty={
          <>
            <p className="text-body text-text-primary">Ninguna sede coincide con esos filtros.</p>
            <p className="mt-2 text-body-sm text-text-secondary">
              Prueba con otro texto o vuelve a «Todos los estados».
            </p>
          </>
        }
      />
    </>
  );
}

export function EstadoSede({ status }: { status: SedeStatus }): React.JSX.Element {
  if (status === "activa") return <Badge variant="success">Activa</Badge>;
  if (status === "suspendida") return <Badge variant="warning">Suspendida</Badge>;
  return <Badge variant="neutral">Cerrada</Badge>;
}
