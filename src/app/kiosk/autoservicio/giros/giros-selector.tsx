import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, ArrowRight, HandCoins, Send } from "lucide-react";

/**
 * Kiosk "Giros" selector — the client-facing equivalent of the Worker's own
 * `GirosOperationSelector`, copy rewritten for the person standing at the
 * kiosk rather than the operator. Carries no operational data of any kind:
 * no pending giros, no recent transfers, nothing browsable. A giro is only
 * ever reachable by the code its beneficiary presents (Worker PRD R4), and
 * that rule holds just as strictly here.
 */
const OPTIONS = [
  {
    href: "/kiosk/autoservicio/giros/enviar",
    icon: Send,
    title: "Enviar giro",
    description: "Prepara el envío de dinero a otra provincia.",
  },
  {
    href: "/kiosk/autoservicio/giros/cobrar",
    icon: HandCoins,
    title: "Cobrar giro",
    description: "Prepara el cobro de un giro con el código que te dieron.",
  },
] as const;

export function GirosAutoservicioSelector(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/kiosk/autoservicio"
        className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver al inicio
      </Link>

      <div className="text-center">
        <h1 className="text-screen-title text-text-primary">Giros</h1>
        <p className="mt-2 text-body text-text-secondary">¿Qué deseas hacer?</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <OptionCard key={option.href} {...option} />
        ))}
      </div>
    </div>
  );
}

function OptionCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Send;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href as Route}
      className="group flex min-h-40 flex-col items-center justify-center gap-3 rounded-card border border-border bg-surface p-8 text-center transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:border-border-navy hover:bg-primary-subtle outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span
        aria-hidden="true"
        className="grid size-14 shrink-0 place-items-center rounded-pill bg-primary-subtle text-primary group-hover:bg-surface"
      >
        <Icon className="size-7" />
      </span>

      <span className="text-card-title font-semibold text-text-primary">{title}</span>
      <span className="text-body-sm text-text-secondary">{description}</span>

      <span
        aria-hidden="true"
        className="mt-1 inline-flex items-center gap-1 text-label font-semibold text-primary"
      >
        Continuar
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}
