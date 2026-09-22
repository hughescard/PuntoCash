import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

import { KIOSK_RATES_TILE, KIOSK_SERVICES } from "@/features/kiosk/kiosk-catalog";

export const metadata: Metadata = {
  title: "Autoservicio",
  description: "Elige lo que deseas hacer hoy en PuntoCash.",
  robots: { index: false, follow: false },
};

/**
 * Kiosk home — the only question this screen asks is which service the
 * client wants to start. No balances, no history, no client data: everything
 * here is public information a stranger walking up can see (§21 "textos
 * orientados al cliente").
 */
export default function KioskAutoservicioHome(): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center py-8 text-center">
      <p className="text-overline uppercase text-text-secondary">PuntoCash · Autoservicio</p>
      <h1 className="mt-3 text-screen-title text-text-primary">¿Qué deseas hacer hoy?</h1>
      <p className="mt-3 max-w-xl text-body text-text-secondary">
        Toca un servicio para comenzar. Al final recibirás un código para completarlo en caja.
      </p>

      <div className="mt-12 grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
        {KIOSK_SERVICES.map((service) => (
          <KioskTile
            key={service.id}
            href={`/kiosk/autoservicio/${service.slug}`}
            icon={service.icon}
            title={service.name}
            description={service.description}
          />
        ))}

        <KioskTile
          href={`/kiosk/autoservicio/${KIOSK_RATES_TILE.slug}`}
          icon={KIOSK_RATES_TILE.icon}
          title={KIOSK_RATES_TILE.name}
          description={KIOSK_RATES_TILE.description}
          tone="subtle"
        />
      </div>
    </div>
  );
}

function KioskTile({
  href,
  icon: Icon,
  title,
  description,
  tone = "default",
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: "default" | "subtle";
}): React.JSX.Element {
  return (
    <Link
      href={href as Route}
      className={
        "group flex min-h-44 flex-col items-center justify-center gap-3 rounded-card border p-8 text-center " +
        "transition-colors duration-(--duration-fast) ease-(--ease-standard) " +
        "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary " +
        (tone === "default"
          ? "border-gold bg-surface hover:bg-accent-subtle"
          : "border-border bg-surface-subtle hover:border-border-navy hover:bg-primary-subtle")
      }
    >
      <span
        aria-hidden="true"
        className="grid size-16 shrink-0 place-items-center rounded-pill bg-accent-subtle text-primary group-hover:bg-surface"
      >
        <Icon className="size-8" />
      </span>

      <span className="text-card-title font-semibold text-text-primary">{title}</span>
      <span className="text-body-sm text-text-secondary">{description}</span>

      <span
        aria-hidden="true"
        className="mt-1 inline-flex items-center gap-1 text-label font-semibold text-primary"
      >
        Comenzar
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}
