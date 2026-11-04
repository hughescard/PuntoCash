"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Field, fieldAria, type FieldSpec } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import type { EstadoDeSede } from "@/features/network/assignments";
import { useHydrated } from "@/lib/use-hydrated";
import { useFiltrosEnUrl } from "@/lib/filtros-en-url";
import { EstadoDeSedeBadge } from "../_compartido/estado-de-sede";

/**
 * La actividad por sede: una fila por sede, filtrable por operador y ordenable
 * por cualquier columna. En el teléfono, donde no hay cabeceras que pulsar, se
 * ordena con «Ordenar por».
 *
 * Es un registro, no una lista de tareas: quién opera cada sede, cuánto ha
 * operado hoy, cuántas personas lo han hecho y cuál fue la última operación.
 * Por defecto va primero lo que solo PuntoCash puede resolver —las sedes sin
 * operador—, después las suspendidas y después las activas.
 */

export interface FilaEstadoDeRed {
  id: string;
  nombre: string;
  codigo: string;
  localidad: string;
  estado: EstadoDeSede;
  operadorId: string | null;
  operador: string | null;
  operacionesHoy: number;
  trabajadoresHoy: number;
  /** ISO, solo para ordenar. */
  ultimaEn: string | null;
  /** Ya formateadas en el servidor: «Hoy, 14:32» o la fecha y hora. */
  ultimaCuando: string | null;
  ultimaQuien: string | null;
}

type Clave = "estado" | "sede" | "operador" | "operaciones" | "ultima";

const PRIORIDAD: Readonly<Record<EstadoDeSede, number>> = {
  "sin-asignar": 0,
  suspendida: 1,
  "operador-suspendido": 2,
  activa: 3,
  cerrada: 4,
};

function valor(f: FilaEstadoDeRed, clave: Clave): string | number {
  switch (clave) {
    case "estado":
      return PRIORIDAD[f.estado];
    case "sede":
      return f.nombre;
    case "operador":
      return f.operador ?? "";
    case "operaciones":
      return f.operacionesHoy;
    case "ultima":
      return f.ultimaEn ?? "";
  }
}

const OPERADOR: FieldSpec = { id: "red-operador", label: "Operador" };
const SIN_OPERADOR = "sin-operador";
const TODOS = "todos";

const ORDENES: readonly { value: string; label: string }[] = [
  { value: "estado|asc", label: "Estado (sin asignar primero)" },
  { value: "sede|asc", label: "Sede (A–Z)" },
  { value: "operador|asc", label: "Operador (A–Z)" },
  { value: "operaciones|desc", label: "Más operaciones hoy" },
  { value: "ultima|desc", label: "Última operación más reciente" },
];

