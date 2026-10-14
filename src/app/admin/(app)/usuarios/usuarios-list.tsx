"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";

import { Badge, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import type { AdminUserStatus } from "@/features/network/operators";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * El listado de usuarios administradores — **FR-AD-USR-1**.
 *
 * ── Por qué este listado no se parece al de trabajadores ──────────────────
 * No hay filtro de sede, porque un usuario administrador **no pertenece a una
 * sede**: puede sobre todas las de su empresa (**FR-AD-USR-4**). Y **se
 * muestran todos, activos y desactivados, sin filtro por defecto**: una
 * empresa tiene dos o tres usuarios, no cien, y ocultar la mitad de una lista
 * tan corta esconde más de lo que ahorra. En trabajadores el filtro existe por
 * lo contrario: tres sedes llenan la lista de bajas históricas.
 *
 * ── Una sola marca en el nombre, y el papel en su columna ────────────
 * **Tú** evita la confusión de buscar el propio nombre entre varios parecidos.
 * Quién gobierna esta sección (**FR-AD-USR-11**) **no es otra etiqueta**: va en
 * la columna **Papel**, con las palabras completas —«Administrador» y
 * «Administrador principal»—. Dos etiquetas apiladas junto a un nombre se
 * amontonan en cuanto la columna se estrecha, y «Principal» a secas obliga a
 * adivinar principal de qué.
 */

export interface UsuarioRow {
  id: string;
  fullName: string;
  identifier: string;
  /** Enmascarado por el dominio de autenticación; aquí nunca entero. */
  correo: string;
  status: AdminUserStatus;
  isPrincipal: boolean;
  isInitial: boolean;
  /** Ya formateadas por el servidor: formatearlas aquí desajusta la hidratación. */
  alta: string;
  ultimoAcceso: string | null;
  esYo: boolean;
}

const BUSQUEDA: FieldSpec = {
  id: "usuarios-busqueda",
  label: "Buscar usuario",
};

export function UsuariosList({ rows }: { rows: readonly UsuarioRow[] }): React.JSX.Element {
  const [texto, setTexto] = React.useState("");

  /* Filtra en el cliente, así que antes de hidratar no filtra nada: queda
     cerrado hasta que React se engancha, en vez de aceptar texto sin efecto. */
  const hydrated = useHydrated();

  const busqueda = texto.trim().toLowerCase();
  const visibles = rows.filter(
    (row) =>
      !busqueda ||
      row.fullName.toLowerCase().includes(busqueda) ||
      row.identifier.toLowerCase().includes(busqueda),
  );

  const columnas: readonly ResponsiveColumn<UsuarioRow>[] = [
    {
      key: "nombre",
      header: "Usuario",
      cell: (row) => (
        <span className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/usuarios/${row.id}` as Route}
            className="font-medium text-text-primary underline-offset-4 hover:underline"
          >
            {row.fullName}
          </Link>
          {row.esYo ? <Badge variant="info">Tú</Badge> : null}
        </span>
      ),
      hiddenOnCard: true,
    },
    {
      key: "identificador",
      header: "Identificador",
      cell: (row) => <span className="pc-numeric text-text-secondary">{row.identifier}</span>,
      hiddenOnCard: true,
    },
    {
      key: "correo",
      header: "Correo de verificación",
      cell: (row) => <span className="text-text-secondary">{row.correo}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (row) => <EstadoUsuario status={row.status} />,
      hiddenOnCard: true,
    },
    { key: "alta", header: "Alta", cell: (row) => row.alta },
    {
      key: "ultimo-acceso",
      header: "Último acceso",
      cell: (row) =>
        row.ultimoAcceso ?? <span className="text-text-secondary">Nunca ha entrado</span>,
    },
    {
      /* Lo que de verdad distingue a un usuario de otro es **quién gobierna
         esta sección** (**FR-AD-USR-11**), no quién lo creó. La ficha lo
         desarrolla; aquí basta con distinguirlo. */
      key: "papel",
      header: "Papel",
      cell: (row) =>
        row.isPrincipal ? (
          <span className="text-text-primary">Administrador principal</span>
        ) : (
          <span className="text-text-secondary">Administrador</span>
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
          <Link
            href={`/admin/usuarios/${row.id}` as Route}
            className="underline-offset-4 hover:underline"
          >
            {row.fullName}
          </Link>
        )}
        cardSubtitle={(row) => (row.esYo ? `${row.identifier} · tú` : row.identifier)}
        cardBadge={(row) => <EstadoUsuario status={row.status} />}
        empty={
          <p className="text-body text-text-primary">Ningún usuario coincide con esa búsqueda.</p>
        }
      />
    </>
  );
}

export function EstadoUsuario({ status }: { status: AdminUserStatus }): React.JSX.Element {
  return status === "activo" ? (
    <Badge variant="success">Activo</Badge>
  ) : (
    <Badge variant="neutral">Desactivado</Badge>
  );
}
