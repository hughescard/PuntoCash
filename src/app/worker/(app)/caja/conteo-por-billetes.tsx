"use client";

import * as React from "react";

import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, fieldAria } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { formatoDeDenominacion, lineas, type Billetes, type Denominacion } from "@/features/caja/billetes";
import {
  CAJA_COMPOSITION_REASONS_CLOSE,
  CAJA_COMPOSITION_REASONS_OPEN,
  findCajaCurrency,
  getValidDifferenceReasons,
  pideSupervisor,
} from "@/features/caja/caja-data";

/**
 * El conteo de una caja **billete a billete** (decisión del 9/11/2026): por
 * cada moneda, una fila por denominación donde se escribe cuántas unidades
 * hay. El trabajador ve el importe de cada fila y el total de **su** conteo;
 * nunca lo que el sistema espera. Una fila vacía cuenta como cero.
 *
 * Lo comparten Abrir jornada (rellenado con lo que declaró quien cerró) y
 * Arqueo y cierre (en blanco).
 */

/** Lo escrito en cada fila, por moneda y por denominación (clave en céntimos). */
export type Unidades = Record<string, Record<string, string>>;

const clave = (valor: number) => String(Math.round(valor * 100));

/** Unidades escritas → billetes. `null` en las monedas con alguna fila que no es un entero. */
export function aBilletes(monedas: readonly string[], unidades: Unidades): { conteos: { currency: string; billetes: Billetes; contado: number }[]; errores: Record<string, string> } {
  const conteos: { currency: string; billetes: Billetes; contado: number }[] = [];
  const errores: Record<string, string> = {};
  for (const currency of monedas) {
    const billetes: Record<string, number> = {};
    let contado = 0;
    let mal = false;
    for (const [k, raw] of Object.entries(unidades[currency] ?? {})) {
      const t = raw.trim();
      if (t === "") continue;
      if (!/^\d+$/.test(t)) {
        mal = true;
        continue;
      }
      const n = Number(t);
      if (n > 0) {
        billetes[k] = n;
        contado += (n * Number(k)) / 100;
      }
    }
    if (mal) errores[currency] = "Escribe cuántas unidades hay, en números enteros.";
    else conteos.push({ currency, billetes, contado: Math.round(contado * 100) / 100 });
  }
  return { conteos, errores };
}

/** Billetes → lo que se escribe en las filas (para rellenar la apertura). */
export function aUnidades(billetes: Readonly<Record<string, Billetes>>): Unidades {
  const out: Unidades = {};
  for (const [currency, b] of Object.entries(billetes)) {
    out[currency] = Object.fromEntries(Object.entries(b).filter(([, n]) => n > 0).map(([k, n]) => [k, String(n)]));
  }
  return out;
}

/** «+2 de 20 · −1 de 50»: qué cambió en los billetes, por denominación. */
export function describirComposicion(b: Readonly<Record<string, number>>): string {
  return lineas(b)
    .filter((l) => l.cantidad !== 0)
    .map((l) => `${l.cantidad > 0 ? "+" : "−"}${Math.abs(l.cantidad)} de ${formatoDeDenominacion(l.valor)}`)
    .join(" · ");
}

export function ConteoPorBilletes({
  monedas,
  denominaciones,
  unidades,
  errores,
  onChange,
  entregado,
  dosPorFila = false,
}: {
  monedas: readonly string[];
  denominaciones: Readonly<Record<string, readonly Denominacion[]>>;
  unidades: Unidades;
  errores: Record<string, string>;
  onChange: (currency: string, clave: string, valor: string) => void;
  /** Al abrir: lo que declaró quien cerró, por moneda, para tenerlo a la vista. */
  entregado?: { etiqueta: string; importes: ReadonlyMap<string, number> };
  /** Dos monedas por fila en pantallas anchas; la página crece hacia abajo. */
  dosPorFila?: boolean;
}): React.JSX.Element {
  return (
    <div className={dosPorFila ? "grid grid-cols-1 items-start gap-5 lg:grid-cols-2" : "flex flex-col gap-5"}>
      {monedas.map((currency) => (
        <MonedaPorBilletes
          key={currency}
          currency={currency}
          denominaciones={denominaciones[currency] ?? []}
          valores={unidades[currency] ?? {}}
          error={errores[currency]}
          onChange={(k, v) => onChange(currency, k, v)}
          {...(entregado ? { referencia: { etiqueta: entregado.etiqueta, importe: entregado.importes.get(currency) ?? 0 } } : {})}
        />
      ))}
    </div>
  );
}

