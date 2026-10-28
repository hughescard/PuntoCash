"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";

import { Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import type { EstadoJornada } from "@/features/network/jornadas";
import { useHydrated } from "@/lib/use-hydrated";
import { useFiltrosEnUrl } from "@/lib/filtros-en-url";
import { Diferencia } from "@/app/admin/(app)/jornadas/formato";
import { EstadoDeJornadaBadge } from "../equipos/cajas-list";
import { SELECT, TODAS } from "../equipos/controles";

/**
 * Las jornadas de toda la red, en solo lectura.
 *
 * La ventana de fechas es obligatoria y empieza en los últimos siete días:
 * la red entera acumula demasiadas jornadas para listarlas sin acotar, y un
 * listado lento no se consulta.
 *
 * La columna de cierre es la que justifica esta pantalla: dice si la caja
 * cuadró, con qué diferencia y en qué moneda, y señala los cierres forzados
 * que nadie ha vuelto a contar. Es el dato de la conciliación.
 */

export interface JornadaDeRedRow {
  id: string;
  sedeId: string;
  sede: string;
  operadorId: string | null;
  operador: string | null;
  cajaId: string;
  caja: string;
  workerId: string;
  trabajador: string;
  /** «AAAA-MM-DD» de la apertura, en Cuba. */
  dia: string;
  /** Ya formateadas en el servidor. */
  fecha: string;
  apertura: string;
  cierre: string | null;
  estado: EstadoJornada;
  operaciones: number;
  /** Las monedas con diferencia; vacío si cuadró. `null` si no hubo cierre contado. */
  diferencias: readonly { currency: string; diferencia: number }[] | null;
  /** Un cierre forzado que nadie ha vuelto a contar. */
  sinConciliar: boolean;
}

const DESDE: FieldSpec = { id: "jor-desde", label: "Desde" };
const HASTA: FieldSpec = { id: "jor-hasta", label: "Hasta" };
const OPERADOR: FieldSpec = { id: "jor-operador", label: "Operador" };
const SEDE: FieldSpec = { id: "jor-sede", label: "Sede" };
const ESTADO: FieldSpec = { id: "jor-estado", label: "Estado" };

export function JornadasDeRedList({
  rows,
  inicial = {},
  desdePorDefecto,
  hoy,
}: {
  rows: readonly JornadaDeRedRow[];
  inicial?: Record<string, string | undefined>;
  desdePorDefecto: string;
  hoy: string;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [desde, setDesde] = React.useState(inicial.desde ?? desdePorDefecto);
  const [hasta, setHasta] = React.useState(inicial.hasta ?? hoy);
  const [operador, setOperador] = React.useState(inicial.operador ?? TODAS);
  const [sede, setSede] = React.useState(inicial.sede ?? TODAS);
  const [estado, setEstado] = React.useState(inicial.estado ?? TODAS);
  /* Llega desde la ficha de un trabajador; no tiene control propio porque la
     lista de toda la red tendría cientos de opciones. Se anuncia y se quita. */
  const [trabajador, setTrabajador] = React.useState(inicial.trabajador ?? "");
  useFiltrosEnUrl(
    { desde, hasta, operador, sede, estado, trabajador },
    { operador: TODAS, sede: TODAS, estado: TODAS, desde: desdePorDefecto, hasta: hoy },
  );

  const operadores = React.useMemo(() => {
    const vistos = new Map<string, string>();
    for (const r of rows) if (r.operadorId && r.operador) vistos.set(r.operadorId, r.operador);
    return [...vistos].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [rows]);
  const sedes = React.useMemo(() => {
    const vistos = new Map<string, string>();
    for (const r of rows) vistos.set(r.sedeId, r.sede);
    return [...vistos].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [rows]);

  const nombreDelTrabajador = trabajador ? rows.find((r) => r.workerId === trabajador)?.trabajador ?? null : null;

  const visibles = rows.filter(
    (r) =>
      r.dia >= desde &&
      r.dia <= hasta &&
      (operador === TODAS || r.operadorId === operador) &&
      (sede === TODAS || r.sedeId === sede) &&
      (estado === TODAS || r.estado === estado) &&
      (!trabajador || r.workerId === trabajador),
  );

  const columnas: readonly ResponsiveColumn<JornadaDeRedRow>[] = [
    {
      key: "caja",
      header: "Caja y sede",
      hiddenOnCard: true,
      cell: (r) => (
        <span className="flex min-w-40 flex-col">
          <Link
            href={`/super-admin/jornadas/${r.id}` as Route}
            className="font-medium text-text-primary underline-offset-4 hover:underline"
          >
            {r.caja}
          </Link>
          <Link
            href={`/super-admin/sedes/${r.sedeId}` as Route}
            className="text-caption text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
          >
            {r.sede}
          </Link>
        </span>
      ),
    },
    {
      key: "operador",
      header: "Operador",
      cell: (r) =>
        r.operadorId ? (
          <Link
            href={`/super-admin/operadores/${r.operadorId}` as Route}
            className="relative z-10 inline-block min-w-40 text-text-primary underline-offset-4 hover:underline"
          >
            {r.operador}
          </Link>
        ) : (
          <span className="text-text-secondary">Sin operador</span>
        ),
    },
    {
      key: "trabajador",
      header: "Trabajador",
      cell: (r) => (
        <Link
          href={`/super-admin/trabajadores/${r.workerId}` as Route}
          className="relative z-10 text-text-primary underline underline-offset-4 hover:text-primary"
        >
          {r.trabajador}
        </Link>
      ),
    },
    {
      key: "cuando",
      header: "Jornada",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="whitespace-nowrap text-text-primary">{r.fecha}</span>
          <span className="pc-numeric whitespace-nowrap text-caption text-text-secondary">
            {r.apertura} – {r.cierre ?? "abierta"}
          </span>
        </span>
      ),
    },
    { key: "estado", header: "Estado", hiddenOnCard: true, cell: (r) => <EstadoDeJornadaBadge estado={r.estado} /> },
    { key: "operaciones", header: "Operaciones", numeric: true, cell: (r) => r.operaciones },
    {
      key: "cierre",
      header: "Cierre",
      cell: (r) =>
        r.diferencias === null ? (
          r.estado === "abierta" ? (
            <span className="text-text-secondary">—</span>
          ) : (
            <span className="flex flex-col">
              <span className="text-text-secondary">Sin contar</span>
              <span className={r.sinConciliar ? "text-body-sm font-semibold text-warning-foreground" : "text-body-sm text-text-secondary"}>
                {r.sinConciliar ? "Pendiente de conciliar" : "Contada al abrir la siguiente"}
              </span>
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
      <div className="mb-6 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Field {...DESDE}>
            <Input {...fieldAria(DESDE)} type="date" disabled={!hydrated} value={desde} max={hasta} onChange={(e) => setDesde(e.currentTarget.value)} />
          </Field>
          <Field {...HASTA}>
            <Input {...fieldAria(HASTA)} type="date" disabled={!hydrated} value={hasta} min={desde} onChange={(e) => setHasta(e.currentTarget.value)} />
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
          <Field {...SEDE}>
            <select {...fieldAria(SEDE)} disabled={!hydrated} value={sede} onChange={(e) => setSede(e.currentTarget.value)} className={SELECT}>
              <option value={TODAS}>Todas las sedes</option>
              {sedes.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field {...ESTADO}>
            <select {...fieldAria(ESTADO)} disabled={!hydrated} value={estado} onChange={(e) => setEstado(e.currentTarget.value)} className={SELECT}>
              <option value={TODAS}>Todos los estados</option>
              <option value="abierta">Abiertas</option>
              <option value="cerrada">Cerradas</option>
              <option value="forzada">Con cierre forzado</option>
            </select>
          </Field>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          {trabajador ? (
            <p className="text-body-sm text-text-primary">
              Solo las de {nombreDelTrabajador ?? "un trabajador"}.{" "}
              <button
                type="button"
                onClick={() => setTrabajador("")}
                className="font-semibold underline underline-offset-4 hover:text-primary"
              >
                Quitar este filtro
              </button>
            </p>
          ) : null}
          <p className="text-body-sm text-text-secondary sm:ml-auto" aria-live="polite">
            {visibles.length === 1 ? "1 jornada" : `${visibles.length} jornadas`} en el periodo
          </p>
        </div>
      </div>

      <ResponsiveTable
        rows={visibles}
        columns={columnas}
        rowKey={(r) => r.id}
        tablaDesde="xl"
        tarjetasEnDosColumnas
        rowLink={(r) => ({ href: `/super-admin/jornadas/${r.id}`, label: `Ver la jornada de ${r.caja}, ${r.trabajador}, ${r.fecha}` })}
        cardTitle={(r) => <span className="font-medium text-text-primary">{r.caja}</span>}
        cardSubtitle={(r) => `${r.sede} · ${r.fecha}`}
        cardBadge={(r) => <EstadoDeJornadaBadge estado={r.estado} />}
        empty={<p className="text-body text-text-primary">Ninguna jornada coincide con estos filtros.</p>}
      />
    </>
  );
}
