import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Page-number pagination for a list already loaded client-side — no infinite
 * scroll, no separate routes per page. Numbered pages are windowed around the
 * current one (first, current−1..current+1, last), with an ellipsis for the
 * gap, matching "Anterior | 1 | 2 | 3 | … | 7 | Siguiente".
 */

/** Page numbers to render, with `"ellipsis"` marking a collapsed run. */
function buildPageWindow(page: number, totalPages: number): (number | "ellipsis")[] {
  const window = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const pages = [...window].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const result: (number | "ellipsis")[] = [];
  for (const [index, p] of pages.entries()) {
    if (index > 0 && p - pages[index - 1]! > 1) result.push("ellipsis");
    result.push(p);
  }
  return result;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}): React.JSX.Element | null {
  if (totalPages <= 1) return null;

  const items = buildPageWindow(page, totalPages);

  return (
    <nav aria-label="Paginación" className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={cn(
          "flex h-control-sm items-center gap-1.5 rounded-control px-3 text-label font-medium text-text-primary",
          "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
          "hover:bg-primary-subtle disabled:pointer-events-none disabled:text-text-secondary",
          "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
        )}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Anterior
      </button>

      <ul className="flex items-center gap-1">
        {items.map((item, index) =>
          item === "ellipsis" ? (
            <li key={`ellipsis-${index}`} aria-hidden="true" className="px-1.5 text-text-secondary">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-current={item === page ? "page" : undefined}
                onClick={() => onPageChange(item)}
                className={cn(
                  "grid size-9 place-items-center rounded-control text-label font-medium",
                  "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
                  "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
                  item === page
                    ? "bg-primary text-primary-foreground"
                    : "text-text-primary hover:bg-primary-subtle",
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={cn(
          "flex h-control-sm items-center gap-1.5 rounded-control px-3 text-label font-medium text-text-primary",
          "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
          "hover:bg-primary-subtle disabled:pointer-events-none disabled:text-text-secondary",
          "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
        )}
      >
        Siguiente
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
