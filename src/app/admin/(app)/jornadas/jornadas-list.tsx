"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";

import { SlidersHorizontal } from "lucide-react";

import { Button, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { useHydrated } from "@/lib/use-hydrated";
import { useFiltrosEnUrl } from "@/lib/filtros-en-url";
import type { EstadoJornada } from "@/features/network/jornadas";
import { Diferencia, DiferenciaDeApertura, EstadoBadge } from "./formato";

/**
 * El listado de jornadas con sus filtros — **FR-AD-JOR-1** a **FR-AD-JOR-3**.
 *
 * Filtran en el cliente, como Trabajadores: el servidor ya entrega solo las
 * del alcance (y de la sede elegida en la cabecera), y son pocas filas por
 * semana. **No hay filtro de sede**: la cabecera ya lo es, y dos filtros de
 * sede en la misma pantalla podrían decir cosas distintas.
 */

export interface JornadaRow {
  id: string;
  sede: string;
  cajaId: string;
  caja: string;
  workerId: string;
  trabajador: string;
  /** Si su ficha está en el alcance: un trabajador reasignado fuera ya no lo está. */
  trabajadorVisible: boolean;
  /** «AAAA-MM-DD» de la apertura, en Cuba. */
  dia: string;
  fecha: string;
  apertura: string;
  cierre: string | null;
  estado: EstadoJornada;
  operaciones: number;
  /** Las monedas con diferencia; vacío si cuadró. `null` si no hubo cierre contado. */
  diferencias: readonly { currency: string; diferencia: number }[] | null;
  /** Lo contado al abrir que no coincide con el cierre anterior. `null` si no hay cierre anterior. */
  alAbrir: readonly { currency: string; diferencia: number; motivo?: string }[] | null;
  /** Solo en un cierre forzado: si ya se contó al abrir la siguiente. */
  conciliacion: "pendiente" | "contada" | null;
}

const SELECT_CLASS =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-secondary";

const DESDE: FieldSpec = { id: "jor-desde", label: "Desde" };
const HASTA: FieldSpec = { id: "jor-hasta", label: "Hasta" };
const CAJA: FieldSpec = { id: "jor-caja", label: "Caja" };
const TRABAJADOR: FieldSpec = { id: "jor-trabajador", label: "Trabajador" };
const ESTADO: FieldSpec = { id: "jor-estado", label: "Estado" };

const ESTADOS: readonly { value: EstadoJornada | "todas"; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "abierta", label: "Abiertas" },
  { value: "cerrada", label: "Cerradas" },
  { value: "forzada", label: "Cierres forzados" },
];

