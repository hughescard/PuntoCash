import * as React from "react";

import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { CurrencyFlag } from "@/components/patterns/currency-flag";
import type { TramoDeTarifa } from "@/features/network/tarifas-reglas";
import { importe, porcentaje, textoDelTramo } from "@/lib/formato-de-tarifa";

/**
 * La tarifa de giros de una moneda, tal como la leen Super administración y
 * Admin de sede: la moneda y su tabla de tramos. Lo que cada consola hace con
 * ella (cambiarla, retirarla o solo leerla) va alrededor.
 */

export interface TramoMostrado extends TramoDeTarifa {
  /** Dónde empieza el tramo: el giro mínimo, o justo por encima del límite anterior. */
  desde: number;
  incluido: boolean;
}

export function MonedaDeTarifa({
  code,
  nombre,
  retirada = false,
}: {
  code: string;
  nombre: string;
  retirada?: boolean;
}): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2.5">
      <CurrencyFlag currency={code} />
      <span className="flex flex-col leading-tight">
        <span className="pc-numeric font-semibold text-text-primary">
          {code}
          {retirada ? (
            <span className="ml-2 align-middle">
              <Badge variant="warning">Retirada del catálogo</Badge>
            </span>
          ) : null}
        </span>
        <span className="text-caption text-text-secondary">{nombre}</span>
      </span>
    </span>
  );
}

/** Lo que se cobra en un tramo: «3,00 USD», «2 %» o «1,00 USD + 2 %». */
export function tarifaDelTramo(t: Pick<TramoDeTarifa, "fijo" | "porcentaje">, code: string): string {
  const partes = [t.fijo > 0 ? `${importe(t.fijo)} ${code}` : null, t.porcentaje > 0 ? porcentaje(t.porcentaje) : null];
  return partes.filter(Boolean).join(" + ");
}

/**
 * Los tramos de una moneda. En el teléfono, una lista: tres columnas con
 * cabeceras largas no caben en 390. Va pegada al borde inferior de su tarjeta.
 */
export function TramosDeTarifa({
  code,
  tramos,
}: {
  code: string;
  tramos: readonly TramoMostrado[];
}): React.JSX.Element {
  return (
    <>
      <ul className="divide-y divide-border border-t border-border sm:hidden">
        {tramos.map((t, i) => (
          <li key={i} className="px-6 py-3">
            <p className="pc-numeric text-body-sm font-medium text-text-primary">{textoDelTramo(t)}</p>
            <p className="pc-numeric mt-0.5 text-body-sm text-text-secondary">Tarifa: {tarifaDelTramo(t, code)}</p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto border-t border-border sm:block">
        <Table aria-label={`Tramos de la tarifa de giros en ${code}`}>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Lo que recibe el beneficiario ({code})</TableHead>
              <TableHead numeric>Fijo ({code})</TableHead>
              <TableHead numeric className="pr-6">
                Porcentaje
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tramos.map((t, i) => (
              <TableRow key={i}>
                <TableCell className="pc-numeric pl-6 text-text-primary">{textoDelTramo(t)}</TableCell>
                <TableCell numeric className="pc-numeric">
                  {t.fijo > 0 ? importe(t.fijo) : <span className="text-text-secondary">—</span>}
                </TableCell>
                <TableCell numeric className="pc-numeric pr-6">
                  {t.porcentaje > 0 ? porcentaje(t.porcentaje) : <span className="text-text-secondary">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
