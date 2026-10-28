import * as React from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import type { SuperAdminSession } from "@/features/super-admin/session";
import { cerrarSesionSuperAdmin } from "@/app/super-admin/_actions";

/**
 * La marca y el distintivo de la consola (FR-SA-SHELL-4 y 5).
 *
 * El distintivo no es decoración: esta consola revoca sedes y suspende
 * empresas, y tiene que ser imposible confundirla de un vistazo con la de un
 * mercante. La de Admin de sede lleva a la derecha un selector de sede y el
 * nombre de una empresa; esta lleva, pegado a la marca, el nombre de la
 * consola en un filete dorado — el único dorado de la cabecera, para que se
 * lea como lo que es.
 */
export function SuperAdminBrand(): React.JSX.Element {
  return (
    <>
      <Logo variant="onDark" size="sm" className="lg:hidden" />
      <Logo variant="onDark" size="md" className="hidden lg:inline-flex" />
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-control border border-gold/60 px-2 py-1 sm:px-2.5",
          "text-[0.625rem] font-semibold uppercase leading-none tracking-[0.08em] text-gold sm:text-overline sm:leading-none",
        )}
      >
        <span className="sm:hidden">Super admin</span>
        <span className="hidden sm:inline">Super administración</span>
      </span>
    </>
  );
}

const headerLink = cn(
  "inline-flex h-control-sm items-center gap-2 rounded-control px-3",
  "text-label font-medium text-text-on-primary-muted",
  "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
  "hover:bg-white/[0.08] hover:text-white",
  "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-gold",
);

/**
 * El bloque derecho: quién tiene la sesión y de qué área es, el perfil y el
 * cierre de sesión. Sin selector de alcance: el alcance es la red entera
 * (FR-SA-NAV-2). En un teléfono el nombre y el cierre de sesión viven en el cajón.
 */
export function SuperAdminIdentity({ session }: { session: SuperAdminSession }): React.JSX.Element {
  return (
    <>
      <div className="hidden flex-col items-end leading-tight lg:flex">
        <span className="text-label font-semibold text-white">{session.user.fullName}</span>
        <span className="text-caption text-text-on-primary-muted">PuntoCash · {session.user.area}</span>
      </div>

      <span aria-hidden="true" className="hidden h-9 w-px shrink-0 bg-white/15 lg:block" />

      <Link
        href="/super-admin/perfil"
        aria-label="Perfil"
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-pill bg-gold",
          "text-label font-bold text-navy",
          "transition-opacity duration-(--duration-fast) ease-(--ease-standard) hover:opacity-90",
          "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-gold",
        )}
      >
        {session.initials}
      </Link>

      <form action={cerrarSesionSuperAdmin} className="hidden lg:block">
        <button type="submit" className={headerLink}>
          <LogOut className="size-[18px]" aria-hidden="true" />
          Cerrar sesión
        </button>
      </form>
    </>
  );
}
