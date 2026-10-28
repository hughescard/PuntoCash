"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";

import { Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import type { EstadoDeSede } from "@/features/network/assignments";
import { useHydrated } from "@/lib/use-hydrated";
import { useFiltrosEnUrl } from "@/lib/filtros-en-url";
import { ETIQUETA_DE_ESTADO, EstadoDeSedeBadge } from "../_compartido/estado-de-sede";

/**
 * El listado de sedes con los filtros del requisito: estado, provincia,
 * operador (con «Sin operador» como una opción más), búsqueda por código o
 * nombre, y dos conmutadores, «Sin cajas» y «Con cajas sin equipo».
 *
 * Orden por defecto, el mismo de Inicio: primero lo que solo PuntoCash
 * resuelve (sin asignar), luego suspendidas, luego activas, y las cerradas al
 * final.
 */

export interface SedeRow {
  id: string;
  codigo: string;
  nombre: string;
  municipio: string;
  provincia: string;
  estado: EstadoDeSede;
  operadorId: string | null;
  operador: string | null;
  /** Ya formateada en el servidor. */
  desde: string | null;
  desdeIso: string | null;
  cajas: number;
  conEquipo: number;
  trabajadores: number;
}

const PRIORIDAD: Readonly<Record<EstadoDeSede, number>> = {
  "sin-asignar": 0,
  suspendida: 1,
  "operador-suspendido": 2,
  activa: 3,
  cerrada: 4,
};

const ESTADOS: readonly EstadoDeSede[] = ["sin-asignar", "activa", "suspendida", "operador-suspendido", "cerrada"];

const BUSQUEDA: FieldSpec = { id: "sedes-busqueda", label: "Buscar sede" };
const ESTADO: FieldSpec = { id: "sedes-estado", label: "Estado" };
const PROVINCIA: FieldSpec = { id: "sedes-provincia", label: "Provincia" };
const OPERADOR: FieldSpec = { id: "sedes-operador", label: "Operador" };

const TODAS = "todas";
const SIN_OPERADOR = "sin-operador";

export function SedesList({
  rows,
  inicial = {},
}: {
  rows: readonly SedeRow[];
  inicial?: Record<string, string | undefined>;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [texto, setTexto] = React.useState(inicial.texto ?? "");
  const [estado, setEstado] = React.useState(inicial.estado ?? TODAS);
  const [provincia, setProvincia] = React.useState(inicial.provincia ?? TODAS);
  const [operador, setOperador] = React.useState(inicial.operador ?? TODAS);
  const [sinCajas, setSinCajas] = React.useState(inicial.sinCajas === "1");
  const [sinEquipo, setSinEquipo] = React.useState(inicial.sinEquipo === "1");
  useFiltrosEnUrl(
    { texto, estado, provincia, operador, sinCajas: sinCajas ? "1" : "", sinEquipo: sinEquipo ? "1" : "" },
    { estado: TODAS, provincia: TODAS, operador: TODAS },
  );

  const provincias = React.useMemo(
    () => [...new Set(rows.map((r) => r.provincia))].sort((a, b) => a.localeCompare(b, "es")),
    [rows],
  );
  const operadores = React.useMemo(() => {
    const vistos = new Map<string, string>();
    for (const r of rows) if (r.operadorId && r.operador) vistos.set(r.operadorId, r.operador);
    return [...vistos].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [rows]);

  const busqueda = texto.trim().toLowerCase();
  const visibles = rows
    .filter(
      (r) =>
        (!busqueda || r.nombre.toLowerCase().includes(busqueda) || r.codigo.toLowerCase().includes(busqueda)) &&
        (estado === TODAS || r.estado === estado) &&
        (provincia === TODAS || r.provincia === provincia) &&
        (operador === TODAS || (operador === SIN_OPERADOR ? r.operadorId === null : r.operadorId === operador)) &&
        (!sinCajas || r.cajas === 0) &&
        (!sinEquipo || r.conEquipo < r.cajas),
    )
    .slice()
    .sort((a, b) => PRIORIDAD[a.estado] - PRIORIDAD[b.estado] || a.nombre.localeCompare(b.nombre, "es"));

  const columnas: readonly ResponsiveColumn<SedeRow>[] = [
    {
      key: "sede",
      header: "Sede",
      hiddenOnCard: true,
      cell: (r) => (
        <span className="flex min-w-40 flex-col">
          <EnlaceSede fila={r} />
          <span className="pc-numeric text-caption text-text-secondary">
            {r.codigo} · {r.municipio}, {r.provincia}
          </span>
        </span>
      ),
    },
    { key: "estado", header: "Estado", hiddenOnCard: true, cell: (r) => <EstadoDeSedeBadge estado={r.estado} /> },
    {
      key: "operador",
      header: "Operador",
      cell: (r) =>
        r.operadorId ? (
          <span className="flex flex-col">
            <Link
              href={`/super-admin/operadores/${r.operadorId}` as Route}
              className="text-text-primary underline-offset-4 hover:underline"
            >
              {r.operador}
            </Link>
            <span className="whitespace-nowrap text-caption text-text-secondary">desde el {r.desde}</span>
          </span>
        ) : (
          <span className="font-medium text-text-secondary">Sin operador</span>
        ),
    },
    {
      key: "cajas",
      header: "Cajas",
      cell: (r) =>
        r.cajas === 0 ? (
          <span className="text-text-secondary">Sin cajas</span>
        ) : (
          <span className="flex flex-col">
            <span className="whitespace-nowrap text-text-primary">
              {r.cajas} {r.cajas === 1 ? "activa" : "activas"}
            </span>
            <span
              className={`whitespace-nowrap text-caption ${r.conEquipo < r.cajas ? "text-warning-foreground" : "text-text-secondary"}`}
            >
              {r.conEquipo === r.cajas ? "todas con equipo" : `${r.conEquipo} con equipo`}
            </span>
          </span>
        ),
    },
    {
      key: "trabajadores",
      header: "Trabajadores",
      numeric: true,
      cell: (r) => (r.trabajadores === 0 ? <span className="text-text-secondary">0</span> : r.trabajadores),
    },
  ];

  const hayFiltros =
    busqueda !== "" || estado !== TODAS || provincia !== TODAS || operador !== TODAS || sinCajas || sinEquipo;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field {...BUSQUEDA}>
            <Input
              {...fieldAria(BUSQUEDA)}
              type="search"
              disabled={!hydrated}
              value={texto}
              onChange={(e) => setTexto(e.currentTarget.value)}
              placeholder="Código o nombre"
              prefix={<Search className="size-[18px]" aria-hidden="true" />}
            />
          </Field>
          <Field {...ESTADO}>
            <select {...fieldAria(ESTADO)} disabled={!hydrated} value={estado} onChange={(e) => setEstado(e.currentTarget.value)} className={SELECT}>
              <option value={TODAS}>Todos los estados</option>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_DE_ESTADO[e]}
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
          <Field {...OPERADOR}>
            <select {...fieldAria(OPERADOR)} disabled={!hydrated} value={operador} onChange={(e) => setOperador(e.currentTarget.value)} className={SELECT}>
              <option value={TODAS}>Todos los operadores</option>
              <option value={SIN_OPERADOR}>Sin operador asignado</option>
              {operadores.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
          <Conmutador id="sedes-sin-cajas" checked={sinCajas} disabled={!hydrated} onChange={setSinCajas}>
            Sin cajas
          </Conmutador>
          <Conmutador id="sedes-sin-equipo" checked={sinEquipo} disabled={!hydrated} onChange={setSinEquipo}>
            Con cajas sin equipo
          </Conmutador>
          <p className="text-body-sm text-text-secondary sm:ml-auto" aria-live="polite">
            {visibles.length === rows.length ? `${rows.length} sedes` : `${visibles.length} de ${rows.length} sedes`}
          </p>
        </div>
      </div>

      <ResponsiveTable
        rows={visibles}
        columns={columnas}
        rowKey={(r) => r.id}
        tablaDesde="xl"
        tarjetasEnDosColumnas
        cardTitle={(r) => <EnlaceSede fila={r} />}
        cardSubtitle={(r) => `${r.codigo} · ${r.municipio}, ${r.provincia}`}
        cardBadge={(r) => <EstadoDeSedeBadge estado={r.estado} />}
        empty={
          <p className="text-body text-text-primary">
            {hayFiltros ? "Ninguna sede coincide con estos filtros." : "Todavía no hay ninguna sede."}
          </p>
        }
      />
    </>
  );
}

function Conmutador({
  id,
  checked,
  disabled,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label htmlFor={id} className="flex min-h-control-sm items-center gap-3 text-body text-text-primary">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.currentTarget.checked)}
        className="size-5 shrink-0 accent-primary"
      />
      {children}
    </label>
  );
}

function EnlaceSede({ fila }: { fila: SedeRow }): React.JSX.Element {
  return (
    <Link href={`/super-admin/sedes/${fila.id}` as Route} className="font-medium text-text-primary underline-offset-4 hover:underline">
      {fila.nombre}
    </Link>
  );
}

const SELECT =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-secondary";
