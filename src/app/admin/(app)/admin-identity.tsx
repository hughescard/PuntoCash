import * as React from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AdminSession } from "@/features/admin/session";
import { cerrarSesionAdmin } from "@/app/admin/_actions";
import { ScopeSelector } from "./scope-selector";

/**
 * Cluster derecho de la cabecera — **FR-AD-SHELL-4** y **FR-AD-SHELL-5**.
 *
 *   PuntoCash | [selector de sede] | Marta Sánchez · Malecón… | Perfil / Cerrar sesión
 *
 * El nombre del operador aparece **como texto secundario bajo el de la
 * persona**: es contexto —de qué empresa es esta sesión—, no la identidad del
 * producto. Ni logotipo, ni color corporativo, ni tratamiento de marca: la
 * marca visible es PuntoCash y solo PuntoCash (**A9**).
 *
 * Con una sola sede en el alcance no se representa selector: su nombre se
 * muestra como texto fijo, porque un desplegable de un elemento es un control
 * que promete una elección que no existe (**FR-AD-SCOPE-3**).
 *
 * ── En un teléfono ────────────────────────────────────────────────────────
 * Cinco cosas no caben en 360px. Se reparten en vez de encogerse hasta ser
 * inservibles: el **alcance** baja a su propia franja bajo la cabecera
 * (`AdminScopeBar`), donde se lee entero; el **nombre**, la **empresa** y el
 * **cierre de sesión** se van al cajón de navegación, que es donde alguien los
 * busca en un móvil. En la cabecera quedan la marca y el avatar.
 */

/** Los enlaces de cabecera viven sobre navy, así que no reutilizan el Button claro. */
const headerLink = cn(
  "inline-flex h-control-sm items-center gap-2 rounded-control px-3",
  "text-label font-medium text-text-on-primary-muted",
  "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
  "hover:bg-white/[0.08] hover:text-white",
  "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-gold",
);

function Divider() {
  return <span aria-hidden="true" className="hidden h-9 w-px shrink-0 bg-white/15 lg:block" />;
}

export function AdminIdentity({ session }: { session: AdminSession }): React.JSX.Element {
  return (
    <>
      <div className="hidden items-center gap-3 lg:flex">
        <ScopeControl session={session} id="admin-scope" />
        {session.sedes.length === 0 ? null : <Divider />}
      </div>

      {/* Identidad: información, no un control. */}
      <div className="hidden flex-col items-end leading-tight lg:flex">
        <span className="text-label font-semibold text-white">{session.user.fullName}</span>
        <span className="text-caption text-text-on-primary-muted">{session.operator.name}</span>
      </div>

      <Divider />

      <Link
        href="/admin/perfil"
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

      {/* Cerrar sesión cambia estado, así que es un envío y no un enlace: la
          cookie la borra el servidor, que es quien la escribió. En un teléfono
          vive en el cajón, no aquí. */}
      <form action={cerrarSesionAdmin} className="hidden lg:block">
        <button type="submit" className={headerLink}>
          <LogOut className="size-[18px]" aria-hidden="true" />
          Cerrar sesión
        </button>
      </form>
    </>
  );
}

/**
 * La franja de alcance del teléfono: bajo la cabecera, a todo lo ancho, para
 * que el nombre de la sede se lea entero. En escritorio no existe — allí el
 * mismo control vive en la cabecera.
 */
export function AdminScopeBar({ session }: { session: AdminSession }): React.JSX.Element | null {
  if (session.sedes.length === 0) return null;

  return (
    <div className="z-20 flex shrink-0 items-center border-b border-white/10 bg-primary px-4 py-2 lg:hidden">
      <ScopeControl session={session} id="admin-scope-movil" block />
    </div>
  );
}

/** El mismo control en los dos sitios, para que no puedan divergir. */
function ScopeControl({
  session,
  id,
  block = false,
}: {
  session: AdminSession;
  id: string;
  block?: boolean;
}): React.JSX.Element | null {
  if (session.sedes.length === 0) return null;

  const sedeUnica = session.sedes.length === 1 ? session.sedes[0] : undefined;

  if (sedeUnica) {
    // **FR-AD-SCOPE-3**: su código y nombre como texto fijo, sin selector.
    return (
      <span className="truncate text-label font-medium text-white">
        {sedeUnica.code} — {sedeUnica.name}
      </span>
    );
  }

  return (
    <ScopeSelector
      id={id}
      sedes={session.sedes}
      selectedId={session.selected?.id ?? null}
      block={block}
    />
  );
}
