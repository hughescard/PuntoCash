import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { LogOut, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WorkerSession } from "@/features/worker/session";
import { LinkedRegister } from "./linked-register";

/**
 * Right-hand header cluster — the approved Worker header content (manual §10):
 *
 *   PuntoCash | Juan Pérez | Caja 03 | Perfil / Cerrar sesión
 *
 * Each identity block pairs its value with a quiet caption: "Trabajador" under
 * the name, the sede under the caja. The caja comes from this computer's
 * device session, not from the Worker's account. The operator
 * company that administers the sede is deliberately absent: "PuntoCash
 * permanece como identidad visible principal."
 */

/** Header links live on navy, so they cannot reuse the light-surface Button. */
const headerLink = cn(
  "inline-flex h-control-sm items-center gap-2 rounded-control px-3",
  "text-label font-medium text-text-on-primary-muted",
  "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
  "hover:bg-white/[0.08] hover:text-white",
  "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-gold",
);

function Divider() {
  return <span aria-hidden="true" className="h-9 w-px shrink-0 bg-white/15" />;
}

export function WorkerIdentity({ worker }: { worker: WorkerSession }): React.JSX.Element {
  return (
    <>
      {/* Identity is information, not a control. */}
      <div className="flex flex-col items-end leading-tight">
        <span className="text-label font-semibold text-white">{worker.fullName}</span>
        <span className="text-caption text-text-on-primary-muted">Trabajador</span>
      </div>

      <Divider />

      {/* The caja this computer is linked to — persistent context for every operation. */}
      <div className="flex items-center gap-2.5">
        <Wallet className="size-5 shrink-0 text-gold" aria-hidden="true" />
        <LinkedRegister fallback={worker.register} />
      </div>

      <Divider />

      {/* The avatar is the profile affordance; gold stays a small accent. */}
      <Link
        href={"/worker/perfil" as Route}
        aria-label="Perfil"
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-pill bg-gold",
          "text-label font-bold text-navy",
          "transition-opacity duration-(--duration-fast) ease-(--ease-standard) hover:opacity-90",
          "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-gold",
        )}
      >
        {worker.initials}
      </Link>

      {/* Ends the Worker's session only: the computer stays linked to its caja,
          so this returns to the sign-in screen, never to the pairing screen. */}
      <Link href={"/worker/login" as Route} className={headerLink}>
        <LogOut className="size-[18px]" aria-hidden="true" />
        Cerrar sesión
      </Link>
    </>
  );
}