function MonedaPorBilletes({
  currency,
  denominaciones,
  valores,
  error,
  onChange,
  referencia,
}: {
  currency: string;
  denominaciones: readonly Denominacion[];
  valores: Record<string, string>;
  error?: string;
  onChange: (clave: string, valor: string) => void;
  referencia?: { etiqueta: string; importe: number };
}) {
  const entry = findCajaCurrency(currency);
  const total = denominaciones.reduce((s, d) => {
    const t = (valores[clave(d.valor)] ?? "").trim();
    return /^\d+$/.test(t) ? s + Number(t) * d.valor : s;
  }, 0);
  return (
    <section aria-label={`Conteo de ${currency}`} className="rounded-control border border-border">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-subtle px-4 py-3">
        <span className="flex items-center gap-2">
          <CurrencyFlag currency={currency} />
          <span className="text-body-sm font-semibold text-text-primary">{currency}</span>
          <span className="text-body-sm text-text-secondary">· {entry?.name}</span>
        </span>
        <span className="flex flex-wrap items-center gap-x-5 gap-y-1 text-body-sm text-text-secondary">
          {referencia ? (
            <span>
              {referencia.etiqueta}: <span className="pc-numeric font-medium text-text-primary">{formatMoney({ amount: referencia.importe, currency })}</span>
            </span>
          ) : null}
          <span>Tu conteo: <span className="pc-numeric font-semibold text-text-primary" data-testid={`total-${currency}`}>{formatMoney({ amount: Math.round(total * 100) / 100, currency })}</span></span>
        </span>
      </header>
      {denominaciones.length === 0 ? (
        <p className="px-4 py-3 text-body-sm text-error-foreground">
          Esta moneda no tiene billetes en el catálogo. Avisa al supervisor: no se puede contar.
        </p>
      ) : (
        <div className="px-4 py-1">
          <div aria-hidden="true" className="grid grid-cols-[5rem_9rem_minmax(0,1fr)] gap-4 border-b border-border py-2 text-caption text-text-secondary">
            <span>Denominación</span>
            <span>Unidades</span>
            <span className="text-right">Importe</span>
          </div>
          {denominaciones.map((d) => {
            const k = clave(d.valor);
            const t = (valores[k] ?? "").trim();
            const malo = t !== "" && !/^\d+$/.test(t);
            const nombre = `${d.tipo === "billete" ? "Billetes" : "Monedas"} de ${formatoDeDenominacion(d.valor)} ${currency}`;
            return (
              <div key={k} className="grid grid-cols-[5rem_9rem_minmax(0,1fr)] items-center gap-4 border-b border-border py-1.5 last:border-b-0">
                <span className="flex items-baseline gap-1.5">
                  <span className="pc-numeric text-body-sm font-semibold text-text-primary">{formatoDeDenominacion(d.valor)}</span>
                  <span className="text-caption text-text-secondary">{d.tipo === "billete" ? "billete" : "moneda"}</span>
                </span>
                <Input
                  aria-label={nombre}
                  aria-invalid={malo || undefined}
                  invalid={malo}
                  value={valores[k] ?? ""}
                  onChange={(e) => onChange(k, e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  numeric
                  placeholder="0"
                />
                <span className="pc-numeric truncate text-right text-body-sm text-text-secondary">
                  {/^\d+$/.test(t) && Number(t) > 0 ? formatMoney({ amount: Math.round(Number(t) * d.valor * 100) / 100, currency }) : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {error ? <p className="border-t border-border px-4 py-2 text-caption text-error-foreground">{error}</p> : null}
    </section>
  );
}

/* -------------------------------------------------------------------------
 * Explicar una diferencia
 * ---------------------------------------------------------------------- */

export interface DiferenciaPorExplicar {
  currency: string;
  /** La diferencia de importe; 0 si solo cambió la composición. */
  diferencia: number;
  /** Qué cambió por denominación, si el importe cuadra. */
  composicion?: Readonly<Record<string, number>>;
}

export interface ExplicacionDeDiferencia {
  motivo: string;
  observaciones: string;
  supervisorId: string;
}

export const OBSERVACIONES_MAX = 250;

/** Si a la explicación de esta fila le falta algo para poder enviarla. */
export function explicacionIncompleta(e: ExplicacionDeDiferencia | undefined): boolean {
  if (!e?.motivo) return true;
  if (e.motivo === "Otro" && !e.observaciones.trim()) return true;
  if (pideSupervisor(e.motivo) && !e.supervisorId) return true;
  return false;
}

/**
 * Las filas para explicar las diferencias de una apertura o de un cierre. Una
 * diferencia de importe ofrece los motivos compatibles con su signo; una de
 * composición, sus propias causas. Reposición, retiro y «El supervisor cambió
 * billetes» piden el supervisor de la lista.
 */
export function ExplicarDiferenciasFilas({
  momento,
  filas,
  explicaciones,
  supervisores,
  enviado,
  onChange,
}: {
  momento: "apertura" | "cierre";
  filas: readonly DiferenciaPorExplicar[];
  explicaciones: Record<string, ExplicacionDeDiferencia>;
  supervisores: readonly { id: string; nombre: string }[];
  enviado: boolean;
  onChange: (currency: string, e: ExplicacionDeDiferencia) => void;
}): React.JSX.Element {
  const prefijo = momento === "cierre" ? "cierre" : "apertura";
  return (
    <div className="flex flex-col gap-5">
      {filas.map((f) => {
        const e = explicaciones[f.currency] ?? { motivo: "", observaciones: "", supervisorId: "" };
        const deComposicion = f.diferencia === 0 && f.composicion !== undefined;
        const opciones: readonly string[] = deComposicion
          ? momento === "cierre"
            ? CAJA_COMPOSITION_REASONS_CLOSE
            : CAJA_COMPOSITION_REASONS_OPEN
          : getValidDifferenceReasons(f.diferencia);
        const conSupervisor = pideSupervisor(e.motivo);
        const obligatorias = e.motivo === "Otro";
        const faltaMotivo = enviado && !e.motivo;
        const faltaObs = enviado && obligatorias && !e.observaciones.trim();
        const faltaSup = enviado && conSupervisor && !e.supervisorId;
        const set = (cambio: Partial<ExplicacionDeDiferencia>) => onChange(f.currency, { ...e, ...cambio });
        return (
          <div key={f.currency} className="grid grid-cols-1 items-start gap-4 border-b border-border pb-5 last:border-b-0 last:pb-0 wide:grid-cols-[minmax(11rem,0.8fr)_minmax(15rem,1fr)_minmax(16rem,1.2fr)]">
            <div className="flex items-start gap-2 pt-1">
              <CurrencyFlag currency={f.currency} />
              <span className="min-w-0">
                <span className="block text-body-sm font-semibold">{f.currency}</span>
                <span className="block text-caption text-text-secondary">
                  {deComposicion ? (
                    <>
                      El total cuadra, los billetes no: <span className="pc-numeric">{describirComposicion(f.composicion!)}</span>
                    </>
                  ) : f.diferencia < 0 ? (
                    "Falta efectivo"
                  ) : (
                    "Sobra efectivo"
                  )}
                </span>
              </span>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className="mb-2 text-label text-text-primary">
                  {deComposicion ? "Causa" : "Motivo"} <span className="text-error" aria-hidden="true">*</span>
                </p>
                <Select value={e.motivo} onValueChange={(v) => set({ motivo: v, ...(pideSupervisor(v) ? {} : { supervisorId: "" }) })}>
                  <SelectTrigger
                    {...fieldAria({ id: `${prefijo}-motivo-${f.currency}`, required: true, error: faltaMotivo ? "required" : undefined })}
                    invalid={faltaMotivo}
                  >
                    <SelectValue placeholder={deComposicion ? "Selecciona una causa" : "Selecciona un motivo"} />
                  </SelectTrigger>
                  <SelectContent>
                    {opciones.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {conSupervisor ? (
                <div>
                  <p className="mb-2 text-label text-text-primary">
                    Supervisor <span className="text-error" aria-hidden="true">*</span>
                  </p>
                  <Select value={e.supervisorId} onValueChange={(v) => set({ supervisorId: v })}>
                    <SelectTrigger
                      {...fieldAria({ id: `${prefijo}-supervisor-${f.currency}`, required: true, error: faltaSup ? "required" : undefined })}
                      invalid={faltaSup}
                    >
                      <SelectValue placeholder="¿Quién fue?" />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1.5 text-caption text-text-secondary">El administrador tendrá que confirmarlo.</p>
                </div>
              ) : null}
            </div>
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <label htmlFor={`${prefijo}-observaciones-${f.currency}`} className="text-label text-text-primary">
                  {obligatorias ? (
                    <>
                      Observaciones <span className="text-error" aria-hidden="true">*</span>
                    </>
                  ) : (
                    "Observaciones (opcional)"
                  )}
                </label>
                <span className="text-caption text-text-secondary">
                  {e.observaciones.length}/{OBSERVACIONES_MAX}
                </span>
              </div>
              <textarea
                id={`${prefijo}-observaciones-${f.currency}`}
                aria-required={obligatorias || undefined}
                aria-invalid={faltaObs || undefined}
                value={e.observaciones}
                onChange={(ev) => set({ observaciones: ev.target.value.slice(0, OBSERVACIONES_MAX) })}
                maxLength={OBSERVACIONES_MAX}
                rows={2}
                className={cn(
                  "w-full resize-none rounded-control border bg-surface px-4 py-3 text-body outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
                  faltaObs ? "border-error" : "border-border hover:border-border-strong",
                )}
                placeholder="Añade detalles si es necesario."
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
