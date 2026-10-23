"use client";

import * as React from "react";

import { formatAmount } from "@/lib/format";
import type { FilaReporte } from "./tabla-reporte";

/**
 * La representación temporal del corte por día — **FR-AD-REP-4**,
 * **FR-AD-REP-5**.
 *
 * Una moneda a la vez: los importes de monedas distintas no pueden compartir
 * un eje, y convertirlos sería inventar una tasa. Barras del color primario de
 * la marca, finas y con el extremo redondeado; rejilla discreta; el valor
 * exacto al pasar el puntero o al enfocar la barra. La tabla de debajo es la
 * vista accesible con todas las cifras.
 */
export function GraficoPorDia({
  dias,
  monedas,
  deQuien,
}: {
  dias: readonly FilaReporte[];
  monedas: readonly string[];
  /** El trabajador elegido, si lo hay: el título lo dice. */
  deQuien: string | null;
}): React.JSX.Element {
  const [moneda, setMoneda] = React.useState(monedas[0]!);
  const [activo, setActivo] = React.useState<string | null>(null);

  const valores = dias.map((d) => d.volumen[moneda] ?? 0);
  const maximo = escala(Math.max(...valores, 0));
  const marcas = [maximo, maximo / 2, 0];
  /* Con muchos días, una etiqueta de cada pocas para que no se pisen. */
  const cada = dias.length > 16 ? 5 : dias.length > 8 ? 2 : 1;

  return (
    <section aria-labelledby="grafico-por-dia" className="mb-8 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="grafico-por-dia" className="text-card-title text-text-primary">
          Volumen por día en {moneda}
          {deQuien ? <span className="text-text-secondary"> · {deQuien}</span> : null}
        </h2>
        {monedas.length > 1 ? (
          <label className="flex items-center gap-3 text-label font-semibold text-text-primary">
            Moneda
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              className="h-control rounded-control border border-border bg-surface px-4 text-body font-normal text-text-primary outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              {monedas.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="flex gap-3">
        {/* Eje vertical: tres marcas, en la moneda elegida. */}
        <div className="pc-numeric relative h-56 w-16 shrink-0 text-right text-caption text-text-secondary sm:w-24" aria-hidden="true">
          {marcas.map((m, i) => (
            <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${(i / (marcas.length - 1)) * 100}%` }}>
              {formatAmount(m, 0)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-56">
            {/* Rejilla, recesiva. */}
            {marcas.map((_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className={`absolute inset-x-0 border-t ${i === marcas.length - 1 ? "border-border-strong" : "border-border"}`}
                style={{ top: `${(i / (marcas.length - 1)) * 100}%` }}
              />
            ))}
            <ul className="absolute inset-0 flex items-end gap-[2px]" aria-label={`Volumen por día en ${moneda}${deQuien ? ` de ${deQuien}` : ""}`}>
              {dias.map((d, i) => {
                const v = valores[i]!;
                const alto = maximo > 0 ? (v / maximo) * 100 : 0;
                const etiqueta = `${d.titulo}: ${formatAmount(v)} ${moneda}, ${d.operaciones} ${d.operaciones === 1 ? "operación" : "operaciones"}`;
                return (
                  <li key={d.key} className="relative flex h-full flex-1 items-end justify-center">
                    <button
                      type="button"
                      aria-label={etiqueta}
                      onMouseEnter={() => setActivo(d.key)}
                      onMouseLeave={() => setActivo(null)}
                      onFocus={() => setActivo(d.key)}
                      onBlur={() => setActivo(null)}
                      className="group flex h-full w-full items-end justify-center outline-none"
                    >
                      <span
                        className={`block w-full max-w-10 rounded-t-[4px] bg-primary transition-opacity group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2 ${activo && activo !== d.key ? "opacity-50" : ""}`}
                        style={{ height: v > 0 ? `max(${alto}%, 2px)` : "0" }}
                      />
                    </button>
                    {activo === d.key ? (
                      <span
                        role="presentation"
                        className="pointer-events-none absolute z-10 mb-2 w-max max-w-48 rounded-control bg-navy px-3 py-2 text-caption text-text-inverse shadow-card"
                        style={{
                          bottom: `${alto}%`,
                          ...(i < dias.length / 3 ? { left: 0 } : i > (dias.length * 2) / 3 ? { right: 0 } : {}),
                        }}
                      >
                        <span className="block font-semibold">{d.titulo}</span>
                        <span className="pc-numeric block">
                          {formatAmount(v)} {moneda}
                        </span>
                        <span className="block">
                          {d.operaciones} {d.operaciones === 1 ? "operación" : "operaciones"}
                        </span>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
          {/* Eje horizontal. */}
          <div className="mt-2 flex gap-[2px]" aria-hidden="true">
            {dias.map((d, i) => (
              <span key={d.key} className="flex-1 truncate text-center text-caption text-text-secondary">
                {i % cada === 0 ? (
                  <>
                    <span className="sm:hidden">{corto(d.titulo).split(" ")[0]}</span>
                    <span className="hidden sm:inline">{corto(d.titulo)}</span>
                  </>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Un máximo redondo para el eje: 1, 2 o 5 por una potencia de diez. */
function escala(max: number): number {
  if (max <= 0) return 0;
  const p = 10 ** Math.floor(Math.log10(max));
  for (const f of [1, 2, 5, 10]) if (f * p >= max) return f * p;
  return 10 * p;
}

/** «lun 19 oct 2026» → «19 oct». */
function corto(dia: string): string {
  const partes = dia.split(" ");
  return partes.length >= 3 ? `${partes[1]} ${partes[2]}` : dia;
}
