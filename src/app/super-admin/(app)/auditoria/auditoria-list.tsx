"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { FileSpreadsheet, Search } from "lucide-react";

import { Button, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { useHydrated } from "@/lib/use-hydrated";
import { useFiltrosEnUrl } from "@/lib/filtros-en-url";
import { SELECT } from "../equipos/controles";
import { AREAS } from "./etiquetas";
import { filtrarAuditoria, filtroDeParametros, SIN_FILTRO, TODOS, type FilaDeAuditoria } from "./filtro";

/**
 * El registro de auditoría de la red — **FR-SA-AUD-1**, **AUD-3**, **AUD-4**.
 *
 * Del más reciente al más antiguo, con los filtros de **FR-SA-AUD-4**: quién
 * actuó (PuntoCash o un mercante, que es la consulta más frecuente al revisar
 * un incidente), el tipo de evento —agrupado por lo que se gobierna—, la
 * persona, el operador, la sede, las fechas y una búsqueda sobre el motivo.
 *
 * **Sin ventana de fechas obligatoria**, a diferencia de Operaciones o
 * Jornadas: el registro de gobierno crece a decenas de eventos por semana, no
 * a miles, y quien audita casi siempre busca *un* acto, no un periodo. Las
 * fechas acotan si hace falta, y la lista se enseña por tandas.
 *
 * **Ningún control de edición ni de borrado, ni siquiera deshabilitado**
 * **[RP-21]**: lo único que sale de esta pantalla es la lectura y el archivo.
 */

const TANDA = 50;

const BUSCAR: FieldSpec = { id: "sa-aud-buscar", label: "Buscar" };
const DESDE: FieldSpec = { id: "sa-aud-desde", label: "Desde" };
const HASTA: FieldSpec = { id: "sa-aud-hasta", label: "Hasta" };
const ROL: FieldSpec = { id: "sa-aud-rol", label: "Quién actuó" };
const TIPO: FieldSpec = { id: "sa-aud-tipo", label: "Evento" };
const ACTOR: FieldSpec = { id: "sa-aud-actor", label: "Persona" };
const OPERADOR: FieldSpec = { id: "sa-aud-operador", label: "Operador" };
const SEDE: FieldSpec = { id: "sa-aud-sede", label: "Sede" };

export function AuditoriaList({
  rows,
  inicial = {},
}: {
  rows: readonly FilaDeAuditoria[];
  inicial?: Record<string, string | undefined>;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const arranque = filtroDeParametros(inicial);
  const [texto, setTexto] = React.useState(arranque.texto);
  const [desde, setDesde] = React.useState(arranque.desde);
  const [hasta, setHasta] = React.useState(arranque.hasta);
  const [rol, setRol] = React.useState(arranque.rol);
  const [tipo, setTipo] = React.useState(arranque.tipo);
  const [actor, setActor] = React.useState(arranque.actor);
  const [operador, setOperador] = React.useState(arranque.operador);
  const [sede, setSede] = React.useState(arranque.sede);
  const valores = { texto, desde, hasta, rol, tipo, actor, operador, sede };
  useFiltrosEnUrl(valores, { ...SIN_FILTRO });

  /* Cuántos eventos se enseñan. Vuelve a una tanda al cambiar un filtro, y se
     calcula en el render —guardando con qué filtros se pidió— en vez de
     corregirlo en un efecto, que pintaría dos veces. */
  const clave = JSON.stringify(valores);
  const [tanda, setTanda] = React.useState({ clave, n: TANDA });
  const limite = tanda.clave === clave ? tanda.n : TANDA;

  const personas = React.useMemo(() => distintos(rows.map((r) => [r.actorId, r.actor])), [rows]);
  const operadores = React.useMemo(
    () => distintos(rows.flatMap((r) => (r.operadorId && r.operador ? [[r.operadorId, r.operador] as const] : []))),
    [rows],
  );
  const sedes = React.useMemo(
    () => distintos(rows.flatMap((r) => (r.sedeId && r.sede ? [[r.sedeId, r.sede] as const] : []))),
    [rows],
  );

  const visibles = filtrarAuditoria(rows, valores);
  const mostradas = visibles.slice(0, limite);

  /* El archivo lleva lo que hay en pantalla: los mismos filtros, por dirección. */
  const consulta = new URLSearchParams();
  for (const [k, v] of Object.entries(valores)) if (v !== "" && v !== SIN_FILTRO[k as keyof typeof SIN_FILTRO]) consulta.set(k, v);
  const exportar = `/super-admin/auditoria/exportar${consulta.size > 0 ? `?${consulta}` : ""}`;

  const columnas: readonly ResponsiveColumn<FilaDeAuditoria>[] = [
    {
      key: "cuando",
      header: "Fecha y hora",
      hiddenOnCard: true,
      cell: (e) => <span className="pc-numeric whitespace-nowrap text-text-primary">{e.fecha}</span>,
    },
    {
      key: "evento",
      header: "Evento",
      hiddenOnCard: true,
      cell: (e) => (
        <span className="flex min-w-0 flex-col xl:max-w-80 min-[1400px]:max-w-md">
          <span className="font-semibold text-text-primary">{e.evento}</span>
          <span className="text-body-sm text-text-secondary">{e.objeto}</span>
        </span>
      ),
    },
    {
      key: "quien",
      header: "Quién",
      cell: (e) => (
        <span className="flex flex-col">
          <span className="text-text-primary">{e.actor}</span>
          <span className="text-caption text-text-secondary">
            {e.rol === "admin-sede" && e.operador ? `Mercante · ${e.operador}` : e.rolEtiqueta}
          </span>
        </span>
      ),
    },
    {
      key: "donde",
      header: "Sede y operador",
      cell: (e) =>
        e.sede || e.operador ? (
          <span className="flex min-w-0 flex-col xl:max-w-44 min-[1400px]:max-w-64">
            {e.sedeId && e.sede ? (
              <Link
                href={`/super-admin/sedes/${e.sedeId}` as Route}
                title={e.sede}
                className="relative z-10 text-text-primary underline-offset-4 hover:underline xl:truncate"
              >
                {e.sede}
              </Link>
            ) : null}
            {e.operadorId && e.operador ? (
              <Link
                href={`/super-admin/operadores/${e.operadorId}` as Route}
                title={e.operador}
                className={`relative z-10 underline-offset-4 hover:underline xl:truncate ${e.sede ? "text-caption text-text-secondary hover:text-text-primary" : "text-text-primary"}`}
              >
                {e.operador}
              </Link>
            ) : null}
          </span>
        ) : (
          <span className="text-text-secondary">—</span>
        ),
    },
    {
      key: "motivo",
      header: "Motivo declarado",
      cell: (e) =>
        e.motivo ? (
          <span className="line-clamp-3 text-text-primary xl:max-w-64" title={e.motivo}>
            {e.motivo}
          </span>
        ) : (
          <span className="text-text-secondary">—</span>
        ),
    },
  ];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4">
        <Field {...BUSCAR} className="sm:max-w-md">
          <Input
            {...fieldAria(BUSCAR)}
            type="search"
            disabled={!hydrated}
            value={texto}
            onChange={(e) => setTexto(e.currentTarget.value)}
            placeholder="Motivo, sede, persona u objeto"
            prefix={<Search className="size-[18px]" aria-hidden="true" />}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field {...ROL}>
            <select {...fieldAria(ROL)} disabled={!hydrated} value={rol} onChange={(e) => setRol(e.currentTarget.value)} className={SELECT}>
              <option value={TODOS}>PuntoCash y mercantes</option>
              <option value="super-admin">Solo PuntoCash</option>
              <option value="admin-sede">Solo mercantes</option>
            </select>
          </Field>
          <Field {...TIPO}>
            <select {...fieldAria(TIPO)} disabled={!hydrated} value={tipo} onChange={(e) => setTipo(e.currentTarget.value)} className={SELECT}>
              <option value={TODOS}>Todos los eventos</option>
              {AREAS.map((a) => (
                <optgroup key={a.area} label={a.area}>
                  {a.tipos.map((t) => (
                    <option key={t.tipo} value={t.tipo}>
                      {t.etiqueta}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field {...ACTOR}>
            <select {...fieldAria(ACTOR)} disabled={!hydrated} value={actor} onChange={(e) => setActor(e.currentTarget.value)} className={SELECT}>
              <option value={TODOS}>Todas las personas</option>
              {personas.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field {...OPERADOR}>
            <select {...fieldAria(OPERADOR)} disabled={!hydrated} value={operador} onChange={(e) => setOperador(e.currentTarget.value)} className={SELECT}>
              <option value={TODOS}>Todos los operadores</option>
              {operadores.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field {...SEDE}>
            <select {...fieldAria(SEDE)} disabled={!hydrated} value={sede} onChange={(e) => setSede(e.currentTarget.value)} className={SELECT}>
              <option value={TODOS}>Todas las sedes</option>
              {sedes.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field {...DESDE}>
            <Input {...fieldAria(DESDE)} type="date" disabled={!hydrated} value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.currentTarget.value)} />
          </Field>
          <Field {...HASTA}>
            <Input {...fieldAria(HASTA)} type="date" disabled={!hydrated} value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.currentTarget.value)} />
          </Field>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-sm text-text-secondary" aria-live="polite">
            {visibles.length === 1 ? "1 evento" : `${visibles.length} eventos`}
            {visibles.length > mostradas.length ? ` · se muestran los ${mostradas.length} más recientes` : ""}
          </p>
          <Button variant="secondary" asChild>
            <a href={exportar}>
              <FileSpreadsheet aria-hidden="true" />
              Exportar a Excel
            </a>
          </Button>
        </div>
      </div>

      <ResponsiveTable
        rows={mostradas}
        columns={columnas}
        rowKey={(e) => e.id}
        tablaDesde="xl"
        tarjetasEnDosColumnas
        rowLink={(e) => ({ href: `/super-admin/auditoria/${e.id}`, label: `Ver el detalle de «${e.evento}»` })}
        cardTitle={(e) => <span className="font-semibold text-text-primary">{e.evento}</span>}
        cardSubtitle={(e) => `${e.fecha} · ${e.objeto}`}
        empty={<p className="text-body text-text-primary">Ningún evento coincide con estos filtros.</p>}
      />

      {visibles.length > mostradas.length ? (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={() => setTanda({ clave, n: limite + TANDA })}>
            Mostrar más eventos
          </Button>
        </div>
      ) : null}
    </>
  );
}

/** Pares únicos por clave, ordenados por nombre. */
function distintos(pares: readonly (readonly [string, string])[]): [string, string][] {
  return [...new Map(pares)].sort((a, b) => a[1].localeCompare(b[1], "es"));
}
