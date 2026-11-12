"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { CircleCheck, Clock } from "lucide-react";

import { Button, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, fieldAria } from "@/components/ui";
import { BilletesDelMovimiento } from "@/components/patterns/billetes-del-movimiento";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import type { Denominacion } from "@/features/caja/billetes";
import { findCajaCurrency } from "@/features/caja/caja-data";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MovimientoRegistrado } from "../../../_actions";

/**
 * Las piezas que comparten Reposición o retiro y Cambio de billetes (bloque 3,
 * decisión del 10/11/2026): elegir moneda y supervisor, las observaciones, una
 * elección entre dos, y la pantalla final.
 */

export const CAJA_ROUTE = "/worker/caja" as Route;
export const OBSERVACIONES_MAX = 200;

/** Por qué no se registró, en palabras del trabajador. */
export const ERRORES: Readonly<Record<string, string>> = {
  "moneda-no-habilitada": "Esa moneda no está habilitada en esta caja.",
  "supervisor-requerido": "Elige al supervisor de la lista.",
  "conteo-invalido": "Escribe al menos un billete.",
  "denominacion-invalida": "Revisa los billetes: alguno no es de esa moneda o no es un número entero.",
  "sin-denominaciones": "Esta moneda no tiene billetes en el catálogo. Avisa al supervisor.",
  "sin-esos-billetes":
    "Contada la caja, esos billetes no están. No se registró nada: revisad con el supervisor qué billetes salen de verdad.",
  "sin-cambio-exacto": "La caja no tiene billetes para darle ese importe exacto sin devolverle los mismos. No se registró nada.",
  "cambio-descuadrado": "Lo que entra y lo que sale tienen que sumar lo mismo.",
  "cambio-sin-efecto": "Entran y salen los mismos billetes: no hay nada que cambiar.",
  bloqueada: "La sede no está operando: no se puede registrar.",
  "cierre-forzado": "El administrador cerró tu jornada. Esto no se registró.",
  "jornada-no-abierta": "La jornada ya no está abierta: quizá la administración forzó su cierre.",
  "jornada-de-otro": "La jornada de esta caja es de otro trabajador.",
};

export const errorDe = (reason: string): string => ERRORES[reason] ?? "No se pudo registrar. Vuelve a Caja y comprueba su estado.";

/** Dos opciones excluyentes, como tarjetas: tipo de movimiento o con quién se cambia. */
export function ElegirUno<T extends string>({
  nombre,
  etiqueta,
  opciones,
  valor,
  onChange,
  error,
}: {
  nombre: string;
  etiqueta: string;
  opciones: readonly { valor: T; titulo: string; detalle: string }[];
  valor: T | null;
  onChange: (v: T) => void;
  error?: string;
}): React.JSX.Element {
  return (
    <fieldset>
      <legend className="mb-2 text-label text-text-primary">
        {etiqueta} <span className="text-error" aria-hidden="true">*</span>
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {opciones.map((o) => (
          <label
            key={o.valor}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-control border p-4",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
              valor === o.valor ? "border-primary bg-primary-subtle" : "border-border bg-surface hover:border-border-navy",
              error && valor === null ? "border-error" : "",
            )}
          >
            <input
              type="radio"
              name={nombre}
              value={o.valor}
              checked={valor === o.valor}
              onChange={() => onChange(o.valor)}
              className="mt-1 size-4 accent-primary"
            />
            <span>
              <span className="block text-body font-semibold text-text-primary">{o.titulo}</span>
              <span className="block text-body-sm text-text-secondary">{o.detalle}</span>
            </span>
          </label>
        ))}
      </div>
      {error && valor === null ? <p className="mt-1.5 text-caption text-error-foreground">{error}</p> : null}
    </fieldset>
  );
}