export function EstadoDeRed({
  filas,
  operadorInicial,
}: {
  filas: readonly FilaEstadoDeRed[];
  /** El filtro que traía la dirección (FR-AD-SCOPE-5). */
  operadorInicial?: string | undefined;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [operador, setOperador] = React.useState(operadorInicial ?? TODOS);
  const [orden, setOrden] = React.useState<{ clave: Clave; desc: boolean }>({ clave: "estado", desc: false });
  useFiltrosEnUrl({ operador }, { operador: TODOS });

  const operadores = React.useMemo(() => {
    const vistos = new Map<string, string>();
    for (const f of filas) if (f.operadorId && f.operador) vistos.set(f.operadorId, f.operador);
    return [...vistos].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [filas]);
  const haySinOperador = filas.some((f) => f.operadorId === null);

  const visibles = filas
    .filter((f) => operador === TODOS || (operador === SIN_OPERADOR ? f.operadorId === null : f.operadorId === operador))
    .slice()
    .sort((a, b) => {
      const va = valor(a, orden.clave);
      const vb = valor(b, orden.clave);
      const c = typeof va === "string" && typeof vb === "string" ? va.localeCompare(vb, "es") : Number(va) - Number(vb);
      return (orden.desc ? -c : c) || a.nombre.localeCompare(b.nombre, "es");
    });

  const ordenarPor = (clave: Clave) =>
    setOrden((o) =>
      o.clave === clave
        ? { clave, desc: !o.desc }
        : { clave, desc: !["sede", "operador", "estado"].includes(clave) },
    );

  const cabecera = (clave: Clave, texto: string, numerica = false) => (
    <button
      type="button"
      onClick={() => ordenarPor(clave)}
      className={`inline-flex items-center gap-1 uppercase outline-none hover:text-text-primary focus-visible:underline ${numerica ? "flex-row-reverse" : ""}`}
    >
      {texto}
      {orden.clave === clave ? (
        orden.desc ? <ArrowDown className="size-3.5" aria-hidden="true" /> : <ArrowUp className="size-3.5" aria-hidden="true" />
      ) : (
        <ArrowUpDown className="size-3.5 opacity-50" aria-hidden="true" />
      )}
    </button>
  );
  const sort = (clave: Clave) => (orden.clave === clave ? (orden.desc ? "descending" : "ascending") : "none");

  const columnas: readonly ResponsiveColumn<FilaEstadoDeRed>[] = [
    {
      key: "sede",
      header: cabecera("sede", "Sede"),
      cardHeader: "Sede",
      sort: sort("sede"),
      hiddenOnCard: true,
      cell: (f) => (
        <span className="flex min-w-36 flex-col">
          <EnlaceSede fila={f} />
          <span className="pc-numeric text-caption text-text-secondary">
            {f.codigo} · {municipio(f.localidad)}
          </span>
        </span>
      ),
    },
    {
      key: "operador",
      header: cabecera("operador", "Operador"),
      cardHeader: "Operador",
      sort: sort("operador"),
      cell: (f) =>
        f.operadorId ? (
          <Link
            href={`/super-admin/operadores/${f.operadorId}` as Route}
            className="text-text-primary underline-offset-4 hover:underline"
          >
            {f.operador}
          </Link>
        ) : (
          /* FR-SA-HOME-7: la única anomalía del panel que solo PuntoCash resuelve. */
          <span className="font-medium text-text-secondary">Sin operador</span>
        ),
    },
    {
      key: "estado",
      header: cabecera("estado", "Estado"),
      cardHeader: "Estado",
      sort: sort("estado"),
      hiddenOnCard: true,
      cell: (f) => <EstadoDeSedeBadge estado={f.estado} />,
    },
    {
      key: "operaciones",
      header: cabecera("operaciones", "Operaciones hoy", true),
      cardHeader: "Operaciones hoy",
      sort: sort("operaciones"),
      numeric: true,
      cell: (f) => (
        <span className="flex flex-col items-end">
          <span className={f.operacionesHoy > 0 ? "font-semibold text-text-primary" : "text-text-secondary"}>
            {f.operacionesHoy}
          </span>
          {f.trabajadoresHoy > 0 ? (
            <span className="whitespace-nowrap text-caption text-text-secondary">
              {f.trabajadoresHoy === 1 ? "1 trabajador" : `${f.trabajadoresHoy} trabajadores`}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "ultima",
      header: cabecera("ultima", "Última operación"),
      cardHeader: "Última operación",
      sort: sort("ultima"),
      cell: (f) =>
        f.ultimaCuando ? (
          <span className="flex flex-col">
            <span className="whitespace-nowrap text-text-primary">{f.ultimaCuando}</span>
            <span className="text-caption text-text-secondary">{f.ultimaQuien}</span>
          </span>
        ) : (
          <span className="text-text-secondary">Sin operaciones</span>
        ),
    },
  ];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <Field {...OPERADOR} className="sm:w-80">
          <select
            {...fieldAria(OPERADOR)}
            disabled={!hydrated}
            value={operador}
            onChange={(e) => setOperador(e.currentTarget.value)}
            className={selectClass}
          >
            <option value={TODOS}>Todos los operadores</option>
            {haySinOperador ? <option value={SIN_OPERADOR}>Sedes sin operador</option> : null}
            {operadores.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </Field>

        <Field id="red-orden" label="Ordenar por" className="sm:w-72 xl:hidden">
          <select
            id="red-orden"
            disabled={!hydrated}
            value={`${orden.clave}|${orden.desc ? "desc" : "asc"}`}
            onChange={(e) => {
              const [clave, dir] = e.currentTarget.value.split("|");
              setOrden({ clave: clave as Clave, desc: dir === "desc" });
            }}
            className={selectClass}
          >
            {ORDENES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <ResponsiveTable
        rows={visibles}
        columns={columnas}
        rowKey={(f) => f.id}
        tablaDesde="xl"
        tarjetasEnDosColumnas
        cardTitle={(f) => <EnlaceSede fila={f} />}
        cardSubtitle={(f) => `${f.codigo} · ${f.localidad}`}
        cardBadge={(f) => <EstadoDeSedeBadge estado={f.estado} />}
        empty={<p className="text-body text-text-secondary">Este operador no administra ninguna sede.</p>}
      />
    </>
  );
}

const selectClass =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-secondary";

/** «Plaza de la Revolución, La Habana» → «Plaza de la Revolución»: en la tabla basta el municipio. */
function municipio(localidad: string): string {
  return localidad.split(",")[0]!.trim();
}

function EnlaceSede({ fila }: { fila: FilaEstadoDeRed }): React.JSX.Element {
  return (
    <Link
      href={`/super-admin/sedes/${fila.id}` as Route}
      className="font-medium text-text-primary underline-offset-4 hover:underline"
    >
      {fila.nombre}
    </Link>
  );
}
