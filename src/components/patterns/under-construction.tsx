import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, HardHat } from "lucide-react";

import { Button } from "@/components/ui";
import { Logo } from "@/components/brand/logo";

/**
 * Placeholder for a route that exists but whose flow is not designed yet.
 *
 * A navigable dead end is worse than an honest one: a link that 404s reads as a
 * broken product. This screen states plainly that the flow is pending and
 * always offers a way back, so the user is never stranded (§5 "Rápido" —
 * indicate what happened and what the next step is).
 *
 * It reuses the design system as-is: light working surface, navy structure,
 * gold only as the hairline accent already established by the brand panel.
 * Delete usages as the real screens land.
 */
export interface UnderConstructionProps {
  /** The flow that is pending, as a short screen title. */
  title: string;
  /** One or two sentences on what is pending and what to do meanwhile. */
  description: React.ReactNode;
  backHref: Route;
  backLabel: string;
  /**
   * `embedded` renders the block only, for a route that already sits inside the
   * application shell: the shell supplies the landmark, the brand and the
   * chrome, so repeating them here would duplicate all three.
   */
  embedded?: boolean;
}

export function UnderConstruction({
  title,
  description,
  backHref,
  backLabel,
  embedded = false,
}: UnderConstructionProps): React.JSX.Element {
  const Root = embedded ? "div" : "main";

  return (
    <Root
      className={
        embedded
          ? "flex min-h-[26rem] flex-col items-center justify-center py-12"
          : "flex min-h-screen flex-col items-center justify-center bg-canvas px-8 py-12"
      }
    >
      <div className="flex w-full max-w-[32rem] flex-col items-center text-center">
        {embedded ? null : (
          <>
            <Logo size="lg" showDescriptor />
            {/* Gold hairline, echoing the sign-in brand panel. */}
            <span aria-hidden="true" className="mt-10 h-px w-24 bg-gold/50" />
          </>
        )}

        <span
          aria-hidden="true"
          className={
            embedded
              ? "grid size-14 place-items-center rounded-card border border-border bg-surface text-primary shadow-card"
              : "mt-10 grid size-14 place-items-center rounded-card border border-border bg-surface text-primary shadow-card"
          }
        >
          <HardHat className="size-6" />
        </span>

        {/* The state is the overline and the flow is the title, so the heading
            stays short enough not to wrap. */}
        <p className="mt-6 text-overline uppercase text-text-secondary">En construcción</p>

        <h1 className="mt-2 text-screen-title text-text-primary">{title}</h1>

        <p className="mt-3 text-body text-text-secondary">{description}</p>

        <Button variant="secondary" className="mt-10" asChild>
          <Link href={backHref}>
            <ArrowLeft aria-hidden="true" />
            {backLabel}
          </Link>
        </Button>
      </div>

      {/* The shell already carries the brand footprint when embedded. */}
      {embedded ? null : (
        <p className="mt-16 text-caption text-text-secondary">PuntoCash · Sistema interno</p>
      )}
    </Root>
  );
}