export function ElegirMoneda({
  id,
  monedas,
  valor,
  onChange,
  error,
}: {
  id: string;
  monedas: readonly string[];
  valor: string;
  onChange: (v: string) => void;
  error?: string;
}): React.JSX.Element {
  return (
    <div>
      <p className="mb-2 text-label text-text-primary">
        Moneda <span className="text-error" aria-hidden="true">*</span>
      </p>
      <Select value={valor} onValueChange={onChange}>
        <SelectTrigger {...fieldAria({ id, required: true, error: error ? "required" : undefined })} invalid={!!error}>
          <SelectValue placeholder="Selecciona la moneda" />
        </SelectTrigger>
        <SelectContent>
          {monedas.map((c) => (
            <SelectItem key={c} value={c}>
              <span className="flex items-center gap-2">
                <CurrencyFlag currency={c} />
                {c} · {findCajaCurrency(c)?.name ?? c}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="mt-1.5 text-caption text-error-foreground">{error}</p> : null}
    </div>
  );
}

export function ElegirSupervisor({
  id,
  supervisores,
  valor,
  onChange,
  error,
}: {
  id: string;
  supervisores: readonly { id: string; nombre: string }[];
  valor: string;
  onChange: (v: string) => void;
  error?: string;
}): React.JSX.Element {
  return (
    <div>
      <p className="mb-2 text-label text-text-primary">
        Supervisor <span className="text-error" aria-hidden="true">*</span>
      </p>
      <Select value={valor} onValueChange={onChange}>
        <SelectTrigger {...fieldAria({ id, required: true, error: error ? "required" : undefined })} invalid={!!error}>
          <SelectValue placeholder="¿Quién es?" />
        </SelectTrigger>
        <SelectContent>
          {supervisores.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p className="mt-1.5 text-caption text-error-foreground">{error}</p>
      ) : (
        <p className="mt-1.5 text-caption text-text-secondary">Ese supervisor tendrá que confirmarlo desde su consola.</p>
      )}
    </div>
  );
}

export function Observaciones({ id, valor, onChange }: { id: string; valor: string; onChange: (v: string) => void }): React.JSX.Element {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={id} className="text-label text-text-primary">
          Observaciones (opcional)
        </label>
        <span className="text-caption text-text-secondary">
          {valor.length}/{OBSERVACIONES_MAX}
        </span>
      </div>
      <textarea
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value.slice(0, OBSERVACIONES_MAX))}
        maxLength={OBSERVACIONES_MAX}
        rows={2}
        className="w-full resize-none rounded-control border border-border bg-surface px-4 py-3 text-body outline-none hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
      />
    </div>
  );
}

/** Una fila de un resumen: etiqueta a la izquierda, valor a la derecha. */
export function Linea({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 first:pt-0 last:border-b-0 last:pb-0">
      <dt className="shrink-0 text-body-sm text-text-secondary">{etiqueta}</dt>
      <dd className="min-w-0 text-right text-body-sm font-medium text-text-primary">{valor}</dd>
    </div>
  );
}

/** Registrado: qué quedó y, si toca, quién tiene que confirmarlo. */
export function Registrado({
  titulo,
  movimiento,
  tipos,
  pendienteDe,
  leyenda,
}: {
  titulo: string;
  movimiento: MovimientoRegistrado;
  tipos: readonly Denominacion[];
  /** El supervisor que tiene que confirmarlo; sin él, no pasa por aprobación. */
  pendienteDe?: string;
  leyenda?: string;
}): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center">
      <span aria-hidden="true" className="grid size-14 place-items-center rounded-pill border-2 border-success text-success">
        <CircleCheck className="size-8" />
      </span>
      <h1 className="mt-5 text-center text-screen-title text-text-primary">{titulo}</h1>
      <p className="mt-2 text-center text-body text-text-secondary">
        {movimiento.id} · {formatDateTime(new Date(movimiento.fechaHora))}
      </p>
      {pendienteDe ? (
        <p className="mt-4 flex items-center gap-2 rounded-control border border-warning-border bg-warning-subtle px-4 py-2.5 text-body-sm text-warning-foreground">
          <Clock className="size-4 shrink-0" aria-hidden="true" />
          Ya está en la caja. Queda pendiente de que {pendienteDe} lo confirme.
        </p>
      ) : null}
      <Card className="mt-8 w-full">
        <CardContent className="flex flex-col gap-5 pt-6">
          <dl className="flex flex-col">
            <Linea etiqueta="Concepto" valor={movimiento.concepto} />
            <Linea etiqueta="Moneda" valor={movimiento.currency} />
            {movimiento.amount !== 0 ? <Linea etiqueta="Importe" valor={formatMoney({ amount: Math.abs(movimiento.amount), currency: movimiento.currency })} /> : null}
            {movimiento.supervisor ? <Linea etiqueta="Supervisor" valor={movimiento.supervisor} /> : null}
            {movimiento.observaciones ? <Linea etiqueta="Observaciones" valor={movimiento.observaciones} /> : null}
          </dl>
          <BilletesDelMovimiento billetes={movimiento.billetes} currency={movimiento.currency} tipos={tipos} {...(leyenda ? { leyenda } : {})} />
        </CardContent>
      </Card>
      <div className="pc-botonera mt-8 sm:justify-center">
        <Button variant="secondary" asChild>
          <Link href={`/worker/caja/movimientos/${movimiento.id}` as Route}>Ver el movimiento y su comprobante</Link>
        </Button>
        <Button asChild>
          <Link href={CAJA_ROUTE}>Ir a Caja</Link>
        </Button>
      </div>
    </div>
  );
}
