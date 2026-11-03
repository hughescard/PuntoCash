import {
  Building2,
  CalendarClock,
  ChartColumn,
  Coins,
  House,
  LayoutGrid,
  List,
  Megaphone,
  MonitorSmartphone,
  ScrollText,
  Store,
  UserCog,
  Users,
  ClipboardCheck,
} from "lucide-react";

import type { NavGroup, NavItem } from "@/components/shell/sidebar-nav";

/**
 * Los destinos de la consola de PuntoCash, en un solo sitio (FR-SA-SHELL-2).
 *
 * Cuatro bloques por lo que la persona viene a hacer, no por el permiso que
 * tiene en cada pantalla: **Red** (quién y dónde: sedes, operadores, cajas,
 * trabajadores), **Oferta** (qué se ofrece: servicios, monedas y tasas,
 * promociones), **Actividad** (qué pasa: jornadas, operaciones, reportes) y
 * **Administración** (quién entra a la consola y qué dejó huella). Dentro de
 * cada pantalla, lo que PuntoCash puede o no cambiar ya se ve por sus botones.
 */

export interface SuperAdminNavBadges {
  /**
   * Sedes sin operador asignado. Es el único indicador del menú porque es lo
   * único de la red que solo PuntoCash resuelve, y se resuelve en Sedes,
   * asignándolas. Lo demás que conviene vigilar lo resuelve cada mercante.
   */
  sedes?: number | undefined;
  /**
   * Diferencias de efectivo que nadie de la sede puede resolver (la sede cambió
   * de manos con ellas pendientes): las resuelve PuntoCash (**FR-SA-APR-1**).
   */
  aprobaciones?: number | undefined;
}

/**
 * `principal`: solo el principal ve «Usuarios» (FR-SA-USR). Para los demás la
 * entrada no existe, y la ruta responde como inexistente.
 */
export function superAdminNavGroups(
  badges: SuperAdminNavBadges = {},
  principal = false,
): readonly NavGroup[] {
  return [
    {
      label: "Red",
      items: [
        { href: "/super-admin/inicio", label: "Inicio", icon: House },
        { href: "/super-admin/sedes", label: "Sedes", icon: Store, badge: badges.sedes },
        { href: "/super-admin/operadores", label: "Operadores", icon: Building2 },
        { href: "/super-admin/equipos", label: "Cajas y equipos", icon: MonitorSmartphone },
        { href: "/super-admin/trabajadores", label: "Trabajadores", icon: Users },
      ],
    },
    {
      label: "Oferta",
      items: [
        { href: "/super-admin/servicios", label: "Servicios", icon: LayoutGrid },
        { href: "/super-admin/monedas-y-tasas", label: "Monedas y tasas", icon: Coins },
        { href: "/super-admin/promociones", label: "Promociones", icon: Megaphone },
      ],
    },
    {
      label: "Actividad",
      items: [
        { href: "/super-admin/jornadas", label: "Jornadas", icon: CalendarClock },
        { href: "/super-admin/aprobaciones", label: "Aprobaciones", icon: ClipboardCheck, badge: badges.aprobaciones },
        { href: "/super-admin/operaciones", label: "Operaciones", icon: List },
        { href: "/super-admin/reportes", label: "Reportes", icon: ChartColumn },
      ],
    },
    {
      label: "Administración",
      items: [
        ...(principal ? [{ href: "/super-admin/usuarios", label: "Usuarios", icon: UserCog }] : []),
        { href: "/super-admin/auditoria", label: "Auditoría", icon: ScrollText },
      ],
    },
  ];
}

/** Barra inferior del teléfono: tres destinos y «Más», por la misma razón de ancho que en Admin. */
export function accesosRapidosSuperAdmin(badges: SuperAdminNavBadges = {}): readonly NavItem[] {
  return [
    { href: "/super-admin/inicio", label: "Inicio", icon: House },
    { href: "/super-admin/sedes", label: "Sedes", icon: Store, badge: badges.sedes },
    { href: "/super-admin/operadores", label: "Operadores", icon: Building2 },
  ];
}
