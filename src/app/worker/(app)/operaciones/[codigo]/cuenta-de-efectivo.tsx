import * as React from "react";
import { Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatMoney, type Money } from "@/lib/format";
import type { OperationLiquidation } from "@/features/operations/operations-history";
import { entregadoAlCliente } from "@/features/operations/entregado";
import { DetailCard, DetailList, DetailRow } from "./detail-parts";

/**
 * LA CUENTA DEL EFECTIVO de una operación (decisión del 19/11/2026): lo que
 * costó o se debía, lo que cambió de manos en el mostrador y, al final, el
 * total; debajo, lo que entró o salió de la caja, que es lo único que queda
 * en el libro y va siempre neto.
 *
 * Sustituye a las dos tarjetas que había por operación —«Movimiento de
 * efectivo» y «Cómo se movió el efectivo»—, que daban cifras sin relación
 * visible entre sí. El vuelto, lo pagado en CUP y el redondeo a favor de la
 * casa son filas de la cuenta, no movimientos del libro: no llevan recuadro.
 */

export interface FilaDeCuenta {
  etiqueta: string;
  valor: string;
  /** Una segunda línea, más discreta: el desglose de una tarifa, una equivalencia. */
  detalle?: string;
  /** Lo que se resta: en rojo. */
  resta?: boolean;
  /** El total que cierra la cuenta. */
  total?: boolean;
}

export interface MovimientoDelLibro {
  sentido: "entrada" | "salida";
  money: Money;
}

export function CuentaDeEfectivo({
  titulo = "Movimiento de efectivo",
  filas,
  movimientos,
  servicio,
  pie,
}: {
  titulo?: string;
  filas: readonly FilaDeCuenta[];
  movimientos: readonly MovimientoDelLibro[];
  /** «Giro», «Remesa», «Cambio»: rotula el recuadro del libro. */
  servicio: string;
  /** Moneda, operación vinculada: lo que va debajo, si la pantalla lo pide. */
  pie?: React.ReactNode;
}): React.JSX.Element {
  return (
    <DetailCard title={titulo} icon={Wallet} contentClassName="gap-5">
      <DetailList>
        {filas.map((f) => (
          <DetailRow
            key={f.etiqueta}
            label={f.etiqueta}
            value={
              <span className="flex flex-col items-end">
                <span className={cn(f.resta && "text-error-foreground")}>{f.valor}</span>
                {f.detalle ? <span className="text-caption font-normal text-text-secondary">{f.detalle}</span> : null}
              </span>
            }
            numeric
            strong={f.total ?? false}
          />
        ))}
      </DetailList>

      {/* Uno debajo de otro: la tarjeta del cambio vive en una columna estrecha. */}
      <div className="flex flex-col gap-3">
        {movimientos.map((m) => (
          <RecuadroDelLibro key={`${m.sentido}-${m.money.currency}`} movimiento={m} servicio={servicio} />
        ))}
      </div>

      {pie}
    </DetailCard>
  );
}

function RecuadroDelLibro({ movimiento: m, servicio }: { movimiento: MovimientoDelLibro; servicio: string }) {
  const entra = m.sentido === "entrada";
  return (
    <div
      className={cn(
        "rounded-control border px-4 py-3 text-center",
        entra ? "border-success-border bg-success-subtle" : "border-error-border bg-error-subtle",
      )}
    >
      <p className={cn("text-caption", entra ? "text-success-foreground" : "text-error-foreground")}>
        {entra ? "Entrada en caja" : "Salida de caja"} — {servicio}
      </p>
      <p
        className={cn(
          "mt-1 pc-numeric text-section-title font-semibold",
          entra ? "text-success-foreground" : "text-error-foreground",
        )}
      >
        {entra ? "+" : "−"}
        {formatMoney(m.money)}
      </p>
    </div>
  );
}

/**
 * Las filas de un pago (cobrar un giro, pagar una remesa, lo que recibe el
 * cliente de un cambio): lo que se debía, lo que quedó a favor de la casa por
 * redondeo, lo que se pagó en CUP en lugar de la moneda, y lo que se entregó.
 * Si se entregó justo lo debido, basta la primera fila.
 */
export function filasDeUnPago(
  debido: Money,
  etiquetaDebido: string,
  l: OperationLiquidation | undefined,
  etiquetaEntregado = "Entregado",
): FilaDeCuenta[] {
  const m = formatMoney;
  const filas: FilaDeCuenta[] = [{ etiqueta: etiquetaDebido, valor: m(debido) }];
  const entregado = entregadoAlCliente(debido, l);
  const igual = entregado.length === 1 && entregado[0]!.currency === debido.currency && Math.abs(entregado[0]!.amount - debido.amount) < 0.005;
  if (igual) return filas;

  for (const f of l?.aFavorDeLaCasa ?? []) {
    if (f.currency !== debido.currency) continue;
    filas.push({ etiqueta: "Redondeo a favor de la casa", valor: `−${m({ amount: f.importe, currency: f.currency })}`, resta: true });
  }
  if (l?.enCup && l.enCup.equivale.currency === debido.currency) {
    filas.push({
      etiqueta: "Pagado en CUP por falta de billetes",
      valor: `−${m({ amount: l.enCup.equivale.importe, currency: l.enCup.equivale.currency })}`,
      detalle: `En su lugar, ${m({ amount: l.enCup.importe, currency: "CUP" })}`,
      resta: true,
    });
  }
  for (const f of l?.aFavorDeLaCasa ?? []) {
    if (f.currency === debido.currency || f.currency !== "CUP" || !l?.enCup) continue;
    filas.push({ etiqueta: "Redondeo a favor de la casa en CUP", valor: m({ amount: f.importe, currency: f.currency }), detalle: "De lo que había que pagar en CUP" });
  }
  entregado.forEach((e, i) =>
    filas.push({
      etiqueta: entregado.length === 1 ? etiquetaEntregado : i === 0 ? `${etiquetaEntregado} en ${e.currency}` : `${etiquetaEntregado} en CUP`,
      valor: m(e),
      total: true,
    }),
  );
  return filas;
}

/** Lo que salió de la caja con un pago: lo entregado, por moneda. */
export function salidasDeUnPago(debido: Money, l: OperationLiquidation | undefined): MovimientoDelLibro[] {
  return entregadoAlCliente(debido, l)
    .filter((e) => e.amount > 0)
    .map((money) => ({ sentido: "salida" as const, money }));
}
