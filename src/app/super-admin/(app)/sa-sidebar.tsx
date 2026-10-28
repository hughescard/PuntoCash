"use client";

import * as React from "react";

import { AppSidebar } from "@/components/shell/app-shell";
import { SidebarNavGroups } from "@/components/shell/sidebar-nav";
import { superAdminNavGroups, type SuperAdminNavBadges } from "./sa-nav";

/** Barra lateral de escritorio (FR-SA-SHELL-2). Por debajo de `lg` la navegación la lleva `sa-mobile-nav.tsx`. */
export function SuperAdminSidebar({
  badges,
  principal,
}: {
  badges: SuperAdminNavBadges;
  principal: boolean;
}): React.JSX.Element {
  return (
    <AppSidebar
      className="hidden lg:flex"
      label="Navegación principal"
      footer={<p className="px-3 text-caption text-text-on-primary-muted">PuntoCash · Super admin</p>}
    >
      <SidebarNavGroups groups={superAdminNavGroups(badges, principal)} />
    </AppSidebar>
  );
}
