"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { LogOut, Menu, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { SidebarNavGroups } from "@/components/shell/sidebar-nav";
import type { NavItem } from "@/components/shell/sidebar-nav";
import { cerrarSesionAdmin } from "@/app/admin/_actions";
import {
  accesosRapidos,
  adminNavGroups,
  hayAvisosEnElCajon,
  type AdminNavBadges,
} from "./admin-nav";

/**
 * La navegación de la consola en un teléfono — **FR-AD-SHELL-9** a **FR-AD-SHELL-12**.
 *
 * Esta consola se usa a diario desde el móvil, y allí no hay columna de 240px
 * donde poner trece destinos. Se reparten en dos piezas que **no compiten**:
 *
 *   · **Barra inferior**, siempre visible, con los tres destinos de supervisión
 *     más "Más". Está al alcance del pulgar y no se va con el contenido. Son
 *     tres por una razón de ancho medida — ver `admin-nav.ts`.
 *   · **Cajón**, que abre "Más": la misma barra lateral de escritorio, con sus
 *     tres bloques intactos, más el perfil y el cierre de sesión — que en la
 *     cabecera de un teléfono no caben.
 *
 * Las dos leen los destinos de `admin-nav.ts`. Duplicar la lista habría hecho
 * que la consola ofreciera cosas distintas según el tamaño de la pantalla.
 *
 * El cajón es un `Dialog` del sistema, no un panel improvisado: así hereda el
 * foco atrapado, el cierre con Escape y el resto de la página anunciada como
 * inerte, que es justo lo que una navegación a pantalla completa necesita y lo
 * que más se suele olvidar.
 */
