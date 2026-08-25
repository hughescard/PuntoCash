"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Sidebar navigation items — manual §10 / §17.
 *
 * The active item is marked by a gold rail plus a lighter surface: colour alone
 * never carries the state (§20), and gold stays a controlled accent (§3).
 */

export interface NavItem {
  /**
   * A statically-checked app route (Next.js `typedRoutes`), or an in-page
   * anchor for single-page navigation such as `/design-system`.
   */
  href: Route | `#${string}`;
  label: string;
  icon: LucideIcon;
  /** Count shown at the right of the item, e.g. pending operations. */
  badge?: number;
}

export function SidebarNav({
  items,
  className,
}: {
  items: readonly NavItem[];
  className?: string;
}): React.JSX.Element {
  const pathname = usePathname();

  return (
    <ul className={cn("flex flex-col gap-1", className)}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <SidebarNavLink item={item} active={active} />
          </li>
        );
      })}
    </ul>
  );
}

export function SidebarNavLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}): React.JSX.Element {
  const { icon: Icon } = item;

  return (
    <Link
      // `Link` is typed to app routes only; anchors are valid at runtime and
      // are narrowed out of the union by this cast.
      href={item.href as Route}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-control items-center gap-3 rounded-control px-3",
        "text-label transition-colors duration-(--duration-fast) ease-(--ease-standard)",
        "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-gold",
        // Gold marks the current selection (§3 "Dorado: selección"), paired
        // with the rail and aria-current so it never rests on colour alone.
        active
          ? "bg-white/10 font-semibold text-gold"
          : "text-text-on-primary-muted hover:bg-white/[0.06] hover:text-white",
      )}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-pill bg-accent"
        />
      ) : null}

      <Icon
        className={cn("size-[18px] shrink-0", active ? "text-accent" : "text-current")}
        aria-hidden="true"
      />
      <span className="truncate">{item.label}</span>

      {typeof item.badge === "number" && item.badge > 0 ? (
        <span className="pc-numeric ml-auto rounded-pill bg-white/15 px-2 py-0.5 text-caption font-medium text-white">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}
