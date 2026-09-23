"use client";

import * as React from "react";
import { CircleDot, FileText, Mail, Palette, Table2, Type, Wallet } from "lucide-react";

import { AppSidebar } from "@/components/shell/app-shell";
import { SidebarNavLink, type NavItem } from "@/components/shell/sidebar-nav";

/**
 * The nav config lives in a client module because each item carries an icon
 * *component*. Functions cannot cross the server/client boundary, so keeping
 * this here is what lets `showcase.tsx` stay a Server Component.
 *
 * Product sidebars should follow the same shape.
 */
const navItems: readonly NavItem[] = [
  { href: "#color", label: "Color", icon: Palette },
  { href: "#tipografia", label: "Tipografía", icon: Type },
  { href: "#botones", label: "Botones", icon: CircleDot },
  { href: "#formularios", label: "Formularios", icon: FileText },
  { href: "#contenedores", label: "Contenedores", icon: Wallet },
  { href: "#tablas", label: "Tablas", icon: Table2 },
  /* La única entrada que no es un ancla: los correos no pueden representarse
     dentro de esta página, porque su documento lo reescribe otro programa. */
  { href: "/design-system/correos", label: "Correos", icon: Mail },
];

export function DesignSystemSidebar(): React.JSX.Element {
  return (
    <AppSidebar label="Secciones del sistema de diseño">
      <ul className="flex flex-col gap-1">
        {navItems.map((item, index) => (
          <li key={item.href}>
            {/* Anchor navigation, so the first item is simply marked current. */}
            <SidebarNavLink item={item} active={index === 0} />
          </li>
        ))}
      </ul>
    </AppSidebar>
  );
}
