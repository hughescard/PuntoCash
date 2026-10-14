"use client";

import * as React from "react";

import { AppSidebar } from "@/components/shell/app-shell";
import { SidebarNavGroups } from "@/components/shell/sidebar-nav";
import { adminNavGroups, type AdminNavBadges } from "./admin-nav";

/**
 * Barra lateral de escritorio — **FR-AD-SHELL-2**.
 *
 * Tres bloques, no trece entradas planas. La agrupación no es cosmética: son
 * las tres cosas distintas que hace esta consola — mirar lo que está pasando,
 * montar y mantener la sucursal, y declarar lo que la sucursal ofrece.
 *
 * Se oculta por debajo de `lg`, donde no hay columna que la sostenga: allí la
 * navegación la llevan la barra inferior y el cajón (`admin-mobile-nav.tsx`),
 * que leen **los mismos destinos** de `admin-nav.ts`.
 *
 * Es cliente porque cada entrada lleva un icono y el destino activo se deriva
 * de la ruta actual, que es lo que emite `aria-current="page"`.
 */
export function AdminSidebar({
  badges,
  verUsuarios,
}: {
  badges: AdminNavBadges;
  /** Solo el administrador principal ve **Usuarios** (**FR-AD-USR-11**). */
  verUsuarios: boolean;
}): React.JSX.Element {
  return (
    <AppSidebar
      className="hidden lg:flex"
      label="Navegación principal"
      footer={
        <p className="px-3 text-caption text-text-on-primary-muted">PuntoCash · Administración</p>
      }
    >
      <SidebarNavGroups groups={adminNavGroups(badges, { usuarios: verUsuarios })} />
    </AppSidebar>
  );
}
