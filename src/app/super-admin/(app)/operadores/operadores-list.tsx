"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";

import { Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import type { OperatorStatus } from "@/features/network/operators";
import { useHydrated } from "@/lib/use-hydrated";
import { useFiltrosEnUrl } from "@/lib/filtros-en-url";
import { ETIQUETA_DE_OPERADOR, EstadoDeOperadorBadge } from "../_compartido/estado-de-operador";

export interface OperadorRow {
  id: string;
  nombre: string;
  contacto: string;
  telefono: string;
  estado: OperatorStatus;
  /** Ya formateada en el servidor. */
  alta: string;
  sedes: number;
  usuariosActivos: number;
  trabajadores: number;
  equipos: number;
  operacionesDelMes: number;
}

const ORDEN: Readonly<Record<OperatorStatus, number>> = { activo: 0, suspendido: 1, baja: 2 };
const BUSQUEDA: FieldSpec = { id: "operadores-busqueda", label: "Buscar operador" };
const ESTADO: FieldSpec = { id: "operadores-estado", label: "Estado" };
const TODOS = "todos";

const SELECT =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-secondary";

/**
 * El listado de operadores: búsqueda por nombre, filtro de estado y el
 * conmutador «Sin sedes», que identifica a los dados de alta que todavía no
 * administran nada.
 */
export function OperadoresList({
  rows,
  inicial = {},
}: {
  rows: readonly OperadorRow[];
  inicial?: Record<string, string | undefined>;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [texto, setTexto] = React.useState(inicial.texto ?? "");
  const [estado, setEstado] = React.useState(inicial.estado ?? TODOS);
  const [sinSedes, setSinSedes] = React.useState(inicial.sinSedes === "1");
  useFiltrosEnUrl({ texto, estado, sinSedes: sinSedes ? "1" : "" }, { estado: TODOS });

  const busqueda = texto.trim().toLowerCase();
  const visibles = rows
    .filter(
      (r) =>
        (!busqueda || r.nombre.toLowerCase().includes(busqueda) || r.contacto.toLowerCase().includes(busqueda)) &&
        (estado === TODOS || r.estado === estado) &&
        (!sinSedes || r.sedes === 0),
    )
    .slice()
    .sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado] || a.nombre.localeCompare(b.nombre, "es"));

  const columnas: readonly ResponsiveColumn<OperadorRow>[] = [
    {
      key: "operador",
      header: "Operador",
      hiddenOnCard: true,
      cell: (r) => (
        <span className="flex min-w-44 flex-col">
          <EnlaceOperador fila={r} />
          <span className="text-caption text-text-secondary">alta el {r.alta}</span>
        </span>
      ),
    },
    {
      key: "contacto",
      header: "Contacto",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="text-text-primary">{r.contacto}</span>
          <span className="pc-numeric whitespace-nowrap text-caption text-text-secondary">{r.telefono}</span>
        </span>
      ),
    },
    { key: "estado", header: "Estado", hiddenOnCard: true, cell: (r) => <EstadoDeOperadorBadge estado={r.estado} /> },
    {
      key: "sedes",
      header: "Sedes",
      numeric: true,
      cell: (r) => (r.sedes === 0 ? <span className="font-medium text-text-secondary">Sin sedes</span> : r.sedes),
    },
    {
      key: "personas",
      header: "Personas",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="whitespace-nowrap text-text-primary">
            {r.usuariosActivos} {r.usuariosActivos === 1 ? "usuario" : "usuarios"}
          </span>
          <span className="whitespace-nowrap text-caption text-text-secondary">
            {r.trabajadores} {r.trabajadores === 1 ? "trabajador" : "trabajadores"}
          </span>
        </span>
      ),
    },
    { key: "equipos", header: "Equipos", numeric: true, cell: (r) => r.equipos },
    {
      key: "operaciones",
      header: "Operaciones del mes",
      numeric: true,
      cell: (r) =>
        r.operacionesDelMes === 0 ? (
          <span className="text-text-secondary">0</span>
        ) : (
          <span className="font-semibold text-text-primary">{r.operacionesDelMes}</span>
        ),
    },
  ];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <Field {...BUSQUEDA} className="sm:w-80">
          <Input
            {...fieldAria(BUSQUEDA)}
            type="search"
            disabled={!hydrated}
            value={texto}
            onChange={(e) => setTexto(e.currentTarget.value)}
            placeholder="Nombre o persona de contacto"
            prefix={<Search className="size-[18px]" aria-hidden="true" />}
          />
        </Field>
        <Field {...ESTADO} className="sm:w-60">
          <select {...fieldAria(ESTADO)} disabled={!hydrated} value={estado} onChange={(e) => setEstado(e.currentTarget.value)} className={SELECT}>
            <option value={TODOS}>Todos los estados</option>
            {(Object.keys(ETIQUETA_DE_OPERADOR) as OperatorStatus[]).map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_DE_OPERADOR[e]}
              </option>
            ))}
          </select>
        </Field>
        <label htmlFor="operadores-sin-sedes" className="flex min-h-control items-center gap-3 text-body text-text-primary">
          <input
            id="operadores-sin-sedes"
            type="checkbox"
            checked={sinSedes}
            disabled={!hydrated}
            onChange={(e) => setSinSedes(e.currentTarget.checked)}
            className="size-5 shrink-0 accent-primary"
          />
          Sin sedes
        </label>
      </div>

      <ResponsiveTable
        rows={visibles}
        columns={columnas}
        rowKey={(r) => r.id}
        tablaDesde="xl"
        tarjetasEnDosColumnas
        cardTitle={(r) => <EnlaceOperador fila={r} />}
        cardSubtitle={(r) => `Alta el ${r.alta}`}
        cardBadge={(r) => <EstadoDeOperadorBadge estado={r.estado} />}
        empty={<p className="text-body text-text-primary">Ningún operador coincide con estos filtros.</p>}
      />
    </>
  );
}

function EnlaceOperador({ fila }: { fila: OperadorRow }): React.JSX.Element {
  return (
    <Link href={`/super-admin/operadores/${fila.id}` as Route} className="font-medium text-text-primary underline-offset-4 hover:underline">
      {fila.nombre}
    </Link>
  );
}
