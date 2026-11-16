import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Un elemento de una lista compacta (las de dentro de una ficha) que lleva a
 * su detalle. Sigue la misma regla que las tablas (12/11/2026): se toca el
 * elemento entero, con un `›` al final, y el nombre no se subraya. Dentro no
 * puede haber otro enlace: todo el elemento es uno.
 *
 * Va dentro de un `<ul className="flex flex-col divide-y divide-border">`.
 */
export function ElementoDeLista({
  href,
  label,
  className,
  children,
}: {
  href: string;
  /** Nombre accesible, si el contenido no lo dice bien por sí solo. */
  label?: string;
  /** Clases del contenido (distribución de lo que va a la izquierda del `›`). */
  className?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <li className="first:-mt-3 last:-mb-3">
      <Link
        href={href as Route}
        aria-label={label}
        className="-mx-3 flex items-center gap-3 rounded-control px-3 py-3 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className={cn("min-w-0 flex-1", className)}>{children}</div>
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-text-secondary" />
      </Link>
    </li>
  );
}
