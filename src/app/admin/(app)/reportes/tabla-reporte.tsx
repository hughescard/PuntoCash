"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { formatAmount, formatSignedAmount } from "@/lib/format";
import type { FilaReporte } from "./calculo";

/**
 * La tabla de un corte — **FR-AD-REP-4**: número de operaciones y una columna
 * por moneda, nunca sumadas entre sí. En los cortes por sede y por trabajador
 * se ordena por cualquier columna pulsando su cabecera; en el teléfono, con el
 * selector «Ordenar por», porque una tarjeta no tiene cabeceras que pulsar.
 */

export type { FilaReporte };

type Clave = "titulo" | "operaciones" | string;

export function TablaReporte({
  filas,
  columnas,
  ordenable,
  primera,
  vacio,
  conSigno = [],
}: {
  filas: readonly FilaReporte[];
  /** Las monedas, o las cifras, de las columnas: una cada una. */
  columnas: readonly string[];
  ordenable: boolean;
  /** Cómo se llama la primera columna: «Sede», «Trabajador», «Día»… */
  primera: string;
  vacio: string;
  /** Columnas que pueden ser negativas y llevan signo. */
  conSigno?: readonly string[];
}): React.JSX.Element {
  const [orden, setOrden] = React.useState<{ clave: Clave; desc: boolean }>({ clave: "titulo", desc: false });

  const ordenadas = ordenable
    ? [...filas].sort((a, b) => {
        const va = valor(a, orden.clave);
        const vb = valor(b, orden.clave);
        const c = typeof va === "string" && typeof vb === "string" ? va.localeCompare(vb, "es") : Number(va) - Number(vb);
        return orden.desc ? -c : c;
      })
    : filas;

  const ordenarPor = (clave: Clave) =>
    setOrden((o) => (o.clave === clave ? { clave, desc: !o.desc } : { clave, desc: clave !== "titulo" }));

  const cabecera = (clave: Clave, texto: string, numerica: boolean) =>
    ordenable ? (
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
    ) : (
      texto
    );

  const sort = (clave: Clave) =>
    ordenable ? (orden.clave === clave ? (orden.desc ? "descending" : "ascending") : "none") : undefined;

  const columns: ResponsiveColumn<FilaReporte>[] = [
    {
      key: "titulo",
      header: cabecera("titulo", primera, false),
      cardHeader: primera,
      sort: sort("titulo"),
      hiddenOnCard: true,
      cell: (f) => (
        <span className="flex flex-col">
          {f.href ? (
            <Link href={f.href as Route} className="font-semibold text-text-primary underline-offset-4 hover:underline">
              {f.titulo}
            </Link>
          ) : (
            <span className="font-semibold text-text-primary">{f.titulo}</span>
          )}
          {f.subtitulo ? <span className="text-caption text-text-secondary">{f.subtitulo}</span> : null}
        </span>
      ),
    },
    {
      key: "operaciones",
      header: cabecera("operaciones", "Operaciones", true),
      cardHeader: "Operaciones",
      sort: sort("operaciones"),
      numeric: true,
      cell: (f) => f.operaciones,
    },
    ...columnas.map(
      (m): ResponsiveColumn<FilaReporte> => ({
        key: m,
        header: cabecera(m, m, true),
        cardHeader: m,
        sort: sort(m),
        numeric: true,
        cell: (f) => {
          const v = f.volumen[m] ?? 0;
          if (conSigno.includes(m)) return formatSignedAmount(v);
          return v === 0 ? <span className="text-text-secondary">—</span> : formatAmount(v);
        },
      }),
    ),
  ];

  return (
    <>
      {ordenable && filas.length > 1 ? (
        <label className="mb-4 flex items-center gap-3 text-label font-semibold text-text-primary lg:hidden">
          Ordenar por
          <select
            value={`${orden.clave}|${orden.desc ? "desc" : "asc"}`}
            onChange={(e) => {
              const [clave, dir] = e.target.value.split("|");
              setOrden({ clave: clave!, desc: dir === "desc" });
            }}
            className="h-control flex-1 rounded-control border border-border bg-surface px-4 text-body font-normal text-text-primary"
          >
            <option value="titulo|asc">{primera} (A–Z)</option>
            <option value="operaciones|desc">Más operaciones</option>
            {columnas.map((m) => (
              <option key={m} value={`${m}|desc`}>
                Más volumen en {m}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <ResponsiveTable
        rows={ordenadas}
        columns={columns}
        rowKey={(f) => f.key}
        cardTitle={(f) =>
          f.href ? (
            <Link href={f.href as Route} className="underline-offset-4 hover:underline">
              {f.titulo}
            </Link>
          ) : (
            f.titulo
          )
        }
        cardSubtitle={(f) => f.subtitulo}
        empty={<p className="text-body text-text-secondary">{vacio}</p>}
      />
    </>
  );
}

function valor(f: FilaReporte, clave: Clave): string | number {
  if (clave === "titulo") return f.titulo;
  if (clave === "operaciones") return f.operaciones;
  return f.volumen[clave] ?? 0;
}
