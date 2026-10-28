"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";

import { Badge, Card, CardContent, Field, fieldAria, Input, type FieldSpec } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cifraDeTablero } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { useFiltrosEnUrl } from "@/lib/filtros-en-url";

/**
 * Tasas por sede — de solo lectura y **sin capa de alertas** (decisión del
 * 28/10): qué monedas tiene cada sede en su lista y qué tasa publica de cada
 * una, con el rango aplicable y quién la cambió por última vez. Las monedas y
 * las tasas las decide su operador.
 *
 * Cuando una tasa no se publica, la fila lo dice como un dato, no como un
 * aviso: sin rango, sin Cambio de moneda, o sin tasa todavía.
 */

interface Intervalo {
  min: number;
  max: number;
}

export interface SedeConTasas {
  id: string;
  nombre: string;
  codigo: string;
  operadorId: string | null;
  operador: string | null;
  cambio: boolean;
  monedas: readonly {
    code: string;
    nombre: string;
    local: boolean;
    compra: number | null;
    venta: number | null;
    enVigor: boolean;
    sinRango: boolean;
    rango: { compra: Intervalo; venta: Intervalo } | null;
    /** «14 oct 2026 · 13:30 · Marta Sánchez», ya formateado. */
    cambio: string | null;
    fijadaAuto: boolean;
  }[];
}

const BUSQUEDA: FieldSpec = { id: "tasas-busqueda", label: "Buscar sede" };
const OPERADOR: FieldSpec = { id: "tasas-operador", label: "Operador" };
const MONEDA: FieldSpec = { id: "tasas-moneda", label: "Moneda" };
const TODOS = "todos";

const SELECT =
  "h-control w-full rounded-control border border-border bg-surface px-4 text-body text-text-primary outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-secondary";

const tramo = (i: Intervalo) => `${cifraDeTablero(i.min)}–${cifraDeTablero(i.max)}`;

export function TasasPorSede({
  sedes,
  inicial = {},
}: {
  sedes: readonly SedeConTasas[];
  inicial?: Record<string, string | undefined>;
}): React.JSX.Element {
  const hydrated = useHydrated();
  const [texto, setTexto] = React.useState(inicial.texto ?? "");
  const [operador, setOperador] = React.useState(inicial.operador ?? TODOS);
  const [moneda, setMoneda] = React.useState(inicial.moneda ?? TODOS);
  useFiltrosEnUrl({ vista: "sedes", texto, operador, moneda }, { operador: TODOS, moneda: TODOS });

  const operadores = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sedes) if (s.operadorId && s.operador) m.set(s.operadorId, s.operador);
    return [...m].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [sedes]);
  const monedas = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sedes) for (const x of s.monedas) if (!x.local) m.set(x.code, x.nombre);
    return [...m].sort((a, b) => a[0].localeCompare(b[0]));
  }, [sedes]);

  const q = texto.trim().toLowerCase();
  const visibles = sedes.filter(
    (s) =>
      (!q || s.nombre.toLowerCase().includes(q) || s.codigo.toLowerCase().includes(q)) &&
      (operador === TODOS || s.operadorId === operador) &&
      (moneda === TODOS || s.monedas.some((m) => m.code === moneda)),
  );

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Field {...BUSQUEDA}>
          <Input
            {...fieldAria(BUSQUEDA)}
            type="search"
            disabled={!hydrated}
            value={texto}
            onChange={(e) => setTexto(e.currentTarget.value)}
            placeholder="Código o nombre"
            prefix={<Search className="size-[18px]" aria-hidden="true" />}
          />
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
        <Field {...MONEDA}>
          <select {...fieldAria(MONEDA)} disabled={!hydrated} value={moneda} onChange={(e) => setMoneda(e.currentTarget.value)} className={SELECT}>
            <option value={TODOS}>Todas las monedas</option>
            {monedas.map(([code, nombre]) => (
              <option key={code} value={code}>
                {code} · {nombre}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {visibles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-body text-text-primary">Ninguna sede coincide con estos filtros.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {visibles.map((s) => (
            <li key={s.id}>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-3 pt-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/super-admin/sedes/${s.id}` as Route}
                        className="font-medium text-text-primary underline-offset-4 hover:underline"
                      >
                        {s.nombre}
                      </Link>
                      <p className="text-body-sm text-text-secondary">
                        {s.codigo} · {s.operador ?? "Sin operador"}
                      </p>
                    </div>
                    {s.cambio ? null : <Badge variant="neutral">Sin Cambio de moneda</Badge>}
                  </div>
                  {s.monedas.length === 0 ? (
                    <p className="text-body-sm text-text-secondary">Ninguna moneda en su lista.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border">
                      {s.monedas
                        .filter((m) => moneda === TODOS || m.code === moneda || m.local)
                        .map((m) => (
                          <li key={m.code} className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-0.5 py-2.5">
                            <span className="inline-flex items-center gap-2 self-start">
                              <CurrencyFlag currency={m.code} />
                              <span className="pc-numeric font-semibold text-text-primary">{m.code}</span>
                            </span>
                            <span className="min-w-0">
                              <Tasa m={m} cambio={s.cambio} />
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Tasa({ m, cambio }: { m: SedeConTasas["monedas"][number]; cambio: boolean }): React.JSX.Element {
  if (m.local) return <span className="text-body-sm text-text-secondary">Moneda de referencia</span>;

  const valores =
    m.compra !== null && m.venta !== null ? (
      <span className={`pc-numeric text-body ${m.enVigor ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
        Compra {cifraDeTablero(m.compra)} · Venta {cifraDeTablero(m.venta)}
      </span>
    ) : (
      <span className="text-body text-text-secondary">Sin tasa</span>
    );

  const porque = m.sinRango
    ? "Sin rango de PuntoCash: no se publica."
    : !cambio && m.compra !== null
      ? "Guardada, no se publica: la sede no tiene Cambio de moneda."
      : null;

  return (
    <span className="flex flex-col gap-0.5">
      {valores}
      {m.rango ? (
        <span className="pc-numeric text-caption text-text-secondary">
          Rango: compra {tramo(m.rango.compra)} · venta {tramo(m.rango.venta)}
        </span>
      ) : null}
      {porque ? <span className="text-caption text-text-secondary">{porque}</span> : null}
      {m.cambio ? (
        <span className="text-caption text-text-secondary">
          {m.fijadaAuto ? "Fijada al límite por PuntoCash al mover el rango · " : "Último cambio: "}
          {m.cambio}
        </span>
      ) : null}
    </span>
  );
}
