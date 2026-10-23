"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";

import { Badge, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import type { WorkerStatus } from "@/features/network/workers";
import { useHydrated } from "@/lib/use-hydrated";
import { useFiltrosEnUrl } from "@/lib/filtros-en-url";
import { cn } from "@/lib/utils";

/**
 * El listado de trabajadores con su búsqueda y sus filtros —
 * **FR-AD-TRAB-1** y **FR-AD-TRAB-2**.
 *
 * **Por defecto solo los activos, y el filtro a la vista.** Lo dice el
 * requisito y tiene su razón: la lista de quien administra tres sedes se llena
 * de bajas históricas que no son lo que viene a hacer. Pero el filtro no se
 * esconde —ni se aplica en silencio—, porque una lista recortada sin decirlo
 * hace creer que falta gente.
 *
 * **No hay columna de caja**, y es una decisión del negocio, no un olvido
 * (**[A13]**): un trabajador está adscrito a una sede y opera cualquier caja
 * de ella; la caja la determina el equipo en el que inicie sesión.
 *
 * Filtra en el cliente, igual que el listado de sedes y por lo mismo: el
 * alcance de un mercante son unas pocas sedes, los trabajadores ya vienen
 * todos en la respuesta, y llevar el filtro al servidor significaría meter
 * estado de pantalla en la URL o en una cookie.
 */

export interface TrabajadorRow {
  id: string;
  fullName: string;
  identifier: string;
  sedeId: string;
  sedeName: string;
  /** Enmascarado por el dominio de autenticación; aquí nunca entero. */
  correo: string;
  status: WorkerStatus;
  /** Ya formateada por el servidor: formatearla aquí desajusta la hidratación. */
  alta: string;
  /** Su última jornada, ya formateada: «Abierta ahora» si la tiene abierta. `null` si nunca abrió. */
  ultimaJornada: { id: string; texto: string; abierta: boolean } | null;
}

const BUSQUEDA: FieldSpec = {
  id: "trabajadores-busqueda",
  label: "Buscar trabajador",
};

const SEDE: FieldSpec = {
  id: "trabajadores-sede",
  label: "Sede",
};

const ESTADO: FieldSpec = {
  id: "trabajadores-estado",
  label: "Estado",
};

const ESTADOS: readonly { value: WorkerStatus | "todos"; label: string }[] = [
  { value: "activo", label: "Activos" },
  { value: "desactivado", label: "Desactivados" },
  { value: "todos", label: "Todos los estados" },
];

const SELECT_CLASS =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-secondary";

export function TrabajadoresList({
  rows,
  sedes,
  inicial = {},
}: {
  /** Los filtros que llegan en la dirección: desde la ficha de una sede llega su sede. */
  inicial?: Record<string, string | undefined>;
  rows: readonly TrabajadorRow[];
  sedes: readonly { id: string; name: string }[];
}): React.JSX.Element {
  const [texto, setTexto] = React.useState(inicial.texto ?? "");
  const [sede, setSede] = React.useState<string>(inicial.sede ?? "todas");
  /* **FR-AD-TRAB-2**: activos por defecto. */
  const [estado, setEstado] = React.useState<WorkerStatus | "todos">((inicial.estado as WorkerStatus | "todos" | undefined) ?? "activo");
  useFiltrosEnUrl({ texto, sede, estado }, { sede: "todas", estado: "activo" });

  /* Los tres controles filtran en el cliente, así que antes de hidratar no
     filtran nada: escribir en ellos entonces no tendría efecto y el listado
     seguiría completo sin explicación. Quedan cerrados hasta que React se
     engancha — un parpadeo, pero nunca un control que no cumple. */
  const hydrated = useHydrated();

  const busqueda = texto.trim().toLowerCase();
  const visibles = rows.filter((row) => {
    if (estado !== "todos" && row.status !== estado) return false;
    if (sede !== "todas" && row.sedeId !== sede) return false;
    if (!busqueda) return true;
    /* **FR-AD-TRAB-2**: «por nombre o identificador». El correo no entra a
       propósito: está enmascarado, así que buscar por él solo encontraría a
       quien ya se sabe el nombre. */
    return (
      row.fullName.toLowerCase().includes(busqueda) ||
      row.identifier.toLowerCase().includes(busqueda)
    );
  });

  const columnas: readonly ResponsiveColumn<TrabajadorRow>[] = [
    {
      key: "nombre",
      header: "Trabajador",
      cell: (row) => (
        <Link
          href={`/admin/trabajadores/${row.id}` as Route}
          className="font-medium text-text-primary underline-offset-4 hover:underline"
        >
          {row.fullName}
        </Link>
      ),
      hiddenOnCard: true,
    },
    {
      key: "identificador",
      header: "Identificador",
      cell: (row) => <span className="pc-numeric text-text-secondary">{row.identifier}</span>,
      hiddenOnCard: true,
    },
    { key: "sede", header: "Sede", cell: (row) => row.sedeName, hiddenOnCard: true },
    {
      key: "correo",
      header: "Correo de verificación",
      cell: (row) => <span className="text-text-secondary">{row.correo}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (row) => <EstadoTrabajador status={row.status} />,
      hiddenOnCard: true,
    },
    { key: "alta", header: "Alta", cell: (row) => row.alta },
    {
      /* **FR-AD-TRAB-1**: la última jornada que operó, con enlace a ella. */
      key: "ultima-jornada",
      header: "Última jornada",
      cell: (row) =>
        row.ultimaJornada ? (
          <Link
            href={`/admin/jornadas/${row.ultimaJornada.id}` as Route}
            className={cn(
              "underline underline-offset-4 hover:text-primary",
              row.ultimaJornada.abierta ? "font-semibold text-text-primary" : "text-text-secondary",
            )}
          >
            {row.ultimaJornada.texto}
          </Link>
        ) : (
          <span className="text-text-secondary">Ninguna</span>
        ),
    },
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
            placeholder="Nombre o identificador"
            prefix={<Search className="size-[18px]" aria-hidden="true" />}
          />
        </Field>

        {/* Con una sola sede, un desplegable prometería una elección que no
            existe: la columna de sede ya dice cuál es. */}
        {sedes.length > 1 ? (
          <Field {...SEDE} className="sm:w-56">
            <select
              {...fieldAria(SEDE)}
              disabled={!hydrated}
              value={sede}
              onChange={(event) => setSede(event.currentTarget.value)}
              className={SELECT_CLASS}
            >
              <option value="todas">Todas mis sedes</option>
              {sedes.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                  {opcion.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <Field {...ESTADO} className="sm:w-56">
          <select
            {...fieldAria(ESTADO)}
            disabled={!hydrated}
            value={estado}
            onChange={(event) => setEstado(event.currentTarget.value as WorkerStatus | "todos")}
            className={SELECT_CLASS}
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
          <Link
            href={`/admin/trabajadores/${row.id}` as Route}
            className="underline-offset-4 hover:underline"
          >
            {row.fullName}
          </Link>
        )}
        cardSubtitle={(row) => `${row.identifier} · ${row.sedeName}`}
        cardBadge={(row) => <EstadoTrabajador status={row.status} />}
        empty={
          <>
            <p className="text-body text-text-primary">
              Ningún trabajador coincide con esos filtros.
            </p>
            <p className="mt-2 text-body-sm text-text-secondary">
              Recuerda que la lista muestra solo los activos mientras no cambies el estado.
            </p>
          </>
        }
      />
    </>
  );
}

export function EstadoTrabajador({ status }: { status: WorkerStatus }): React.JSX.Element {
  return status === "activo" ? (
    <Badge variant="success">Activo</Badge>
  ) : (
    <Badge variant="neutral">Desactivado</Badge>
  );
}
