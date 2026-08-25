import * as React from "react";
import Link from "next/link";
import type { Route } from "next";

import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { WorkerService } from "@/features/operations/services";

/**
 * One selectable service on the Nueva operación screen.
 *
 * An operational selector, not a product card: white surface, 12px radius,
 * hairline border, navy line icon, no imagery and no promotional treatment
 * (§16 "Tarjetas y contenedores").
 *
 * The whole card is the link, so the accessible name reads as
 * "Cambio de moneda · Compra y venta entre divisas. · Disponible" — status
 * included, never signalled by colour alone (§20).
 */
export function ServiceCard({ service }: { service: WorkerService }): React.JSX.Element {
  const { icon: Icon, status } = service;
  const available = status === "available";

  return (
    <Link
      href={`/worker/nueva-operacion/${service.slug}` as Route}
      className={cn(
        "group flex h-full w-full gap-3 rounded-card border bg-surface p-4",
        "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
        "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
        available
          ? // The one service ready to run carries the brand accent (§3).
            "border-gold hover:bg-accent-subtle"
          : "border-border hover:border-border-navy hover:bg-primary-subtle",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-control text-primary",
          available ? "bg-accent-subtle group-hover:bg-surface" : "bg-primary-subtle",
        )}
      >
        <Icon className="size-5" />
      </span>

      <span className="flex min-w-0 flex-col items-start gap-1">
        {/* 15px rather than the 16px card title: at four columns the longest
            service names would otherwise wrap onto a second line. */}
        <span className="text-body font-semibold text-text-primary">{service.name}</span>
        <span className="text-body-sm text-text-secondary">{service.description}</span>

        {/* Pushed to the foot so every card in a row aligns its status. */}
        <span className="mt-auto pt-2">
          {available ? (
            <Badge variant="success">Disponible</Badge>
          ) : (
            /* A development state, not an operational warning — neutral. */
            <Badge variant="neutral">En construcción</Badge>
          )}
        </span>
      </span>
    </Link>
  );
}
