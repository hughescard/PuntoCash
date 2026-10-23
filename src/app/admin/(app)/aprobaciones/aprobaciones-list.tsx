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
import type { EstadoSolicitud, TipoSolicitud } from "@/features/network/aprobaciones";
import { DiferenciaDeApertura } from "../jornadas/formato";
import { EstadoSolicitudBadge } from "./formato";

/**
 * La bandeja con sus filtros — **FR-AD-APR-2** a **FR-AD-APR-4** y
 * **FR-AD-APR-13**.
 *
 * Filtros de tipo, caja, trabajador y fechas. **No hay filtro de sede**: la
 * cabecera ya lo es, como en Jornadas y Operaciones. Se entra a cada solicitud
 * pulsando su fila o su tarjeta.
 */

export interface SolicitudRow {
  id: string;
  tipo: TipoSolicitud;
  tipoLabel: string;
  dia: string;
  fecha: string;
  sede: string;
  cajaId: string;
  caja: string;
  workerId: string;
  trabajador: string;
  currency: string;
  diferencia: number;
  motivo: string;
  antiguedad: string;
  estado: EstadoSolicitud;
  resolucion: { por: string; fecha: string } | null;
}

const SELECT_CLASS =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-secondary";

const TIPO: FieldSpec = { id: "apr-tipo", label: "Tipo" };
const CAJA: FieldSpec = { id: "apr-caja", label: "Caja" };
const TRABAJADOR: FieldSpec = { id: "apr-trabajador", label: "Trabajador" };
const DESDE: FieldSpec = { id: "apr-desde", label: "Desde" };
const HASTA: FieldSpec = { id: "apr-hasta", label: "Hasta" };

const TIPOS: readonly { value: TipoSolicitud | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ajuste", label: "Ajuste de efectivo" },
  { value: "cierre", label: "Diferencia de cierre" },
  { value: "apertura", label: "Diferencia de apertura" },
];

