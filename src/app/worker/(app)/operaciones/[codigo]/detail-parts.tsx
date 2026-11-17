import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks for the Operation Detail screen.
 *
 * Kept separate from both the page and the service-specific blocks so a future
 * service detail (Remesa, Extracción…) composes the same card shell, the same
 * label/value row and the same glyph treatment instead of re-inventing them.
 */

/** Quiet navy glyph identifying each card — the product-wide card convention. */
export function CardGlyph({ icon: Icon }: { icon: LucideIcon }): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary"
    >
      <Icon className="size-[18px]" />
    </span>
  );
}

/** A titled card with the standard glyph header, used by every detail block. */
export function DetailCard({
  title,
  icon,
  className,
  contentClassName,
  children,
}: {
  title: string;
  icon: LucideIcon;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <CardGlyph icon={icon} />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className={cn("flex flex-col", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

/**
 * One label/value line inside a detail card. Rendered as a `<dl>` row by the
 * caller's wrapping list, so the pairing survives without sight.
 *
 * Values stay on one line (`whitespace-nowrap`) because a wrapped amount or
 * operation code is unreadable at a glance; the label is what gives way when
 * space is tight.
 */
export function DetailRow({
  label,
  value,
  numeric = false,
  strong = false,
  prosa = false,
}: {
  label: string;
  value: React.ReactNode;
  /** Tabular figures for codes, documents, phone numbers and amounts. */
  numeric?: boolean;
  strong?: boolean;
  /** Texto que puede ser largo (una dirección, un correo): se parte en líneas en vez de salirse de la tarjeta. */
  prosa?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-b-0 last:pb-0">
      {/* A figure never wraps — a broken operation code or amount is
          unreadable at a glance — so when the pair is too wide for the card
          it is the prose label that reflows, never the figure. Prose values
          (`prosa`: an address, an email) are the exception: they wrap, or a
          long one would run over the label and out of the card. */}
      <dt className={cn("text-body-sm text-text-secondary", prosa ? "shrink-0" : "min-w-0")}>{label}</dt>
      <dd
        className={cn(
          "text-right text-body-sm text-text-primary",
          prosa ? "min-w-0 [overflow-wrap:anywhere]" : "shrink-0 whitespace-nowrap",
          numeric && "pc-numeric",
          strong ? "font-semibold" : "font-medium",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** `<dl>` wrapper pairing with `DetailRow`. */
export function DetailList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return <dl className={cn("flex flex-col", className)}>{children}</dl>;
}