export function JornadasList({
  rows,
  inicial = {},
  desdePorDefecto,
  hoy,
  varias,
}: {
  rows: readonly JornadaRow[];
  /** Los filtros que llegan en la dirección (FR-AD-SCOPE-5). */
  inicial?: Record<string, string | undefined>;
  desdePorDefecto: string;
  hoy: string;
  /** Más de una sede a la vista: la caja se nombra con su sede. */
  varias: boolean;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [desde, setDesde] = React.useState(inicial.desde ?? desdePorDefecto);
  const [hasta, setHasta] = React.useState(inicial.hasta ?? hoy);
  const [caja, setCaja] = React.useState(inicial.caja ?? "todas");
  const [trabajador, setTrabajador] = React.useState(inicial.trabajador ?? "todos");
  const [estado, setEstado] = React.useState<EstadoJornada | "todas">((inicial.estado as EstadoJornada | undefined) ?? "todas");
  const [conDiferencia, setConDiferencia] = React.useState(inicial.diferencia === "1");
  useFiltrosEnUrl(
    { desde, hasta, caja, trabajador, estado, diferencia: conDiferencia ? "1" : "" },
    { desde: desdePorDefecto, hasta: hoy, caja: "todas", trabajador: "todos", estado: "todas" },
  );
  /* FR-AD-SHELL-15: en el teléfono, los filtros detrás de un control. */
  const [verFiltros, setVerFiltros] = React.useState(false);
  const activos =
    Number(desde !== desdePorDefecto) + Number(hasta !== hoy) + Number(caja !== "todas") +
    Number(trabajador !== "todos") + Number(estado !== "todas") + Number(conDiferencia);

  const cajas = unicos(rows.map((r) => [r.cajaId, varias ? `${r.caja} · ${r.sede}` : r.caja]));
  const trabajadores = unicos(rows.map((r) => [r.workerId, r.trabajador]));

  const visibles = rows.filter((r) => {
    /* Una abierta se ve siempre, empiece cuando empiece: es lo que pide atención. */
    if (r.estado !== "abierta" && (r.dia < desde || r.dia > hasta)) return false;
    if (caja !== "todas" && r.cajaId !== caja) return false;
    if (trabajador !== "todos" && r.workerId !== trabajador) return false;
    if (estado !== "todas" && r.estado !== estado) return false;
    if (conDiferencia && !((r.diferencias?.length ?? 0) > 0 || (r.alAbrir?.length ?? 0) > 0)) return false;
    return true;
  });

  const limpiar = () => {
    setDesde(desdePorDefecto);
    setHasta(hoy);
    setCaja("todas");
    setTrabajador("todos");
    setEstado("todas");
    setConDiferencia(false);
  };

  const columnas: readonly ResponsiveColumn<JornadaRow>[] = [
    { key: "caja", header: "Caja", cell: (r) => <Caja row={r} varias={varias} />, hiddenOnCard: true },
    { key: "trabajador", header: "Trabajador", cell: (r) => <Trabajador row={r} /> },
    { key: "fecha", header: "Fecha", cell: (r) => <span className="whitespace-nowrap">{r.fecha}</span> },
    {
      key: "horario",
      header: "Apertura y cierre",
      cell: (r) => (
        <span className="pc-numeric whitespace-nowrap text-text-secondary">
          {r.apertura} – {r.cierre ?? "…"}
        </span>
      ),
    },
    { key: "estado", header: "Estado", cell: (r) => <EstadoBadge estado={r.estado} />, hiddenOnCard: true },
    { key: "ops", header: "Operaciones", numeric: true, cell: (r) => <span className="pc-numeric">{r.operaciones}</span> },
    {
      key: "alAbrir",
      header: "Al abrir",
      cell: (r) =>
        r.alAbrir === null ? (
          <span className="text-text-secondary">—</span>
        ) : r.alAbrir.length === 0 ? (
          <span className="text-text-secondary">Coincide</span>
        ) : (
          <span className="flex flex-col">
            {r.alAbrir.map((d) => (
              <DiferenciaDeApertura key={d.currency} currency={d.currency} diferencia={d.diferencia} motivo={d.motivo} />
            ))}
          </span>
        ),
    },
    {
      key: "diferencia",
      header: "Cierre",
      cell: (r) =>
        r.diferencias === null ? (
          r.estado === "abierta" ? (
            <span className="text-text-secondary">—</span>
          ) : (
            <span className="flex flex-col">
              <span className="text-text-secondary">Sin contar</span>
              {r.conciliacion === "pendiente" ? (
                <span className="text-body-sm font-semibold text-warning-foreground">Pendiente de conciliar</span>
              ) : (
                <span className="text-body-sm text-text-secondary">Contada al abrir la siguiente</span>
              )}
            </span>
          )
        ) : r.diferencias.length === 0 ? (
          <span className="font-semibold text-text-primary">Cuadrada</span>
        ) : (
          <span className="flex flex-col">
            {r.diferencias.map((d) => (
              <Diferencia key={d.currency} currency={d.currency} diferencia={d.diferencia} />
            ))}
          </span>
        ),
    },
  ];

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="mb-4 w-full sm:hidden"
        aria-expanded={verFiltros}
        aria-controls="jornadas-filtros"
        onClick={() => setVerFiltros((v) => !v)}
      >
        <SlidersHorizontal aria-hidden="true" />
        {verFiltros ? "Ocultar filtros" : activos > 0 ? `Filtros (${activos})` : "Filtros"}
      </Button>
      <div
        id="jornadas-filtros"
        className={cn(
          "mb-6 gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:items-end",
          verFiltros ? "grid" : "hidden",
        )}
      >
        <Field {...DESDE}>
          <Input {...fieldAria(DESDE)} type="date" value={desde} max={hasta} disabled={!hydrated} onChange={(e) => setDesde(e.target.value)} className="pc-numeric" />
        </Field>
        <Field {...HASTA}>
          <Input {...fieldAria(HASTA)} type="date" value={hasta} min={desde} max={hoy} disabled={!hydrated} onChange={(e) => setHasta(e.target.value)} className="pc-numeric" />
        </Field>
        <Field {...CAJA}>
          <select {...fieldAria(CAJA)} value={caja} disabled={!hydrated} onChange={(e) => setCaja(e.target.value)} className={SELECT_CLASS}>
            <option value="todas">Todas las cajas</option>
            {cajas.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field {...TRABAJADOR}>
          <select {...fieldAria(TRABAJADOR)} value={trabajador} disabled={!hydrated} onChange={(e) => setTrabajador(e.target.value)} className={SELECT_CLASS}>
            <option value="todos">Todos</option>
            {trabajadores.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field {...ESTADO}>
          <select {...fieldAria(ESTADO)} value={estado} disabled={!hydrated} onChange={(e) => setEstado(e.target.value as EstadoJornada | "todas")} className={SELECT_CLASS}>
            {ESTADOS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex h-control items-center gap-3 text-body text-text-primary">
          <input
            type="checkbox"
            checked={conDiferencia}
            disabled={!hydrated}
            onChange={(e) => setConDiferencia(e.target.checked)}
            className="size-5 shrink-0 accent-primary"
          />
          Solo con diferencia
        </label>
      </div>

      <ResponsiveTable
        rows={visibles}
        columns={columnas}
        rowKey={(r) => r.id}
        cardTitle={(r) => <Caja row={r} varias={varias} />}
        rowLink={(r) => ({ href: `/admin/jornadas/${r.id}`, label: `Ver jornada de ${r.caja}, ${r.trabajador}, ${r.fecha}` })}
        cardBadge={(r) => <EstadoBadge estado={r.estado} />}
        empty={
          rows.length === 0 ? (
            <p className="text-body text-text-secondary">Tus cajas todavía no han abierto ninguna jornada.</p>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-body text-text-secondary">Ninguna jornada coincide con esos filtros.</p>
              <Button variant="secondary" size="sm" onClick={limpiar}>
                Quitar los filtros
              </Button>
            </div>
          )
        }
      />
    </>
  );
}

/**
 * **FR-AD-JOR-1**: una jornada no tiene nombre propio —se reconoce por su caja,
 * su trabajador y su fecha—, así que ninguno de esos datos es el enlace a ella:
 * quien toca la caja espera ir a la caja, y quien toca el trabajador, a su
 * ficha. Se entra tocando la fila o la tarjeta entera (`rowLink`).
 */
function Caja({ row, varias }: { row: JornadaRow; varias: boolean }): React.JSX.Element {
  return (
    <span className="font-semibold text-text-primary">
      {row.caja}
      {varias ? <span className="font-normal text-text-secondary"> · {row.sede}</span> : null}
    </span>
  );
}

function Trabajador({ row }: { row: JornadaRow }): React.JSX.Element {
  return row.trabajadorVisible ? (
    <Link href={`/admin/trabajadores/${row.workerId}` as Route} className="relative z-10 text-text-primary underline underline-offset-4 hover:text-primary">
      {row.trabajador}
    </Link>
  ) : (
    <>{row.trabajador}</>
  );
}

function unicos(pares: readonly (readonly [string, string])[]): [string, string][] {
  const m = new Map<string, string>();
  for (const [id, nombre] of pares) m.set(id, nombre);
  return [...m].sort((a, b) => a[1].localeCompare(b[1], "es"));
}