export function AprobacionesList({
  rows,
  resueltas,
  hayAlguna,
  varias,
  inicial = {},
}: {
  /** Los filtros que llegan en la dirección (FR-AD-SCOPE-5). */
  inicial?: Record<string, string | undefined>;
  rows: readonly SolicitudRow[];
  resueltas: boolean;
  /** Si existe alguna solicitud, de cualquier estado: decide qué vacío se dice. */
  hayAlguna: boolean;
  varias: boolean;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [tipo, setTipo] = React.useState<TipoSolicitud | "todos">((inicial.tipo as TipoSolicitud | undefined) ?? "todos");
  const [caja, setCaja] = React.useState(inicial.caja ?? "todas");
  const [trabajador, setTrabajador] = React.useState(inicial.trabajador ?? "todos");
  const [desde, setDesde] = React.useState(inicial.desde ?? "");
  const [hasta, setHasta] = React.useState(inicial.hasta ?? "");
  useFiltrosEnUrl({ tipo, caja, trabajador, desde, hasta }, { tipo: "todos", caja: "todas", trabajador: "todos" });
  const [verFiltros, setVerFiltros] = React.useState(false);

  const activos = Number(tipo !== "todos") + Number(caja !== "todas") + Number(trabajador !== "todos") + Number(Boolean(desde)) + Number(Boolean(hasta));
  const cajas = unicos(rows.map((r) => [r.cajaId, varias ? `${r.caja} · ${r.sede}` : r.caja]));
  const trabajadores = unicos(rows.map((r) => [r.workerId, r.trabajador]));

  const visibles = rows.filter((r) => {
    if (tipo !== "todos" && r.tipo !== tipo) return false;
    if (caja !== "todas" && r.cajaId !== caja) return false;
    if (trabajador !== "todos" && r.workerId !== trabajador) return false;
    if (desde && r.dia < desde) return false;
    if (hasta && r.dia > hasta) return false;
    return true;
  });

  const limpiar = () => {
    setTipo("todos");
    setCaja("todas");
    setTrabajador("todos");
    setDesde("");
    setHasta("");
  };

  const columnas: ResponsiveColumn<SolicitudRow>[] = [
    {
      key: "solicitud",
      header: "Solicitud",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="font-semibold text-text-primary">{r.tipoLabel}</span>
          <span className="pc-numeric whitespace-nowrap text-caption text-text-secondary">{r.fecha}</span>
        </span>
      ),
      hiddenOnCard: true,
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
          <span className="text-text-secondary">{r.trabajador}</span>
        </span>
      ),
    },
    {
      /* FR-AD-APR-6: el signo y el motivo del trabajador, juntos y como él los dejó. */
      key: "diferencia",
      header: "Diferencia y motivo",
      cell: (r) => (
        <span className="flex flex-col">
          <DiferenciaDeApertura currency={r.currency} diferencia={r.diferencia} motivo={r.motivo} />
          <span className="text-body-sm text-text-secondary">{r.motivo}</span>
        </span>
      ),
    },
    resueltas
      ? {
          key: "resolucion",
          header: "Resolución",
          cell: (r) => (
            <span className="flex flex-col items-start gap-1">
              <EstadoSolicitudBadge estado={r.estado} />
              {r.resolucion ? (
                <span className="text-caption text-text-secondary">
                  {r.resolucion.por} · {r.resolucion.fecha}
                </span>
              ) : null}
            </span>
          ),
        }
      : {
          key: "antiguedad",
          header: "Antigüedad",
          cell: (r) => <span className="whitespace-nowrap">{r.antiguedad}</span>,
        },
  ];

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="mb-4 w-full sm:hidden"
        aria-expanded={verFiltros}
        aria-controls="aprobaciones-filtros"
        onClick={() => setVerFiltros((v) => !v)}
      >
        <SlidersHorizontal aria-hidden="true" />
        {verFiltros ? "Ocultar filtros" : activos > 0 ? `Filtros (${activos})` : "Filtros"}
      </Button>

      <div
        id="aprobaciones-filtros"
        className={cn("mb-6 gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-5", verFiltros ? "grid" : "hidden")}
      >
        <Field {...TIPO}>
          <select {...fieldAria(TIPO)} value={tipo} disabled={!hydrated} onChange={(e) => setTipo(e.target.value as TipoSolicitud | "todos")} className={SELECT_CLASS}>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
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
        <Field {...DESDE}>
          <Input {...fieldAria(DESDE)} type="date" value={desde} max={hasta || undefined} disabled={!hydrated} onChange={(e) => setDesde(e.target.value)} className="pc-numeric" />
        </Field>
        <Field {...HASTA}>
          <Input {...fieldAria(HASTA)} type="date" value={hasta} min={desde || undefined} disabled={!hydrated} onChange={(e) => setHasta(e.target.value)} className="pc-numeric" />
        </Field>
      </div>

      <ResponsiveTable
        rows={visibles}
        columns={columnas}
        rowKey={(r) => r.id}
        rowLink={(r) => ({ href: `/admin/aprobaciones/${r.id}`, label: `Ver solicitud: ${r.tipoLabel}, ${r.caja}, ${r.trabajador}, ${r.fecha}` })}
        cardTitle={(r) => r.tipoLabel}
        cardSubtitle={(r) => r.fecha}
        cardBadge={(r) => <EstadoSolicitudBadge estado={r.estado} />}
        empty={
          rows.length === 0 ? (
            <p className="text-body text-text-secondary">
              {!hayAlguna
                ? "Tus trabajadores todavía no han registrado ninguna diferencia."
                : resueltas
                ? "Todavía no se ha resuelto ninguna solicitud."
                : hayAlguna
                  ? "No tienes solicitudes pendientes."
                  : "Tus trabajadores todavía no han registrado ninguna diferencia."}
            </p>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="text-body text-text-secondary">Ninguna solicitud coincide con los filtros.</p>
              <Button variant="secondary" size="sm" onClick={limpiar}>
                Quitar los filtros
              </Button>
            </div>
          )
        }
      />

      {!resueltas && rows.length === 0 && hayAlguna ? (
        <p className="mt-4 text-body-sm text-text-secondary">
          Las que ya resolviste están en{" "}
          <Link href={"/admin/aprobaciones?pestana=resueltas" as Route} className="font-semibold text-primary underline underline-offset-4">
            Resueltas
          </Link>
          .
        </p>
      ) : null}
    </>
  );
}

function unicos(pares: readonly (readonly [string, string])[]): [string, string][] {
  const m = new Map<string, string>();
  for (const [id, nombre] of pares) m.set(id, nombre);
  return [...m].sort((a, b) => a[1].localeCompare(b[1], "es"));
}
