"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  Banknote,
  CircleDollarSign,
  ClipboardCheck,
  LayoutGrid,
  Printer,
  SlidersHorizontal,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { CajaAction } from "@/features/caja/caja-data";

/** Route-scoped: these ids only ever appear on this screen's action grid. */
const ACTION_ICON: Readonly<Record<string, LucideIcon>> = {
  "imprimir-resumen": Printer,
  "fondeo-inicial": Banknote,
  "anadir-moneda": CircleDollarSign,
  "ajustar-efectivo": SlidersHorizontal,
  arqueo: ClipboardCheck,
};

/**
 * "Acciones de caja" — what a worker can do today, laid out beside the
 * capabilities the module will grow into. A disabled tile normally carries an
 * "Próximamente" badge (the same neutral, development-state language already
 * established by `ServiceCard` on Nueva operación), signalling real roadmap
 * rather than a closed, finished screen. An action can also be disabled for a
 * different, true reason (`action.disabledLabel`) — e.g. "Registrar fondeo
 * inicial" once a jornada is already open — in which case that reason is
 * shown instead, since "Próximamente" would misreport a flow that already
 * ran successfully as merely unbuilt.
 */
export function CajaActionsCard({
  actions,
  onPrint,
}: {
  actions: readonly CajaAction[];
  onPrint: () => void;
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
          >
            <LayoutGrid className="size-[18px]" />
          </span>
          <CardTitle>Acciones de caja</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 wide:grid-cols-3">
          {actions.map((action) => {
            const Icon = ACTION_ICON[action.id] ?? Wallet;
            const available = action.availability === "available";

            const tileClassName = cn(
              "flex h-full w-full flex-col items-start gap-2 rounded-control border p-4 text-left",
              "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
              "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
              available
                ? "border-border bg-surface hover:border-border-navy hover:bg-primary-subtle"
                : "cursor-not-allowed border-border bg-surface-subtle",
            );

            const content = (
              <>
                <span className="flex w-full items-start justify-between gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-control",
                      available ? "bg-primary-subtle text-primary" : "bg-surface text-text-secondary",
                    )}
                  >
                    <Icon className="size-[18px]" />
                  </span>
                  {!available ? (
                    <Badge variant={action.disabledLabel ? "success" : "neutral"}>
                      {action.disabledLabel ?? "Próximamente"}
                    </Badge>
                  ) : null}
                </span>

                <span
                  className={cn(
                    "text-body font-semibold",
                    available ? "text-text-primary" : "text-text-secondary",
                  )}
                >
                  {action.label}
                </span>
                <span className="text-body-sm text-text-secondary">{action.description}</span>
              </>
            );

            return (
              <li key={action.id}>
                {available && action.href ? (
                  <Link href={action.href as Route} className={tileClassName}>
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={!available}
                    onClick={available && action.id === "imprimir-resumen" ? onPrint : undefined}
                    className={tileClassName}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
