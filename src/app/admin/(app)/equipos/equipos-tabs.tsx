import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { MonitorSmartphone, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Las dos clases de equipo — **FR-AD-EQ-1**: Cajas por defecto, y Kioscos de
 * autoservicio.
 *
 * Son **enlaces**, no un `tablist` de ARIA, y es deliberado. Un `tablist` de
 * verdad exige JavaScript para mover el foco con las flechas y para cambiar de
 * panel, de modo que antes de hidratar no sería una pestaña sino un adorno. Dos
 * enlaces con su `aria-current` funcionan desde el primer pintado, se pueden
 * abrir en otra pestaña del navegador, y la pestaña elegida viaja en la URL —
 * así un enlace a «los kioscos de mis sedes» es un enlace y no una instrucción.
 */
export type PestanaEquipos = "cajas" | "kioscos";

export function EquiposTabs({
  activa,
  cuentaCajas,
  cuentaKioscos,
}: {
  activa: PestanaEquipos;
  /** Cuántas cajas hay en el alcance, y cuántos kioscos: el dato que dice si merece la pena mirar. */
  cuentaCajas: number;
  cuentaKioscos: number;
}): React.JSX.Element {
  return (
    <nav aria-label="Clases de equipo" className="mb-8">
      <ul className="flex flex-wrap gap-2">
        <Pestana
          href="/admin/equipos"
          icon={Wallet}
          label="Cajas"
          cuenta={cuentaCajas}
          activa={activa === "cajas"}
        />
        <Pestana
          href="/admin/equipos?pestana=kioscos"
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
          // Alto táctil de sobra a 360px (**FR-AD-SHELL-14**).
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
        <span className={cn("pc-numeric", activa ? "text-text-on-primary-muted" : "text-text-secondary")}>
          {cuenta}
        </span>
      </Link>
    </li>
  );
}
