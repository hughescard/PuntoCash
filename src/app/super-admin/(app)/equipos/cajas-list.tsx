"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";

import { Badge, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import type { RegisterStatus } from "@/features/network/registers";
import type { EstadoJornada } from "@/features/network/jornadas";
import { useHydrated } from "@/lib/use-hydrated";
import { useFiltrosEnUrl } from "@/lib/filtros-en-url";
import { Conmutador, SELECT, TODAS } from "./controles";

/**
 * Las cajas de toda la red.
 *
 * El requisito enumera diez datos por fila. A 1440 no caben diez columnas
 * legibles, así que van agrupados en seis: la caja con su sede, el operador,
 * el estado de la caja, el equipo con su vinculación, la jornada y la última
 * actividad. Es la misma solución que el listado de Sedes.
 *
 * El contacto del operador no se repite en cada fila: su nombre enlaza a su
 * ficha, donde están la persona de contacto, el teléfono y el correo. Meter
 * dos columnas más por un dato que casi nunca se usa haría ilegible lo que sí.
 *
 * Las **retiradas** no se muestran por defecto —son historia, no inventario—
 * pero están a un conmutador, porque sus operaciones siguen consultándose.
 */

export interface CajaRow {
  id: string;
  nombre: string;
  sedeId: string;
  sede: string;
  codigoSede: string;
  provincia: string;
  operadorId: string | null;
  operador: string | null;
  estado: RegisterStatus;
  /** Ya formateado en el servidor. */
  retiro: { fecha: string; motivo: string } | null;
  equipo: { id: string; label: string; vinculado: string; vinculadoPor: string } | null;
  jornada: { id: string; estado: EstadoJornada; trabajador: string; fecha: string } | null;
  actividad: string | null;
}

const BUSQUEDA: FieldSpec = { id: "cajas-busqueda", label: "Buscar caja o equipo" };
const OPERADOR: FieldSpec = { id: "cajas-operador", label: "Operador" };
const SEDE: FieldSpec = { id: "cajas-sede", label: "Sede" };
const PROVINCIA: FieldSpec = { id: "cajas-provincia", label: "Provincia" };
const VINCULO: FieldSpec = { id: "cajas-vinculo", label: "Vínculo" };

export function CajasDeRedList({
  rows,
  inicial = {},
}: {
  rows: readonly CajaRow[];
  inicial?: Record<string, string | undefined>;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [texto, setTexto] = React.useState(inicial.texto ?? "");
  const [operador, setOperador] = React.useState(inicial.operador ?? TODAS);
  const [sede, setSede] = React.useState(inicial.sede ?? TODAS);
  const [provincia, setProvincia] = React.useState(inicial.provincia ?? TODAS);
  const [vinculo, setVinculo] = React.useState(inicial.vinculo ?? TODAS);
  const [retiradas, setRetiradas] = React.useState(inicial.retiradas === "1");
  useFiltrosEnUrl(
    { texto, operador, sede, provincia, vinculo, retiradas: retiradas ? "1" : "" },
    { operador: TODAS, sede: TODAS, provincia: TODAS, vinculo: TODAS },
  );

  const operadores = React.useMemo(() => opciones(rows, (r) => [r.operadorId, r.operador]), [rows]);
  const sedes = React.useMemo(() => opciones(rows, (r) => [r.sedeId, r.sede]), [rows]);
  const provincias = React.useMemo(
    () => [...new Set(rows.map((r) => r.provincia))].sort((a, b) => a.localeCompare(b, "es")),
    [rows],
  );

  const busqueda = texto.trim().toLowerCase();
  const visibles = rows
    .filter(
      (r) =>
        (retiradas || r.estado === "activa") &&
        (operador === TODAS || r.operadorId === operador) &&
        (sede === TODAS || r.sedeId === sede) &&
        (provincia === TODAS || r.provincia === provincia) &&
        (vinculo === TODAS || (vinculo === "con" ? r.equipo !== null : r.equipo === null)) &&
        (!busqueda ||
          r.nombre.toLowerCase().includes(busqueda) ||
          r.sede.toLowerCase().includes(busqueda) ||
          (r.equipo?.id.toLowerCase().includes(busqueda) ?? false)),
    )
    .slice()
    .sort((a, b) => a.sede.localeCompare(b.sede, "es") || a.nombre.localeCompare(b.nombre, "es"));

  const columnas: readonly ResponsiveColumn<CajaRow>[] = [
    {
      key: "caja",
      header: "Caja",
      hiddenOnCard: true,
      cell: (r) => (
        <span className="flex min-w-44 flex-col">
          <span className="font-medium text-text-primary">{r.nombre}</span>
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
            className="text-text-primary underline-offset-4 hover:underline"
          >
            {r.operador}
          </Link>
        ) : (
          <span className="text-text-secondary">Sin operador</span>
        ),
    },
    {
      key: "estado",
      header: "Estado",
      hiddenOnCard: true,
      cell: (r) =>
        r.estado === "activa" ? (
          <Badge variant="success">Activa</Badge>
        ) : (
          <span className="flex flex-col gap-1">
            <Badge variant="neutral">Retirada</Badge>
            {r.retiro ? (
              <span className="text-caption text-text-secondary">
                el {r.retiro.fecha}
                {r.retiro.motivo ? ` · ${r.retiro.motivo}` : ""}
              </span>
            ) : null}
          </span>
        ),
    },
    {
      key: "equipo",
      header: "Equipo",
      cell: (r) =>
        r.equipo ? (
          <span className="flex flex-col">
            <span className="pc-numeric text-text-primary">{r.equipo.id}</span>
            <span className="text-caption text-text-secondary">
              {r.equipo.label} · vinculado el {r.equipo.vinculado} por {r.equipo.vinculadoPor}
            </span>
          </span>
        ) : (
          <span className="text-warning-foreground">Sin equipo</span>
        ),
    },
    {
      key: "jornada",
      header: "Jornada",
      cell: (r) =>
        r.jornada ? (
          <span className="flex flex-col items-start gap-1">
            <EstadoDeJornadaBadge estado={r.jornada.estado} />
            <Link
              href={`/super-admin/jornadas/${r.jornada.id}` as Route}
              className="text-caption text-text-secondary underline-offset-4 hover:text-text-primary hover:underline"
            >
              {r.jornada.trabajador} · {r.jornada.fecha}
            </Link>
          </span>
        ) : (
          <span className="text-text-secondary">Nunca se abrió</span>
        ),
    },
    {
      key: "actividad",
      header: "Última actividad",
      cell: (r) =>
        r.actividad ? (
          <span className="whitespace-nowrap text-text-secondary">{r.actividad}</span>
        ) : (
          <span className="text-text-secondary">—</span>
        ),
    },
  ];

  const hayFiltros =
    busqueda !== "" || operador !== TODAS || sede !== TODAS || provincia !== TODAS || vinculo !== TODAS;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Field {...BUSQUEDA}>
            <Input
              {...fieldAria(BUSQUEDA)}
              type="search"
              disabled={!hydrated}
              value={texto}
              onChange={(e) => setTexto(e.currentTarget.value)}
              placeholder="Caja, sede o equipo"
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
          <Field {...VINCULO}>
            <select {...fieldAria(VINCULO)} disabled={!hydrated} value={vinculo} onChange={(e) => setVinculo(e.currentTarget.value)} className={SELECT}>
              <option value={TODAS}>Con y sin equipo</option>
              <option value="con">Con equipo</option>
              <option value="sin">Sin equipo</option>
            </select>
          </Field>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
          <Conmutador id="cajas-retiradas" checked={retiradas} disabled={!hydrated} onChange={setRetiradas}>
            Mostrar también las retiradas
          </Conmutador>
          <p className="text-body-sm text-text-secondary sm:ml-auto" aria-live="polite">
            {visibles.length === 1 ? "1 caja" : `${visibles.length} cajas`}
          </p>
        </div>
      </div>

      <ResponsiveTable
        rows={visibles}
        columns={columnas}
        rowKey={(r) => r.id}
        tablaDesde="xl"
        tarjetasEnDosColumnas
        cardTitle={(r) => <span className="font-medium text-text-primary">{r.nombre}</span>}
        cardSubtitle={(r) => `${r.sede} · ${r.codigoSede}`}
        cardBadge={(r) => (r.estado === "activa" ? <Badge variant="success">Activa</Badge> : <Badge variant="neutral">Retirada</Badge>)}
        empty={
          <p className="text-body text-text-primary">
            {hayFiltros ? "Ninguna caja coincide con estos filtros." : "Todavía no hay ninguna caja en la red."}
          </p>
        }
      />
    </>
  );
}

export function EstadoDeJornadaBadge({ estado }: { estado: EstadoJornada }): React.JSX.Element {
  if (estado === "abierta") return <Badge variant="success">Abierta</Badge>;
  if (estado === "forzada") return <Badge variant="warning">Cierre forzado</Badge>;
  return <Badge variant="neutral">Cerrada</Badge>;
}

function opciones(
  rows: readonly CajaRow[],
  de: (r: CajaRow) => [string | null, string | null],
): readonly (readonly [string, string])[] {
  const vistos = new Map<string, string>();
  for (const r of rows) {
    const [id, nombre] = de(r);
    if (id && nombre) vistos.set(id, nombre);
  }
  return [...vistos].sort((a, b) => a[1].localeCompare(b[1], "es"));
}
