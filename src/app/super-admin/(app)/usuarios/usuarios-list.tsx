"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";

import { Badge, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import type { PuntoCashUserStatus } from "@/features/super-admin/usuarios";
import { useHydrated } from "@/lib/use-hydrated";
import { useFiltrosEnUrl } from "@/lib/filtros-en-url";

/**
 * El listado de usuarios de la consola (FR-SA-USR). Se muestran todos, activos
 * y desactivados, sin filtro por defecto: son dos o tres personas, y ocultar la
 * mitad de una lista tan corta esconde más de lo que ahorra.
 *
 * El papel va en su propia columna con las palabras completas. Quien gobierna
 * la sección no es otra etiqueta apilada junto al nombre.
 */

export interface UsuarioSuperAdminRow {
  id: string;
  fullName: string;
  identifier: string;
  area: string;
  correo: string;
  status: PuntoCashUserStatus;
  isPrincipal: boolean;
  alta: string;
  ultimoAcceso: string | null;
  esYo: boolean;
}

const BUSQUEDA: FieldSpec = { id: "usuarios-sa-busqueda", label: "Buscar usuario" };

export function UsuariosSuperAdminList({
  rows,
  inicial = {},
}: {
  rows: readonly UsuarioSuperAdminRow[];
  inicial?: Record<string, string | undefined>;
}): React.JSX.Element {
  const [texto, setTexto] = React.useState(inicial.texto ?? "");
  useFiltrosEnUrl({ texto }, {});
  const hydrated = useHydrated();

  const busqueda = texto.trim().toLowerCase();
  const visibles = rows.filter(
    (row) =>
      !busqueda ||
      row.fullName.toLowerCase().includes(busqueda) ||
      row.identifier.toLowerCase().includes(busqueda),
  );

  const columnas: readonly ResponsiveColumn<UsuarioSuperAdminRow>[] = [
    {
      key: "nombre",
      header: "Usuario",
      hiddenOnCard: true,
      cell: (row) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <Link
            href={`/super-admin/usuarios/${row.id}` as Route}
            className="font-medium text-text-primary underline-offset-4 hover:underline"
          >
            {row.fullName}
          </Link>
          {row.esYo ? <Badge variant="info">Tú</Badge> : null}
        </span>
      ),
    },
    {
      key: "identificador",
      header: "Identificador",
      hiddenOnCard: true,
      cell: (row) => <span className="pc-numeric text-text-secondary">{row.identifier}</span>,
    },
    {
      key: "correo",
      header: "Correo de verificación",
      cell: (row) => <span className="text-text-secondary">{row.correo}</span>,
    },
    { key: "estado", header: "Estado", hiddenOnCard: true, cell: (row) => <EstadoUsuarioSA status={row.status} /> },
    { key: "alta", header: "Alta", cell: (row) => <span className="whitespace-nowrap">{row.alta}</span> },
    {
      key: "ultimo-acceso",
      header: "Último acceso",
      cell: (row) => (
        <span className="whitespace-nowrap">
          {row.ultimoAcceso ?? <span className="text-text-secondary">Nunca ha entrado</span>}
        </span>
      ),
    },
    {
      key: "papel",
      header: "Papel",
      cell: (row) =>
        row.isPrincipal ? (
          <span className="whitespace-nowrap text-text-primary">Principal</span>
        ) : (
          <span className="whitespace-nowrap text-text-secondary">Super administrador</span>
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
      </div>

      <ResponsiveTable
        rows={visibles}
        columns={columnas}
        rowKey={(row) => row.id}
        cardTitle={(row) => (
          <Link href={`/super-admin/usuarios/${row.id}` as Route} className="underline-offset-4 hover:underline">
            {row.fullName}
          </Link>
        )}
        cardSubtitle={(row) => (row.esYo ? `${row.identifier} · tú` : row.identifier)}
        cardBadge={(row) => <EstadoUsuarioSA status={row.status} />}
        empty={<p className="text-body text-text-primary">Ningún usuario coincide con esa búsqueda.</p>}
      />
    </>
  );
}

export function EstadoUsuarioSA({ status }: { status: PuntoCashUserStatus }): React.JSX.Element {
  return status === "activo" ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Desactivado</Badge>;
}
