"use client";

import * as React from "react";
import { CirclePlus, House, List, Wallet } from "lucide-react";

import { AppSidebar } from "@/components/shell/app-shell";
import { SidebarNav, type NavItem } from "@/components/shell/sidebar-nav";

/**
 * Worker primary navigation — the four areas defined in manual §10 and §21.
 *
 * Client-side because each item carries an icon component and the active item is
 * derived from the current pathname (which is what emits `aria-current="page"`).
 * Customers/KYC are deliberately absent: they are a cross-cutting concern inside
 * operations, not a fifth destination (§21 "Patrón Worker").
 */
const navItems: readonly NavItem[] = [
  { href: "/worker/inicio", label: "Inicio", icon: House },
  { href: "/worker/nueva-operacion", label: "Nueva operación", icon: CirclePlus },
  { href: "/worker/operaciones", label: "Operaciones", icon: List },
  { href: "/worker/caja", label: "Caja", icon: Wallet },
];

export function WorkerSidebar(): React.JSX.Element {
  return (
    <AppSidebar
      label="Navegación principal"
      footer={
        <p className="px-3 text-caption text-text-on-primary-muted">PuntoCash · Sistema interno</p>
      }
    >
      <SidebarNav items={navItems} />
    </AppSidebar>
  );
}
