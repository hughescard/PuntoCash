"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";

import { Badge, Field, fieldAria, type FieldSpec } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/patterns/responsive-table";
import { formatAmount, formatSignedAmount } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * El libro de movimientos de una jornada, en solo lectura — **FR-AD-JOR-5**.
 * Las mismas columnas y los mismos filtros que en Worker (tipo y moneda), y
 * cada fila lleva a su detalle. En el teléfono, una tarjeta por movimiento.
 */

export interface MovimientoRow {
  id: string;
  hora: string;
  operacion: string | null;
  tipo: "entrada" | "salida";
  concepto: string;
  currency: string;
  amount: number;
  saldoDespues: number;
}

const SELECT_CLASS =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-secondary";

const TIPO: FieldSpec = { id: "mov-tipo", label: "Tipo" };
const MONEDA: FieldSpec = { id: "mov-moneda", label: "Moneda" };

export function MovimientosDeJornada({ jornadaId, rows }: { jornadaId: string; rows: readonly MovimientoRow[] }) {
  const hydrated = useHydrated();
  const [tipo, setTipo] = React.useState<"todos" | "entrada" | "salida">("todos");
  const [moneda, setMoneda] = React.useState("todas");
  const monedas = [...new Set(rows.map((r) => r.currency))];
  const visibles = rows.filter((r) => (tipo === "todos" || r.tipo === tipo) && (moneda === "todas" || r.currency === moneda));

  const enlace = (r: MovimientoRow) => (
    <Link
      href={`/admin/jornadas/${jornadaId}/movimientos/${r.id}` as Route}
      className="font-semibold text-text-primary underline-offset-4 hover:underline"
    >
      {r.concepto}
    </Link>
  );

  const columnas: readonly ResponsiveColumn<MovimientoRow>[] = [
    { key: "hora", header: "Hora", cell: (r) => <span className="pc-numeric">{r.hora}</span> },
    { key: "concepto", header: "Concepto", cell: enlace, hiddenOnCard: true },
    {
      key: "operacion",
      header: "Operación",
      /* Un movimiento de una operación lleva a ella (FR-AD-OPS-9). */
      cell: (r) =>
        r.operacion ? (
          <Link
            href={`/admin/operaciones/${r.operacion}` as Route}
            className="pc-numeric relative z-10 whitespace-nowrap text-text-primary underline underline-offset-4 hover:text-primary"
          >
            {r.operacion}
          </Link>
        ) : (
          <span className="text-text-secondary">—</span>
        ),
    },
    {
      key: "tipo",
      header: "Tipo",
      cell: (r) => <Badge variant={r.tipo === "entrada" ? "success" : "error"}>{r.tipo === "entrada" ? "Entrada" : "Salida"}</Badge>,
      hiddenOnCard: true,
    },
    {
      key: "importe",
      header: "Importe",
      numeric: true,
      cell: (r) => (
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <CurrencyFlag currency={r.currency} />
          {formatSignedAmount(r.amount)} {r.currency}
        </span>
      ),
    },
    {
      key: "saldo",
      header: "Saldo después",
      numeric: true,
      cell: (r) => <span className="whitespace-nowrap">{formatAmount(r.saldoDespues)} {r.currency}</span>,
    },
  ];

  return (
    <>
      <div className="mb-4 grid gap-4 sm:max-w-md sm:grid-cols-2">
        <Field {...TIPO}>
          <select {...fieldAria(TIPO)} value={tipo} disabled={!hydrated} onChange={(e) => setTipo(e.target.value as typeof tipo)} className={SELECT_CLASS}>
            <option value="todos">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
          </select>
        </Field>
        <Field {...MONEDA}>
          <select {...fieldAria(MONEDA)} value={moneda} disabled={!hydrated} onChange={(e) => setMoneda(e.target.value)} className={SELECT_CLASS}>
            <option value="todas">Todas</option>
            {monedas.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <ResponsiveTable
        rows={visibles}
        columns={columnas}
        rowKey={(r) => r.id}
        cardTitle={enlace}
        cardBadge={(r) => <Badge variant={r.tipo === "entrada" ? "success" : "error"}>{r.tipo === "entrada" ? "Entrada" : "Salida"}</Badge>}
        empty={<p className="text-body text-text-secondary">Ningún movimiento coincide con esos filtros.</p>}
      />
    </>
  );
}
