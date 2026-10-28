"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";

import { Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import type { WorkerStatus } from "@/features/network/workers";
import type { MotivoSinAcceso } from "@/features/super-admin/trabajadores";
import { useHydrated } from "@/lib/use-hydrated";
import { useFiltrosEnUrl } from "@/lib/filtros-en-url";
import { cn } from "@/lib/utils";
import { SELECT, TODAS } from "../equipos/controles";
import { EstadoDeAcceso } from "./estado-de-acceso";

/**
 * Los trabajadores de toda la red, con los filtros del requisito —operador,
 * sede y estado— y búsqueda por nombre o identificador.
 *
 * Aquí **no** hay «activos por defecto» como en Admin. La razón es distinta:
 * el administrador de una sede entra a trabajar con su gente y las bajas
 * históricas le estorban; PuntoCash entra a consultar el registro de la red,
 * y un registro que esconde la mitad por defecto no sirve para conciliar ni
 * para responder en una auditoría.
 *
 * La columna de estado dice también cuándo el bloqueo lo puso PuntoCash
 * —sede o operador suspendidos— porque eso sí lo revierte esta consola.
 */

export interface TrabajadorRow {
  id: string;
  nombre: string;
  identificador: string;
  sedeId: string;
  sede: string;
  operadorId: string | null;
  operador: string | null;
  /** Enmascarado por el dominio de autenticación; aquí nunca entero. */
  correo: string;
  estado: WorkerStatus;
  bloqueo: MotivoSinAcceso | null;
  /** Ya formateada en el servidor. */
  alta: string;
  ultimaJornada: { id: string; texto: string; abierta: boolean } | null;
}

const BUSQUEDA: FieldSpec = { id: "trb-busqueda", label: "Buscar trabajador" };
const OPERADOR: FieldSpec = { id: "trb-operador", label: "Operador" };
const SEDE: FieldSpec = { id: "trb-sede", label: "Sede" };
const ESTADO: FieldSpec = { id: "trb-estado", label: "Estado" };

export function TrabajadoresDeRedList({
  rows,
  inicial = {},
}: {
  rows: readonly TrabajadorRow[];
  inicial?: Record<string, string | undefined>;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [texto, setTexto] = React.useState(inicial.texto ?? "");
  const [operador, setOperador] = React.useState(inicial.operador ?? TODAS);
  const [sede, setSede] = React.useState(inicial.sede ?? TODAS);
  const [estado, setEstado] = React.useState(inicial.estado ?? TODAS);
  useFiltrosEnUrl({ texto, operador, sede, estado }, { operador: TODAS, sede: TODAS, estado: TODAS });

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

  const busqueda = texto.trim().toLowerCase();
  const visibles = rows.filter(
    (r) =>
      (operador === TODAS || r.operadorId === operador) &&
      (sede === TODAS || r.sedeId === sede) &&
      (estado === TODAS ||
        (estado === "activo" ? r.bloqueo === null : estado === "desactivado" ? r.estado === "desactivado" : r.bloqueo !== null)) &&
      (!busqueda || r.nombre.toLowerCase().includes(busqueda) || r.identificador.toLowerCase().includes(busqueda)),
  );

  const columnas: readonly ResponsiveColumn<TrabajadorRow>[] = [
    {
      key: "trabajador",
      header: "Trabajador",
      hiddenOnCard: true,
      cell: (r) => (
        <span className="flex min-w-40 flex-col">
          <Link
            href={`/super-admin/trabajadores/${r.id}` as Route}
            className="font-medium text-text-primary underline-offset-4 hover:underline"
          >
            {r.nombre}
          </Link>
          <span className="pc-numeric text-caption text-text-secondary">{r.identificador}</span>
        </span>
      ),
    },
    {
      key: "donde",
      header: "Sede y operador",
      cell: (r) => (
        <span className="flex min-w-40 flex-col">
          <Link
            href={`/super-admin/sedes/${r.sedeId}` as Route}
            className="text-text-primary underline-offset-4 hover:underline"
          >
            {r.sede}
          </Link>
          {r.operadorId ? (
            <Link
              href={`/super-admin/operadores/${r.operadorId}` as Route}
              className="text-caption text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
            >
              {r.operador}
            </Link>
          ) : (
            <span className="text-caption text-text-secondary">Sin operador</span>
          )}
        </span>
      ),
    },
    { key: "correo", header: "Correo de verificación", cell: (r) => <span className="text-text-secondary">{r.correo}</span> },
    {
      key: "estado",
      header: "Estado",
      hiddenOnCard: true,
      cell: (r) => <EstadoDeAcceso estado={r.estado} bloqueo={r.bloqueo} />,
    },
    { key: "alta", header: "Alta", cell: (r) => <span className="whitespace-nowrap">{r.alta}</span> },
    {
      key: "ultima-jornada",
      header: "Última jornada",
      cell: (r) =>
        r.ultimaJornada ? (
          <Link
            href={`/super-admin/jornadas/${r.ultimaJornada.id}` as Route}
            className={cn(
              "underline underline-offset-4 hover:text-primary",
              r.ultimaJornada.abierta ? "font-semibold text-text-primary" : "text-text-secondary",
            )}
          >
            {r.ultimaJornada.texto}
          </Link>
        ) : (
          <span className="text-text-secondary">Ninguna</span>
        ),
    },
  ];

  const hayFiltros = busqueda !== "" || operador !== TODAS || sede !== TODAS || estado !== TODAS;

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
              placeholder="Nombre o identificador"
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
              <option value="activo">Pueden entrar</option>
              <option value="bloqueado">No pueden entrar</option>
              <option value="desactivado">Desactivados por su administrador</option>
            </select>
          </Field>
        </div>
        <p className="text-body-sm text-text-secondary sm:ml-auto" aria-live="polite">
          {visibles.length === rows.length
            ? `${rows.length} trabajadores`
            : `${visibles.length} de ${rows.length} trabajadores`}
        </p>
      </div>

      <ResponsiveTable
        rows={visibles}
        columns={columnas}
        rowKey={(r) => r.id}
        tablaDesde="xl"
        tarjetasEnDosColumnas
        cardTitle={(r) => (
          <Link href={`/super-admin/trabajadores/${r.id}` as Route} className="underline-offset-4 hover:underline">
            {r.nombre}
          </Link>
        )}
        cardSubtitle={(r) => `${r.identificador} · ${r.sede}`}
        cardBadge={(r) => <EstadoDeAcceso estado={r.estado} bloqueo={r.bloqueo} />}
        empty={
          <p className="text-body text-text-primary">
            {hayFiltros ? "Ningún trabajador coincide con estos filtros." : "Todavía no hay trabajadores en la red."}
          </p>
        }
      />
    </>
  );
}
