"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search, SlidersHorizontal } from "lucide-react";

import { Button, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { OperationStatusBadge, OPERATION_STATUSES, type OperationStatus } from "@/components/patterns/operation-status-badge";
import { useHydrated } from "@/lib/use-hydrated";
import { useFiltrosEnUrl } from "@/lib/filtros-en-url";
import { normalizeForSearch } from "@/features/operations/services";

/**
 * El listado de operaciones con sus filtros — **FR-AD-OPS-1** y **FR-AD-OPS-2**.
 *
 * Los filtros de Worker ampliados con caja y trabajador, que allí no existen
 * porque siempre son uno. **No hay filtro de sede**: la cabecera ya lo es,
 * como en Jornadas. Se entra a cada operación pulsando su fila o su tarjeta.
 */

export interface OperacionRow {
  codigo: string;
  /** «AAAA-MM-DD» en Cuba, para el filtro de fechas. */
  dia: string;
  fecha: string;
  sede: string;
  cajaId: string;
  caja: string;
  workerId: string;
  trabajador: string;
  trabajadorVisible: boolean;
  servicio: string;
  /** En un giro, si se envió o se pagó. */
  accion: string | null;
  cliente: string;
  documento: string;
  importe: string;
  estado: OperationStatus;
  desdeKiosco: boolean;
}

const SELECT_CLASS =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-secondary";

const BUSCAR: FieldSpec = { id: "ops-buscar", label: "Buscar" };
const DESDE: FieldSpec = { id: "ops-desde", label: "Desde" };
const HASTA: FieldSpec = { id: "ops-hasta", label: "Hasta" };
const CAJA: FieldSpec = { id: "ops-caja", label: "Caja" };
const TRABAJADOR: FieldSpec = { id: "ops-trabajador", label: "Trabajador" };
const SERVICIO: FieldSpec = { id: "ops-servicio", label: "Servicio" };
const ESTADO: FieldSpec = { id: "ops-estado", label: "Estado" };

const POR_PAGINA = 50;

export function OperacionesList({
  rows,
  inicial = {},
  desdePorDefecto,
  hoy,
  varias,
}: {
  rows: readonly OperacionRow[];
  /** Los filtros que llegan en la dirección (FR-AD-SCOPE-5). */
  inicial?: Record<string, string | undefined>;
  desdePorDefecto: string;
  hoy: string;
  /** Más de una sede a la vista: la caja se nombra con su sede. */
  varias: boolean;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [buscar, setBuscar] = React.useState(inicial.q ?? "");
  const [desde, setDesde] = React.useState(inicial.desde ?? desdePorDefecto);
  const [hasta, setHasta] = React.useState(inicial.hasta ?? hoy);
  const [caja, setCaja] = React.useState(inicial.caja ?? "todas");
  const [trabajador, setTrabajador] = React.useState(inicial.trabajador ?? "todos");
  const [servicio, setServicio] = React.useState(inicial.servicio ?? "todos");
  const [estado, setEstado] = React.useState<OperationStatus | "todos">((inicial.estado as OperationStatus | undefined) ?? "todos");
  useFiltrosEnUrl(
    { q: buscar, desde, hasta, caja, trabajador, servicio, estado },
    { desde: desdePorDefecto, hasta: hoy, caja: "todas", trabajador: "todos", servicio: "todos", estado: "todos" },
  );
  const [verFiltros, setVerFiltros] = React.useState(false);
  /* La página vuelve a la primera cuando cambia un filtro: se guarda junto a
     la firma de los filtros con que se amplió. */
  const firma = JSON.stringify([buscar, desde, hasta, caja, trabajador, servicio, estado]);
  const [pagina, setPagina] = React.useState({ firma, n: POR_PAGINA });
  const mostradas = pagina.firma === firma ? pagina.n : POR_PAGINA;

  const activos =
    Number(desde !== desdePorDefecto) + Number(hasta !== hoy) + Number(caja !== "todas") +
    Number(trabajador !== "todos") + Number(servicio !== "todos") + Number(estado !== "todos");

  const cajas = unicos(rows.map((r) => [r.cajaId, varias ? `${r.caja} · ${r.sede}` : r.caja]));
  const trabajadores = unicos(rows.map((r) => [r.workerId, r.trabajador]));
  const servicios = [...new Set(rows.map((r) => r.servicio))];

  const q = normalizeForSearch(buscar);
  const visibles = rows.filter((r) => {
    /* Buscar por código encuentra la operación sea de cuando sea: quien busca
       un código concreto no tiene por qué saber su fecha. */
    if (q) return normalizeForSearch(`${r.codigo} ${r.cliente} ${r.documento}`).includes(q);
    if (r.dia < desde || r.dia > hasta) return false;
    if (caja !== "todas" && r.cajaId !== caja) return false;
    if (trabajador !== "todos" && r.workerId !== trabajador) return false;
    if (servicio !== "todos" && r.servicio !== servicio) return false;
    if (estado !== "todos" && r.estado !== estado) return false;
    return true;
  });

  const limpiar = () => {
    setBuscar("");
    setDesde(desdePorDefecto);
    setHasta(hoy);
    setCaja("todas");
    setTrabajador("todos");
    setServicio("todos");
    setEstado("todos");
  };

  const columnas: readonly ResponsiveColumn<OperacionRow>[] = [
    {
      key: "operacion",
      header: "Operación",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="pc-numeric whitespace-nowrap font-semibold text-text-primary">{r.codigo}</span>
          <span className="pc-numeric whitespace-nowrap text-caption text-text-secondary">{r.fecha}</span>
        </span>
      ),
      hiddenOnCard: true,
    },
    {
      key: "servicio",
      header: "Servicio",
      cell: (r) => (
        <span className="flex flex-col">
          <span>
            {r.servicio}
            {r.accion ? <span className="text-text-secondary"> · {r.accion}</span> : null}
          </span>
          {r.desdeKiosco ? <span className="text-caption text-text-secondary">Desde el kiosco</span> : null}
        </span>
      ),
    },
    { key: "cliente", header: "Cliente", cell: (r) => r.cliente },
    {
      key: "importe",
      header: "Importe",
      cell: (r) => <span className="pc-numeric lg:whitespace-nowrap">{r.importe}</span>,
    },
    {
      key: "caja",
      header: "Caja y trabajador",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="lg:whitespace-nowrap">
            {r.caja}
            {varias ? <span className="text-text-secondary"> · {r.sede}</span> : null}
          </span>
          {r.trabajadorVisible ? (
            <Link
              href={`/admin/trabajadores/${r.workerId}` as Route}
              className="relative z-10 w-fit text-text-secondary underline underline-offset-4 hover:text-primary"
            >
              {r.trabajador}
            </Link>
          ) : (
            <span className="text-text-secondary">{r.trabajador}</span>
          )}
        </span>
      ),
    },
    { key: "estado", header: "Estado", cell: (r) => <OperationStatusBadge status={r.estado} />, hiddenOnCard: true },
  ];

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="mb-4 w-full sm:hidden"
        aria-expanded={verFiltros}
        aria-controls="operaciones-filtros"
        onClick={() => setVerFiltros((v) => !v)}
      >
        <SlidersHorizontal aria-hidden="true" />
        {verFiltros ? "Ocultar filtros" : activos > 0 ? `Filtros (${activos})` : "Filtros"}
      </Button>

      <div
        id="operaciones-filtros"
        className={cn("mb-6 flex-col gap-4 sm:flex", verFiltros ? "flex" : "hidden")}
      >
        <Field {...BUSCAR} className="sm:max-w-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
            <Input
              {...fieldAria(BUSCAR)}
              type="search"
              value={buscar}
              disabled={!hydrated}
              placeholder="Código, cliente o documento"
              onChange={(e) => setBuscar(e.target.value)}
              className="pl-11"
            />
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Field {...DESDE}>
            <Input {...fieldAria(DESDE)} type="date" value={desde} max={hasta} disabled={!hydrated || Boolean(q)} onChange={(e) => setDesde(e.target.value)} className="pc-numeric" />
          </Field>
          <Field {...HASTA}>
            <Input {...fieldAria(HASTA)} type="date" value={hasta} min={desde} max={hoy} disabled={!hydrated || Boolean(q)} onChange={(e) => setHasta(e.target.value)} className="pc-numeric" />
          </Field>
          <Field {...CAJA}>
            <select {...fieldAria(CAJA)} value={caja} disabled={!hydrated || Boolean(q)} onChange={(e) => setCaja(e.target.value)} className={SELECT_CLASS}>
              <option value="todas">Todas las cajas</option>
              {cajas.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field {...TRABAJADOR}>
            <select {...fieldAria(TRABAJADOR)} value={trabajador} disabled={!hydrated || Boolean(q)} onChange={(e) => setTrabajador(e.target.value)} className={SELECT_CLASS}>
              <option value="todos">Todos</option>
              {trabajadores.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field {...SERVICIO}>
            <select {...fieldAria(SERVICIO)} value={servicio} disabled={!hydrated || Boolean(q)} onChange={(e) => setServicio(e.target.value)} className={SELECT_CLASS}>
              <option value="todos">Todos</option>
              {servicios.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field {...ESTADO}>
            <select {...fieldAria(ESTADO)} value={estado} disabled={!hydrated || Boolean(q)} onChange={(e) => setEstado(e.target.value as OperationStatus | "todos")} className={SELECT_CLASS}>
              <option value="todos">Todos</option>
              {OPERATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {q ? (
          <p className="text-body-sm text-text-secondary">
            Buscando en todas las fechas; los demás filtros no se aplican mientras buscas.
          </p>
        ) : null}
      </div>

      <ResponsiveTable
        rows={visibles.slice(0, mostradas)}
        columns={columnas}
        rowKey={(r) => r.codigo}
        rowLink={(r) => ({ href: `/admin/operaciones/${r.codigo}`, label: `Ver operación ${r.codigo}` })}
        cardTitle={(r) => <span className="pc-numeric">{r.codigo}</span>}
        cardSubtitle={(r) => r.fecha}
        cardBadge={(r) => <OperationStatusBadge status={r.estado} />}
        empty={
          rows.length === 0 ? (
            <p className="text-body text-text-secondary">Tus cajas todavía no han registrado ninguna operación.</p>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="text-body text-text-secondary">Ninguna operación coincide con esos filtros.</p>
              <Button variant="secondary" size="sm" onClick={limpiar}>
                Quitar los filtros
              </Button>
            </div>
          )
        }
      />

      {visibles.length > 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-body-sm text-text-secondary">
            {Math.min(mostradas, visibles.length)} de {visibles.length} operaciones
          </p>
          {visibles.length > mostradas ? (
            <Button variant="secondary" onClick={() => setPagina({ firma, n: mostradas + POR_PAGINA })}>
              Mostrar {Math.min(POR_PAGINA, visibles.length - mostradas)} más
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function unicos(pares: readonly (readonly [string, string])[]): [string, string][] {
  const m = new Map<string, string>();
  for (const [id, nombre] of pares) m.set(id, nombre);
  return [...m].sort((a, b) => a[1].localeCompare(b[1], "es"));
}
