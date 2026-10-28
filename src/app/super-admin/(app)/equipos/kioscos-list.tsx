"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";

import { Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { useHydrated } from "@/lib/use-hydrated";
import { useFiltrosEnUrl } from "@/lib/filtros-en-url";
import { SELECT, TODAS } from "./controles";

/**
 * Los kioscos de autoservicio vinculados en la red.
 *
 * La última columna no cuenta «solicitudes», como decía el requisito: en este
 * producto una solicitud es la aprobación que un trabajador pide por una
 * diferencia de efectivo, y nace en una caja, no en un kiosco. Lo que un
 * kiosco genera son **operaciones de autoservicio**, y eso es lo que se
 * cuenta, en una ventana explícita para que la cifra signifique algo.
 */

export interface KioscoRow {
  id: string;
  label: string;
  sedeId: string;
  sede: string;
  provincia: string;
  operadorId: string | null;
  operador: string | null;
  /** Ya formateadas en el servidor. */
  vinculado: string;
  vinculadoPor: string;
  actividad: string | null;
  operaciones: number;
}

const BUSQUEDA: FieldSpec = { id: "kioscos-busqueda", label: "Buscar kiosco o sede" };
const OPERADOR: FieldSpec = { id: "kioscos-operador", label: "Operador" };
const PROVINCIA: FieldSpec = { id: "kioscos-provincia", label: "Provincia" };

export function KioscosDeRedList({
  rows,
  inicial = {},
  ventanaDias,
}: {
  rows: readonly KioscoRow[];
  inicial?: Record<string, string | undefined>;
  ventanaDias: number;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [texto, setTexto] = React.useState(inicial.kTexto ?? "");
  const [operador, setOperador] = React.useState(inicial.kOperador ?? TODAS);
  const [provincia, setProvincia] = React.useState(inicial.kProvincia ?? TODAS);
  useFiltrosEnUrl(
    { kTexto: texto, kOperador: operador, kProvincia: provincia },
    { kOperador: TODAS, kProvincia: TODAS },
  );

  const operadores = React.useMemo(() => {
    const vistos = new Map<string, string>();
    for (const r of rows) if (r.operadorId && r.operador) vistos.set(r.operadorId, r.operador);
    return [...vistos].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [rows]);
  const provincias = React.useMemo(
    () => [...new Set(rows.map((r) => r.provincia))].sort((a, b) => a.localeCompare(b, "es")),
    [rows],
  );

  const busqueda = texto.trim().toLowerCase();
  const visibles = rows
    .filter(
      (r) =>
        (operador === TODAS || r.operadorId === operador) &&
        (provincia === TODAS || r.provincia === provincia) &&
        (!busqueda || r.id.toLowerCase().includes(busqueda) || r.label.toLowerCase().includes(busqueda) || r.sede.toLowerCase().includes(busqueda)),
    )
    .slice()
    .sort((a, b) => a.sede.localeCompare(b.sede, "es") || a.label.localeCompare(b.label, "es"));

  const columnas: readonly ResponsiveColumn<KioscoRow>[] = [
    {
      key: "kiosco",
      header: "Kiosco",
      hiddenOnCard: true,
      cell: (r) => (
        <span className="flex min-w-40 flex-col">
          <span className="pc-numeric font-medium text-text-primary">{r.id}</span>
          <span className="text-caption text-text-secondary">{r.label}</span>
        </span>
      ),
    },
    {
      key: "sede",
      header: "Sede",
      hiddenOnCard: true,
      cell: (r) => (
        <Link
          href={`/super-admin/sedes/${r.sedeId}` as Route}
          className="inline-block min-w-32 text-text-primary underline-offset-4 hover:underline"
        >
          {r.sede}
        </Link>
      ),
    },
    {
      key: "operador",
      header: "Operador",
      cell: (r) =>
        r.operadorId ? (
          <Link href={`/super-admin/operadores/${r.operadorId}` as Route} className="text-text-primary underline-offset-4 hover:underline">
            {r.operador}
          </Link>
        ) : (
          <span className="text-text-secondary">Sin operador</span>
        ),
    },
    {
      key: "vinculacion",
      header: "Vinculación",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="whitespace-nowrap text-text-primary">{r.vinculado}</span>
          <span className="whitespace-nowrap text-caption text-text-secondary">por {r.vinculadoPor}</span>
        </span>
      ),
    },
    {
      key: "actividad",
      header: "Última actividad",
      cell: (r) => <span className="whitespace-nowrap text-text-secondary">{r.actividad ?? "Nunca"}</span>,
    },
    {
      key: "operaciones",
      header: `Operaciones (${ventanaDias} días)`,
      numeric: true,
      cell: (r) =>
        r.operaciones === 0 ? <span className="text-text-secondary">0</span> : <span>{r.operaciones}</span>,
    },
  ];

  const hayFiltros = busqueda !== "" || operador !== TODAS || provincia !== TODAS;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field {...BUSQUEDA}>
            <Input
              {...fieldAria(BUSQUEDA)}
              type="search"
              disabled={!hydrated}
              value={texto}
              onChange={(e) => setTexto(e.currentTarget.value)}
              placeholder="Identificador, nombre o sede"
              prefix={<Search className="size-[18px]" aria-hidden="true" />}
            />
          </Field>
          <Field {...OPERADOR}>
            <select {...fieldAria(OPERADOR)} disabled={!hydrated} value={operador} onChange={(e) => setOperador(e.currentTarget.value)} className={SELECT}>
              <option value={TODAS}>Todos los operadores</option>
              {operadores.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field {...PROVINCIA}>
            <select {...fieldAria(PROVINCIA)} disabled={!hydrated} value={provincia} onChange={(e) => setProvincia(e.currentTarget.value)} className={SELECT}>
              <option value={TODAS}>Todas las provincias</option>
              {provincias.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-body-sm text-text-secondary sm:ml-auto" aria-live="polite">
          {visibles.length === 1 ? "1 kiosco" : `${visibles.length} kioscos`}
        </p>
      </div>

      <ResponsiveTable
        rows={visibles}
        columns={columnas}
        rowKey={(r) => r.id}
        tablaDesde="xl"
        tarjetasEnDosColumnas
        cardTitle={(r) => <span className="pc-numeric font-medium text-text-primary">{r.id}</span>}
        cardSubtitle={(r) => `${r.label} · ${r.sede}`}
        empty={
          <p className="text-body text-text-primary">
            {hayFiltros ? "Ningún kiosco coincide con estos filtros." : "Todavía no hay ningún kiosco vinculado en la red."}
          </p>
        }
      />
    </>
  );
}
