import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, ArrowRight, HandCoins, Send } from "lucide-react";

/**
 * Operation selector for "Giros".
 *
 * Deliberately carries no operational data: no metrics, no balances, no
 * pending giros and no recent transfers. A Giro is only ever reachable by the
 * code its beneficiary presents, so this screen must not become a place where
 * existing giros can be discovered or browsed.
 */
const OPERATIONS = [
  {
    href: "/worker/nueva-operacion/giros/enviar",
    icon: Send,
    title: "Enviar giro",
    description: "Registrar un nuevo giro para que otra persona pueda cobrarlo.",
  },
  {
    href: "/worker/nueva-operacion/giros/cobrar",
    icon: HandCoins,
    title: "Cobrar giro",
    description: "Entregar un giro existente al beneficiario mediante su código.",
  },
] as const;

export function GirosOperationSelector(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/worker/nueva-operacion"
        className="inline-flex w-fit items-center gap-2 rounded-control text-label font-medium text-text-secondary transition-colors hover:text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a Nueva operación
      </Link>

      <div>
        <h1 className="text-screen-title text-text-primary">Giros</h1>
        <p className="mt-2 max-w-2xl text-body text-text-secondary">
          Selecciona la operación que deseas realizar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 wide:grid-cols-2">
        {OPERATIONS.map((operation) => (
          <OperationCard key={operation.href} {...operation} />
        ))}
      </div>
    </div>
  );
}

function OperationCard({
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
      className="group flex h-full items-start gap-4 rounded-card border border-border bg-surface p-5 transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:border-border-navy hover:bg-primary-subtle outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-control bg-primary-subtle text-primary group-hover:bg-surface"
      >
        <Icon className="size-5" />
      </span>

      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-card-title font-semibold text-text-primary">{title}</span>
        <span className="text-body-sm text-text-secondary">{description}</span>
      </span>

      <ArrowRight
        aria-hidden="true"
        className="ml-auto size-5 shrink-0 self-center text-text-secondary transition-colors group-hover:text-primary"
      />
    </Link>
  );
}