export function AdminMobileNav({
  badges,
  verUsuarios,
  fullName,
  operatorName,
}: {
  badges: AdminNavBadges;
  verUsuarios: boolean;
  fullName: string;
  operatorName: string;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  /* El cajón se cierra al llegar al destino: dejarlo abierto encima de la
     pantalla recién cargada obliga a un gesto que nadie pidió.

     Se ajusta **durante el render**, comparando con la ruta anterior, y no en
     un efecto. Es el patrón que React documenta para «ajustar estado cuando
     cambia una propiedad»: React descarta el render a medias y vuelve a
     representar con el estado ya corregido, sin pintar el paso intermedio ni
     provocar el render en cascada que sí provoca un `setState` dentro de un
     efecto. Cerrar en el `onClick` de cada enlace no bastaría: la vuelta atrás
     del navegador también cambia la ruta y nadie pulsa nada. */
  const [rutaAnterior, setRutaAnterior] = React.useState(pathname);
  if (rutaAnterior !== pathname) {
    setRutaAnterior(pathname);
    setOpen(false);
  }

  const rapidos = accesosRapidos(badges);

  /* FR-AD-SHELL-11: tocar la sección en la que ya se está no cambia la ruta,
     así que lo de arriba no lo cerraría; se cierra aquí. */
  const cerrarSiEsAqui = (e: React.MouseEvent) => {
    const enlace = (e.target as HTMLElement).closest("a");
    if (enlace && new URL(enlace.href).pathname === pathname) setOpen(false);
  };

  return (
    <>
      <nav
        aria-label="Navegación rápida"
        className={cn(
          "z-30 flex shrink-0 items-stretch justify-around gap-1 lg:hidden",
          "border-t border-white/10 bg-primary px-1",
          // Respeta la franja del gesto de inicio en los teléfonos que la tienen.
          "pb-[env(safe-area-inset-bottom)]",
        )}
      >
        {rapidos.map((item) => (
          <BottomBarLink key={item.href} item={item} pathname={pathname} />
        ))}

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={
            hayAvisosEnElCajon(badges)
              ? "Más secciones, con avisos pendientes"
              : "Más secciones"
          }
          className={cn(bottomItem, "text-text-on-primary-muted")}
        >
          <span className="relative">
            <Menu className="size-[22px]" aria-hidden="true" />
            {hayAvisosEnElCajon(badges) ? (
              <span
                aria-hidden="true"
                className="absolute -right-1.5 -top-1 size-2 rounded-pill bg-accent"
              />
            ) : null}
          </span>
          <span className={bottomLabel}>Más</span>
        </button>
      </nav>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          placement="left"
          hideClose
          className="flex flex-col bg-primary p-0 text-primary-foreground"
        >
          <div className="flex h-header shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4">
            <Logo variant="onDark" size="sm" />
            <DialogClose
              className={cn(
                "inline-flex h-control-sm items-center rounded-control px-3",
                "text-label font-medium text-text-on-primary-muted",
                "hover:bg-white/[0.08] hover:text-white",
                "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-gold",
              )}
            >
              Cerrar
            </DialogClose>
          </div>

          {/* El diálogo necesita nombre y descripción accesibles; aquí el
              título no se pinta porque el propio cajón ya es la navegación. */}
          <DialogTitle className="sr-only">Navegación</DialogTitle>
          <DialogDescription className="sr-only">
            Todas las secciones de la consola de administración.
          </DialogDescription>

          <nav
            aria-label="Navegación principal"
            className="pc-scroll-y pc-scroll-dark min-h-0 flex-1 px-3 py-6"
            onClickCapture={cerrarSiEsAqui}
          >
            <SidebarNavGroups groups={adminNavGroups(badges, { usuarios: verUsuarios })} />
          </nav>

          {/* Lo que en escritorio vive en la cabecera y en un teléfono no cabe. */}
          <div className="shrink-0 border-t border-white/10 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <p className="px-3 text-label font-semibold text-white">{fullName}</p>
            <p className="px-3 text-caption text-text-on-primary-muted">{operatorName}</p>

            <div className="mt-3 flex flex-col gap-1" onClickCapture={cerrarSiEsAqui}>
              <Link href="/admin/perfil" className={drawerAction}>
                <UserRound className="size-[18px]" aria-hidden="true" />
                Perfil
              </Link>

              <form action={cerrarSesionAdmin}>
                <button type="submit" className={cn(drawerAction, "w-full")}>
                  <LogOut className="size-[18px]" aria-hidden="true" />
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const bottomItem = cn(
  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-control py-2",
  "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
  "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-gold",
);

/**
 * 10px y sin recortar. Con cinco destinos, a 375px cada uno disponía de unos
 * 70px y, con el tamaño de texto normal, "Aprobaciones" se cortaba a mitad de
 * palabra, y una etiqueta recortada es peor que una pequeña — deja de decir a
 * dónde lleva. Es el mismo tamaño que usan las barras de pestañas del sistema.
 */
const bottomLabel = "text-[0.625rem] leading-tight";

const drawerAction = cn(
  "inline-flex h-control items-center gap-3 rounded-control px-3",
  "text-label font-medium text-text-on-primary-muted",
  "transition-colors duration-(--duration-fast) ease-(--ease-standard)",
  "hover:bg-white/[0.08] hover:text-white",
  "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-gold",
);

/**
 * El destino actual se marca igual que en la barra lateral —dorado y
 * `aria-current`—, nunca solo con color (§20).
 */
function BottomBarLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}): React.JSX.Element {
  const { icon: Icon } = item;
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href as Route}
      aria-current={active ? "page" : undefined}
      className={cn(bottomItem, active ? "text-gold" : "text-text-on-primary-muted")}
    >
      <span className="relative">
        <Icon className="size-[22px]" aria-hidden="true" />
        {typeof item.badge === "number" && item.badge > 0 ? (
          <span className="pc-numeric absolute -right-2.5 -top-1.5 rounded-pill bg-accent px-1.5 text-caption font-semibold text-navy">
            {item.badge}
          </span>
        ) : null}
      </span>
      <span className={bottomLabel}>{item.label}</span>
    </Link>
  );
}
