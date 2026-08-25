import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * PuntoCash Table primitives — manual §17 "Tablas y visualización de datos".
 *
 *   Cabecera          Fondo gris claro o tratamiento sobrio; etiquetas claras.
 *   Altura de fila    52-56px.
 *   Números           Alineación a la derecha; mismas reglas de formato.
 *   Estados           Usar badges; no colorear filas completas.
 *   Divisores         Líneas horizontales sutiles; evitar líneas verticales.
 *   Hover / selección Sutil; la selección puede incorporar acento dorado.
 */

const TableContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function TableContainer({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("overflow-x-auto rounded-card border border-border bg-surface", className)}
        {...props}
      />
    );
  },
);

const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  function Table({ className, ...props }, ref) {
    return (
      <table
        ref={ref}
        className={cn("w-full caption-bottom border-collapse text-body-sm", className)}
        {...props}
      />
    );
  },
);

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(function TableHeader({ className, ...props }, ref) {
  return <thead ref={ref} className={cn("bg-surface-subtle", className)} {...props} />;
});

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(function TableBody({ className, ...props }, ref) {
  return <tbody ref={ref} className={className} {...props} />;
});

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(function TableFooter({ className, ...props }, ref) {
  return (
    <tfoot
      ref={ref}
      className={cn("border-t border-border bg-surface-subtle font-medium", className)}
      {...props}
    />
  );
});

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  /** Adds hover feedback for rows that navigate somewhere. */
  interactive?: boolean;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { className, selected, interactive, ...props },
  ref,
) {
  return (
    <tr
      ref={ref}
      data-state={selected ? "selected" : undefined}
      aria-selected={selected || undefined}
      className={cn(
        "border-b border-border last:border-b-0",
        "transition-colors duration-(--duration-instant) ease-(--ease-standard)",
        interactive && "cursor-pointer hover:bg-surface-subtle",
        /* Selection: a controlled gold accent, not a filled row (§17).
           Secondary text darkens on the tint so it still clears AA (§20). */
        selected &&
          "bg-accent-subtle hover:bg-accent-subtle [--color-text-secondary:var(--color-text-secondary-strong)]",
        className,
      )}
      {...props}
    />
  );
});

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Right-aligns the column for figures (§17 "Números"). */
  numeric?: boolean;
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(function TableHead(
  { className, numeric, ...props },
  ref,
) {
  return (
    <th
      ref={ref}
      scope="col"
      className={cn(
        "h-12 px-4 text-left align-middle",
        "text-overline uppercase text-text-secondary",
        numeric && "text-right",
        className,
      )}
      {...props}
    />
  );
});

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { className, numeric, ...props },
  ref,
) {
  return (
    <td
      ref={ref}
      className={cn(
        /* 56px row height comes from the cell's min height (§17). */
        "h-row px-4 align-middle text-text-primary",
        numeric && "pc-numeric text-right",
        className,
      )}
      {...props}
    />
  );
});

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(function TableCaption({ className, ...props }, ref) {
  return <caption ref={ref} className={cn("mt-3 text-caption text-text-secondary", className)} {...props} />;
});

/** Centred placeholder for a table with no rows. */
function TableEmptyState({
  icon,
  title,
  description,
  action,
  colSpan,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  colSpan: number;
}): React.JSX.Element {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12">
        <div className="flex flex-col items-center gap-2 text-center">
          {icon ? <div className="mb-1 text-text-secondary [&_svg]:size-6">{icon}</div> : null}
          <p className="text-card-title text-text-primary">{title}</p>
          {description ? (
            <p className="max-w-sm text-body-sm text-text-secondary">{description}</p>
          ) : null}
          {action ? <div className="mt-2">{action}</div> : null}
        </div>
      </td>
    </tr>
  );
}

export {
  TableContainer,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableEmptyState,
};
