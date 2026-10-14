import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";

/**
 * Una tabla que en un teléfono deja de ser una tabla — **FR-AD-SHELL-13**.
 *
 * Por debajo de 1024px cada fila se representa como una tarjeta con sus datos
 * etiquetados. No se recurre al desplazamiento horizontal: en un móvil es un
 * gesto que casi nadie descubre, y una tabla financiera medio asomada se lee
 * mal en las dos mitades.
 *
 * Lo que hace que esto valga la pena es que **las columnas se declaran una
 * sola vez**. La alternativa —escribir la tabla y la lista de tarjetas por
 * separado, como se resolvió a mano en Inicio— duplica cada celda y garantiza
 * que tarde o temprano una de las dos se quede sin un dato que la otra sí
 * muestra.
 *
 * La tarjeta no es la tabla apilada: tiene un **título**, que es el dato por
 * el que alguien reconoce la fila, y una **marca de estado** opcional a su
 * derecha. El resto de columnas caen debajo como pares etiqueta/valor. Por eso
 * una columna puede marcarse `hiddenOnCard`: la que ya es el título no se
 * repite abajo.
 */
export interface ResponsiveColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Alinea a la derecha y usa cifras tabulares (§17 «Números»). */
  numeric?: boolean;
  /** Se representa en la tabla pero no en la tarjeta: ya está en el título o en la marca. */
  hiddenOnCard?: boolean;
}

export interface ResponsiveTableProps<T> {
  rows: readonly T[];
  columns: readonly ResponsiveColumn<T>[];
  rowKey: (row: T) => string;
  /** Lo que encabeza la tarjeta: el dato por el que se reconoce la fila. */
  cardTitle: (row: T) => React.ReactNode;
  /** Marca de estado a la derecha del título, si la fila tiene una. */
  cardBadge?: (row: T) => React.ReactNode;
  /** Línea secundaria bajo el título — dirección, localidad, lo que sitúe la fila. */
  cardSubtitle?: (row: T) => React.ReactNode;
  /**
   * Acciones de la fila, al pie de la tarjeta. Van aparte de las columnas
   * porque un botón dentro de un par etiqueta/valor se lee como un dato: la
   * columna que los lleva en la tabla se marca `hiddenOnCard`.
   */
  cardFooter?: (row: T) => React.ReactNode;
  /** Qué decir cuando no hay ni una fila. Los dos vacíos —sin datos y sin resultados— nunca comparten mensaje (**FR-AD-STATE-1**). */
  empty: React.ReactNode;
  className?: string;
}

export function ResponsiveTable<T>({
  rows,
  columns,
  rowKey,
  cardTitle,
  cardBadge,
  cardSubtitle,
  cardFooter,
  empty,
  className,
}: ResponsiveTableProps<T>): React.JSX.Element {
  if (rows.length === 0) {
    return (
      <div
        className={cn(
          "rounded-card border border-border bg-surface px-6 py-12 text-center",
          className,
        )}
      >
        {empty}
      </div>
    );
  }

  const cardColumns = columns.filter((column) => !column.hiddenOnCard);

  return (
    <div className={className}>
      {/* Teléfono y tableta. */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {rows.map((row) => {
          // Un subtítulo vacío no debe dejar un párrafo en blanco: hay filas
          // que lo tienen (una caja retirada) y filas que no.
          const subtitle = cardSubtitle?.(row);

          return (
          <li key={rowKey(row)}>
            <article className="rounded-card border border-border bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-body font-semibold text-text-primary">{cardTitle(row)}</div>
                  {subtitle ? (
                    <p className="mt-1 text-body-sm text-text-secondary">{subtitle}</p>
                  ) : null}
                </div>
                {cardBadge ? <div className="shrink-0">{cardBadge(row)}</div> : null}
              </div>

              {cardColumns.length > 0 ? (
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4">
                  {cardColumns.map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-caption uppercase tracking-wide text-text-secondary">
                        {column.header}
                      </dt>
                      <dd
                        className={cn(
                          "mt-1 text-body-sm text-text-primary",
                          column.numeric && "pc-numeric font-semibold",
                        )}
                      >
                        {column.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {cardFooter ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  {cardFooter(row)}
                </div>
              ) : null}
            </article>
          </li>
          );
        })}
      </ul>

      {/* Escritorio. */}
      <TableContainer className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} numeric={column.numeric}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((column) => (
                  <TableCell key={column.key} numeric={column.numeric}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
