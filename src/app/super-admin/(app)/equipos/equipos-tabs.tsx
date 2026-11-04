import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { MonitorSmartphone, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Las dos clases de equipo de la red.
 *
 * Son **enlaces**, no un `tablist` de ARIA, por lo mismo que en Admin: un
 * `tablist` de verdad necesita JavaScript para mover el foco y cambiar de
 * panel, así que antes de hidratar sería un adorno. Dos enlaces con su
 * `aria-current` funcionan desde el primer pintado y la pestaña viaja en la
 * dirección.
 */
export type PestanaEquipos = "cajas" | "kioscos";

export function EquiposTabs({
  activa,
  cuentaCajas,
  cuentaKioscos,
}: {
  activa: PestanaEquipos;
  cuentaCajas: number;
  cuentaKioscos: number;
}): React.JSX.Element {
  return (
    <nav aria-label="Clases de equipo" className="mb-8">
      <ul className="flex flex-wrap gap-2">
        <Pestana href="/super-admin/equipos" icon={Wallet} label="Cajas" cuenta={cuentaCajas} activa={activa === "cajas"} />
        <Pestana
          href="/super-admin/equipos?pestana=kioscos"
          icon={MonitorSmartphone}
          label="Kioscos de autoservicio"
          cuenta={cuentaKioscos}
          activa={activa === "kioscos"}
        />
      </ul>
    </nav>
  );
}

function Pestana({
  href,
  icon: Icon,
  label,
  cuenta,
  activa,
}: {
  href: string;
  icon: typeof Wallet;
  label: string;
  cuenta: number;
  activa: boolean;
}): React.JSX.Element {
  return (
    <li>
      <Link
        href={href as Route}
        aria-current={activa ? "page" : undefined}
        className={cn(
          "inline-flex h-control items-center gap-2 rounded-control border px-4 text-label font-semibold",
          "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
          "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary",
          activa
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
        )}
      >
        <Icon className="size-[18px] shrink-0" aria-hidden="true" />
        {label}
        <span className={cn("pc-numeric", activa ? "text-text-on-primary-muted" : "text-text-secondary")}>{cuenta}</span>
      </Link>
    </li>
  );
}
