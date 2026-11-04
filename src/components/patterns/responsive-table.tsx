import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";

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
import { ClickableRow } from "./clickable-row";

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
  /**
   * La etiqueta en la tarjeta, si la cabecera de la tabla no sirve para eso
   * —una cabecera que es un botón de ordenar, por ejemplo—.
   */
  cardHeader?: React.ReactNode;
  /** Si la tabla está ordenada por esta columna, y en qué sentido (`aria-sort`). */
  sort?: "ascending" | "descending" | "none";
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
  /**
   * Si la fila se abre entera: la tarjeta se toca en cualquier parte y la fila
   * de la tabla se pulsa en cualquier parte, con un `›` al final que es el
   * enlace real (teclado, abrir en otra pestaña). Para cosas sin nombre propio
   * —una jornada—, donde ningún dato de la fila debe hacer de enlace. Un
   * enlace dentro de una celda sigue llevando a lo suyo si lleva la clase
   * `relative z-10`, que lo pone por encima del enlace de la tarjeta.
   */
  rowLink?: (row: T) => { href: string; label: string } | null;
  /** Qué decir cuando no hay ni una fila. Los dos vacíos —sin datos y sin resultados— nunca comparten mensaje (**FR-AD-STATE-1**). */
  empty: React.ReactNode;
  /**
   * Desde qué ancho se ve la tabla. Por defecto `lg` (1024px). Una tabla con
   * muchas columnas no cabe junto a la barra lateral a 1024 —le quedan unos
   * 720px— y se pasa a `xl` para que la tableta vea tarjetas en vez de una
   * tabla recortada.
   */
  tablaDesde?: "lg" | "xl";
  /**
   * Tarjetas en dos columnas desde 768px. En una tableta una lista larga de
   * tarjetas a todo lo ancho deja media pantalla vacía en cada una y obliga a
   * desplazarse el doble; en el teléfono siguen siendo una columna.
   */
  tarjetasEnDosColumnas?: boolean;
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
  rowLink,
  empty,
  tablaDesde = "lg",
  tarjetasEnDosColumnas = false,
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
      <ul className={cn(tarjetasEnDosColumnas ? "grid gap-3 md:grid-cols-2" : "flex flex-col gap-3", tablaDesde === "xl" ? "xl:hidden" : "lg:hidden")}>
        {rows.map((row) => {
          // Un subtítulo vacío no debe dejar un párrafo en blanco: hay filas
          // que lo tienen (una caja retirada) y filas que no.
          const subtitle = cardSubtitle?.(row);
          const link = rowLink?.(row);

          return (
          <li key={rowKey(row)}>
            <article
              className={cn(
                "rounded-card border border-border bg-surface p-5 shadow-card",
                link && "relative transition-colors hover:border-border-strong active:bg-surface-subtle",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-body font-semibold text-text-primary">{cardTitle(row)}</div>
                  {subtitle ? (
                    <p className="mt-1 text-body-sm text-text-secondary">{subtitle}</p>
                  ) : null}
                </div>
                {cardBadge || link ? (
                  <div className="flex shrink-0 items-center gap-2">
                    {cardBadge?.(row)}
                    {link ? <ChevronRight aria-hidden="true" className="size-5 text-text-secondary" /> : null}
                  </div>
                ) : null}
              </div>

              {cardColumns.length > 0 ? (
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4">
                  {cardColumns.map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-caption uppercase tracking-wide text-text-secondary">
                        {column.cardHeader ?? column.header}
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

              {/* Encima de todo, salvo los enlaces de dentro que lo piden: la tarjeta entera abre. */}
              {link ? (
                <Link
                  href={link.href as Route}
                  aria-label={link.label}
                  className="absolute inset-0 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              ) : null}
            </article>
          </li>
          );
        })}
      </ul>

      {/* Escritorio. */}
      <TableContainer className={cn("hidden", tablaDesde === "xl" ? "xl:block" : "lg:block")}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} numeric={column.numeric} aria-sort={column.sort}>
                  {column.header}
                </TableHead>
              ))}
              {rowLink ? (
                <TableHead>
                  <span className="sr-only">Abrir</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const celdas = columns.map((column) => (
                <TableCell key={column.key} numeric={column.numeric}>
                  {column.cell(row)}
                </TableCell>
              ));
              const link = rowLink?.(row);
              return link ? (
                <ClickableRow key={rowKey(row)} href={link.href}>
                  {celdas}
                  <TableCell className="w-10 pr-4 text-right">
                    <Link
                      href={link.href as Route}
                      aria-label={link.label}
                      className="inline-flex size-8 items-center justify-center rounded-control text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <ChevronRight aria-hidden="true" className="size-5" />
                    </Link>
                  </TableCell>
                </ClickableRow>
              ) : rowLink ? (
                /* En una tabla donde las filas se abren, la que no tiene adónde ir conserva la celda. */
                <TableRow key={rowKey(row)}>
                  {celdas}
                  <TableCell className="w-10" />
                </TableRow>
              ) : (
                <TableRow key={rowKey(row)}>{celdas}</TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
