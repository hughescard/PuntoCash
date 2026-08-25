import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * PuntoCash application shell — manual §10 "Estructura global de las aplicaciones".
 *
 *   Header        72px. Marca PuntoCash a la izquierda.
 *   Sidebar       240px de navegación.
 *   Área principal Fondo blanco o gris muy claro; padding desktop de 32px.
 *   Resolución    1440x900 de referencia, 1280px de ancho mínimo objetivo.
 *
 * This is the neutral foundation shared by Worker, Kiosk, Admin and Super Admin.
 * Each product supplies its own header content and navigation; nothing here is
 * specific to one of them.
 */

export function AppShell({
  header,
  sidebar,
  children,
  className,
}: {
  header: React.ReactNode;
  /** Omit for products without lateral navigation, such as the Kiosk. */
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    /*
     * The shell is exactly one viewport tall and clips its own overflow, so the
     * only thing that scrolls is the main area. `min-h-screen` here previously
     * let the container grow with the page: the document became the scroller
     * and carried the header and sidebar with it.
     *
     * `min-h-0` on the row is required — without it a flex child refuses to
     * shrink below its content height and the overflow escapes again.
     */
    <div className={cn("flex h-dvh min-w-min-desktop flex-col overflow-hidden bg-canvas", className)}>
      {header}

      <div className="flex min-h-0 flex-1">
        {sidebar}
        {children}
      </div>
    </div>
  );
}

/**
 * Fixed-height global header. Brand sits at the left; `actions` holds the
 * product-specific right-hand cluster (worker, caja, perfil, cerrar sesión).
 */
export function AppHeader({
  brand,
  actions,
  className,
}: {
  brand: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <header
      className={cn(
        // No `sticky` needed: the header sits outside the scroll container.
        "z-30 flex h-header shrink-0 items-center justify-between gap-6",
        "bg-primary px-6 text-primary-foreground shadow-header",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-4">{brand}</div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </header>
  );
}

/** 240px navy navigation column. `footer` holds Ayuda/Perfil at the bottom (§10). */
export function AppSidebar({
  children,
  footer,
  className,
  label = "Navegación principal",
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  label?: string;
}): React.JSX.Element {
  return (
    <nav
      aria-label={label}
      className={cn(
        // Fixed column: it never scrolls with the content beside it. Only the
        // nav list itself scrolls, and only if the items outgrow the viewport.
        "flex h-full w-sidebar min-h-0 shrink-0 flex-col justify-between",
        "bg-primary text-primary-foreground",
        className,
      )}
    >
      <div className="pc-scroll-y min-h-0 flex-1 px-3 py-6">{children}</div>
      {footer ? <div className="border-t border-white/10 px-3 py-4">{footer}</div> : null}
    </nav>
  );
}

/** Main working area — light surface, 32px desktop padding (§10). */
export function AppMain({
  children,
  className,
  /** Constrains operational forms to ~1200px so fields are not over-stretched (§10). */
  constrained = false,
}: {
  children: React.ReactNode;
  className?: string;
  constrained?: boolean;
}): React.JSX.Element {
  return (
    /* The one scroll container in the shell. `min-h-0` lets it shrink to the
       row's height so `overflow-y-auto` actually engages. */
    <main className={cn("pc-scroll-y min-h-0 min-w-0 flex-1 bg-canvas p-8", className)}>
      <div className={cn(constrained && "max-w-form-max")}>{children}</div>
    </main>
  );
}

/**
 * Screen heading — "Título de pantalla" 28px/700 (§12), with room for the one
 * primary action allowed per context (§9 "Jerarquía").
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn("mb-8 flex items-start justify-between gap-6", className)}>
      <div className="min-w-0">
        <h1 className="text-screen-title text-text-primary">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-body text-text-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  );
}

/** Section grouping inside a screen — "Título de sección" 20px/600 (§12). */
export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <section className={cn("mb-12 last:mb-0", className)}>
      {title ? (
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-section-title text-text-primary">{title}</h2>
            {description ? (
              <p className="mt-1 text-body-sm text-text-secondary">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
