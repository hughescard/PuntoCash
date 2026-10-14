import {
  CalendarClock,
  ChartColumn,
  ClipboardCheck,
  Coins,
  House,
  List,
  Megaphone,
  MonitorSmartphone,
  Percent,
  ShieldCheck,
  Store,
  Users,
  Wallet,
} from "lucide-react";

import type { NavItem } from "@/components/shell/sidebar-nav";
import type { NavGroup } from "@/components/shell/sidebar-nav";

/**
 * Los destinos de la consola, en un solo sitio — **FR-AD-SHELL-2**.
 *
 * Viven aparte de las dos navegaciones que los representan (la barra lateral de
 * escritorio y la del teléfono) precisamente porque son dos: una lista
 * duplicada se desincroniza al primer destino nuevo, y el resultado sería una
 * consola que ofrece cosas distintas según el tamaño de la pantalla.
 */

/** Indicadores numéricos que dependen del alcance de la sesión (**FR-AD-SHELL-3**). */
export interface AdminNavBadges {
  /** Situaciones de Cajas que impiden operar: sedes sin ninguna caja, y cajas activas sin equipo vinculado. */
  cajas?: number | undefined;
  /** Solicitudes pendientes. Llega con la bandeja de Aprobaciones. */
  aprobaciones?: number | undefined;
}

/**
 * Qué ve cada administrador en el menú.
 *
 * `visibles.usuarios` decide si aparece **Usuarios** (**FR-AD-USR-11**). Quien no
 * gobierna esa sección **no la ve**, y la ruta le responde como inexistente:
 * no es «no tienes permiso», es que para él no está ahí. La decisión se toma
 * en el servidor, donde se arma el menú, y no en el cliente ocultando algo ya
 * pintado.
 */
export interface AdminNavVisibles {
  /** Solo el administrador principal ve la sección (**FR-AD-USR-11**). */
  usuarios: boolean;
}

export function adminNavGroups(
  badges: AdminNavBadges = {},
  visibles: AdminNavVisibles = { usuarios: false },
): readonly NavGroup[] {
  return [
    {
      label: "Operación",
      items: [
        { href: "/admin/inicio", label: "Inicio", icon: House },
        { href: "/admin/jornadas", label: "Jornadas", icon: CalendarClock },
        {
          href: "/admin/aprobaciones",
          label: "Aprobaciones",
          icon: ClipboardCheck,
          badge: badges.aprobaciones,
        },
        { href: "/admin/operaciones", label: "Operaciones", icon: List },
      ],
    },
    {
      label: "Sucursal",
      items: [
        { href: "/admin/sedes", label: "Sedes", icon: Store },
        { href: "/admin/cajas", label: "Cajas", icon: Wallet, badge: badges.cajas },
        { href: "/admin/equipos", label: "Equipos", icon: MonitorSmartphone },
        { href: "/admin/trabajadores", label: "Trabajadores", icon: Users },
        ...(visibles.usuarios
          ? [{ href: "/admin/usuarios" as const, label: "Usuarios", icon: ShieldCheck }]
          : []),
      ],
    },
    {
      label: "Configuración",
      items: [
        { href: "/admin/monedas", label: "Monedas", icon: Coins },
        { href: "/admin/tasas", label: "Tasas", icon: Percent },
        { href: "/admin/promociones", label: "Promociones", icon: Megaphone },
        { href: "/admin/reportes", label: "Reportes", icon: ChartColumn },
      ],
    },
  ];
}

/**
 * Los destinos de la barra inferior del teléfono.
 *
 * **Son tres, y no cuatro, por una razón de ancho medida, no de gusto.** Con
 * cuatro más "Más", cada hueco se queda en unos 70px a 375px —menos en un
 * teléfono de 360— y "Aprobaciones" ocupa 69: se tocaba con "Jornadas" y en
 * pantallas algo más estrechas se solapaba. La salida no era encoger más la
 * letra, que ya está en el suelo de lo legible, ni abreviar la palabra, que
 * deja de decir a dónde lleva: era quitar un hueco. Con tres más "Más" cada
 * uno pasa de 88px y las etiquetas caben enteras.
 *
 * Los tres que quedan son los de supervisar: qué está pasando, qué jornadas
 * hay abiertas y qué espera respuesta. **Cajas** se va al cajón —sigue con su
 * indicador— porque montar la sucursal es cosa de días concretos, no del día a
 * día. Para que eso no esconda un aviso, "Más" avisa por su cuenta
 * (`hayAvisosEnElCajon`).
 */
export function accesosRapidos(badges: AdminNavBadges = {}): readonly NavItem[] {
  return [
    { href: "/admin/inicio", label: "Inicio", icon: House },
    { href: "/admin/jornadas", label: "Jornadas", icon: CalendarClock },
    {
      href: "/admin/aprobaciones",
      label: "Aprobaciones",
      icon: ClipboardCheck,
      badge: badges.aprobaciones,
    },
  ];
}

/**
 * Si algún destino que **solo** vive en el cajón pide atención. "Más" lo marca
 * con un punto: un indicador escondido detrás de un menú no es un indicador.
 */
export function hayAvisosEnElCajon(badges: AdminNavBadges = {}): boolean {
  return (badges.cajas ?? 0) > 0;
}
